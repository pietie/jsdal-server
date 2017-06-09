if (not exists (select top 1 1 from sys.schemas where name = 'orm'))  EXEC ('CREATE SCHEMA orm')

if (not exists (select top 1 1 from sys.tables where name ='SprocDalMonitor' and SCHEMA_NAME(schema_id) = 'orm')) 
BEGIN
	CREATE TABLE [orm].[SprocDalMonitor](
		[Id] [int] IDENTITY(1,1) NOT NULL,
		[CreateDateUtc] [datetime] NOT NULL,
		[LastUpdateDateUtc] [datetime] NULL,
		[CatalogName] [varchar](500) NOT NULL,
		[SchemaName] [varchar](500) NOT NULL,
		[RoutineName] [varchar](500) NOT NULL,
		[RoutineType] [varchar](20) NOT NULL,
		[ReturnType] [varchar](20) NULL,
		[rowver] [timestamp] NOT NULL,
		[IsDeleted] [bit] NOT NULL,
		[LastUpdateByHostName] [varchar](100) NULL,
		[ParametersXml] [varchar](max) NULL,
		[ParameterCount] [int] NULL,
		[JsonMetadata] [varchar](max) NULL,
	 CONSTRAINT [PK_SprocDalMonitor] PRIMARY KEY CLUSTERED 
	(
		[Id] ASC
	)WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS  = ON, ALLOW_PAGE_LOCKS  = ON, FILLFACTOR = 90) ON [PRIMARY]
	) ON [PRIMARY]


	ALTER TABLE [orm].[SprocDalMonitor] ADD  CONSTRAINT [DF_SprocDalMonitor_CreateDateUtc]  DEFAULT (getutcdate()) FOR [CreateDateUtc]
	ALTER TABLE [orm].[SprocDalMonitor] ADD  CONSTRAINT [DF_SprocDalMonitor_IsDeleted]  DEFAULT ((0)) FOR [IsDeleted]
	CREATE NONCLUSTERED INDEX [IX_SprocDalMonitor_Rowver] ON [orm].[SprocDalMonitor] ([rowver] ASC)
	CREATE NONCLUSTERED INDEX [IX_SprocDalMonitor_CatSchName] ON [orm].[SprocDalMonitor] ([CatalogName] ASC, [SchemaName] ASC, [RoutineName] ASC) 
END



if (not exists (select top 1 1 from sys.procedures where name ='SprocGenGetParameterList' and SCHEMA_NAME(schema_Id) = 'orm'))
BEGIN
	EXEC('
	CREATE procedure [orm].[SprocGenGetParameterList]
	(
		@routineName varchar(500)
		,@schemaName varchar(500)
	)
	as
	begin

		select r.SPECIFIC_CATALOG [Catalog]
				,r.SPECIFIC_SCHEMA [Schema]
				,r.SPECIFIC_NAME RoutineName
				,parms.PARAMETER_MODE ParameterMode
				,parms.IS_RESULT IsResult
				,parms.PARAMETER_NAME ParameterName
				,parms.DATA_TYPE DataType
				,parms.CHARACTER_OCTET_LENGTH Length
			from INFORMATION_SCHEMA.ROUTINES r
				 inner join INFORMATION_SCHEMA.PARAMETERS parms on parms.SPECIFIC_NAME = r.SPECIFIC_NAME
																	and parms.SPECIFIC_CATALOG = r.SPECIFIC_CATALOG
																	and parms.SPECIFIC_SCHEMA = r.SPECIFIC_SCHEMA
		where r.SPECIFIC_NAME = @routineName
		  and r.SPECIFIC_SCHEMA = @schemaName
		--order by parms.ORDINAL_POSITION
	end')
END


if (not exists (select top 1 1 from sys.procedures where name ='SprocGenExtractAndStoreJsonMetadata' and SCHEMA_NAME(schema_Id) = 'orm'))
BEGIN
	EXEC(
	'create proc [orm].[SprocGenExtractAndStoreJsonMetadata]
(
	@catalog varchar(500)
	,@schema varchar(500)
	,@routine varchar(500)
	
)
as
begin

	/*
		1. Extract all multi and single line comments
		2. Within each comment, extract what looks like json fragments
		3. Within each of those fragments look for the first one that looks like a valid jsDAL metadata definition.
	*/
	SET NOCOUNT ON;
 
	DECLARE @routineSource varchar(max)

	select @routineSource = object_definition(object_id(QUOTENAME(@catalog) + ''.'' + QUOTENAME(@schema) + ''.'' + QUOTENAME(@routine)))



	DECLARE @commentLookup TABLE (ID INT IDENTITY(1,1), StartIx INT, EndIx INT)


	declare @i int = 1
			,@ch char(1)
			,@nextCh char(1)

			,@inMultiLineComment bit = 0
			,@inSingleLineComment bit = 0

			,@curCommentLookupId INT
			,@commentEndIx INT
			,@foundEndOfComment bit = 0

	while (@i < len(@routineSource) + 1)
	begin
		set @ch = substring(@routineSource,@i,1)
		set @nextCh = substring(@routineSource,@i+1,1)

		if (@inMultiLineComment = 0 AND @inSingleLineComment = 0)
		begin
			if (@ch = ''/'' and @nextCh = ''*'')
			begin
				set @inMultiLineComment = 1
				set @commentEndIx = null

				insert into @commentLookup (StartIx) values (@i)
				select @curCommentLookupId = SCOPE_IDENTITY()

				set @i += 1
			end
			else if (@ch = ''-'' and @nextCh = ''-'')
			begin
				set @inSingleLineComment = 1
				set @commentEndIx = null

				insert into @commentLookup (StartIx) values (@i)
				select @curCommentLookupId = SCOPE_IDENTITY()

				set @i += 1
			end
		end
		else if (@inMultiLineComment = 1 and @inSingleLineComment = 0)
		begin

			if ((@ch = ''*'' and @nextCh = ''/'') OR (@i = len(@routineSource)/*auto close multiline comment if this is the last character*/))
			begin
				set @foundEndOfComment = 1;
				set @i += 1;
				set @commentEndIx = @i + 1;
			end
		end
		else if (@inMultiLineComment = 0 AND @inSingleLineComment = 1 AND @ch = char(10)) -- single line comments end at a newline
		begin
			set @foundEndOfComment = 1;
			set @commentEndIx = @i;
		end

		if (@foundEndOfComment = 1)
		begin
			set @inSingleLineComment = 0
			set @inMultiLineComment = 0

			update @commentLookup
				set EndIx = @commentEndIx
			where id= @curCommentLookupId

			set @curCommentLookupId = null

			
			set @foundEndOfComment = 0
		end


		set @i += 1;
	end

	DECLARE @comment varchar(max)
			,@isObjectOpen bit = 0
			,@curOpenCnt int = 0
			,@curFragmentId INT

	DECLARE @jsonFragments TABLE(ID INT IDENTITY(1,1), StartIx INT, EndIx INT, Fragment varchar(max))

	DECLARE cur CURSOR LOCAL FOR
		select SUBSTRING(@routineSource, StartIx, EndIx-StartIx+1)  from @commentLookup
 
	OPEN cur
	FETCH NEXT FROM cur INTO @comment
	WHILE @@FETCH_STATUS = 0
	BEGIN
		set @i = 0
		set @curFragmentId = null
		set @isObjectOpen = 0
		set @curOpenCnt = 0


		while (@i < len(@comment) + 1)
		begin
			set @ch = substring(@comment,@i,1)

			if (@ch = ''{'')
			begin

				if (@isObjectOpen = 0)
				begin
					set @isObjectOpen = 1
					set @curOpenCnt = 1;

					insert into @jsonFragments (StartIx) values (@i)
					select @curFragmentId = SCOPE_IDENTITY()
				end
				else
				begin
					set @curOpenCnt += 1;
				end
			end
			else if (@ch = ''}'' or @i = len(@comment))
			begin
				if (@isObjectOpen = 1)
				begin

					set @curOpenCnt -= 1;
					
					if (@curOpenCnt <= 0)
                    begin

                        set @isObjectOpen = 0; 
                        
						update @jsonFragments 
							set EndIx = @i,
								Fragment = SUBSTRING(@comment, StartIx, @i-StartIx+1)
						where id = @curFragmentId
						
						set @curFragmentId = null
                    end
				
				end				
			end


			set @i += 1;
		end
		
	FETCH NEXT FROM cur INTO @comment
	END
	CLOSE cur
	DEALLOCATE cur

	DECLARE @jsonMetadata varchar(max)
	-- grab the first fragment that *looks* like jsDAL metadata
	select top 1 @jsonMetadata = Fragment from @jsonFragments where Fragment like ''%jsDAL%:%{%''

	update orm.SprocDalMonitor
		set JsonMetadata = @jsonMetadata
	where CatalogName = @catalog and SchemaName = @schema and RoutineName = @routine

end')
END


if (not exists (select top 1 1 from sys.procedures where name ='SprocGenInitialise' and SCHEMA_NAME(schema_Id) = 'orm'))
BEGIN
	EXEC('
	CREATE PROCEDURE [orm].[SprocGenInitialise]
AS
begin

	-- INSERT NEW ROUTINES
	INSERT INTO orm.SprocDalMonitor (CatalogName, SchemaName, RoutineName, RoutineType,ReturnType, IsDeleted, LastUpdateByHostName, ParametersXml, ParameterCount)
	select r.SPECIFIC_CATALOG [Catalog]
			,r.SPECIFIC_SCHEMA [Schema]
			,r.SPECIFIC_NAME RoutineName
			,r.ROUTINE_TYPE RoutineType
			,r.DATA_TYPE ReturnType
			,0
			,HOST_NAME()
			,(
				select routine.SPECIFIC_CATALOG [Catalog]
						,routine.SPECIFIC_SCHEMA [Schema]
						,routine.SPECIFIC_NAME RoutineName
						,Parameter.PARAMETER_MODE ParameterMode
						,Parameter.IS_RESULT IsResult
						,Parameter.PARAMETER_NAME ParameterName
						,Parameter.DATA_TYPE DataType
						,Parameter.CHARACTER_OCTET_LENGTH Length
					from INFORMATION_SCHEMA.ROUTINES Routine
							inner join INFORMATION_SCHEMA.PARAMETERS Parameter on Parameter.SPECIFIC_NAME = routine.SPECIFIC_NAME
																			and Parameter.SPECIFIC_CATALOG = routine.SPECIFIC_CATALOG
																			and Parameter.SPECIFIC_SCHEMA = routine.SPECIFIC_SCHEMA
				where routine.SPECIFIC_NAME = r.SPECIFIC_NAME
					and routine.SPECIFIC_CATALOG = r.SPECIFIC_CATALOG
					and routine.SPECIFIC_SCHEMA = r.SPECIFIC_SCHEMA
				for xml auto, elements
			) ParametersXml
			,(
			select count(1)
					from INFORMATION_SCHEMA.ROUTINES Routine
							inner join INFORMATION_SCHEMA.PARAMETERS Parameter on Parameter.SPECIFIC_NAME = routine.SPECIFIC_NAME
																			and Parameter.SPECIFIC_CATALOG = routine.SPECIFIC_CATALOG
																			and Parameter.SPECIFIC_SCHEMA = routine.SPECIFIC_SCHEMA
				where routine.SPECIFIC_NAME = r.SPECIFIC_NAME
					and routine.SPECIFIC_CATALOG = r.SPECIFIC_CATALOG
					and routine.SPECIFIC_SCHEMA = r.SPECIFIC_SCHEMA
			) ParameterCount
		from INFORMATION_SCHEMA.ROUTINES r with (nolock)
		where not exists (select 1 from orm.SprocDalMonitor dst with(nolock) where dst.RoutineName = r.SPECIFIC_NAME and dst.SchemaName = r.SPECIFIC_SCHEMA and dst.CatalogName = r.SPECIFIC_CATALOG)


	-- UPDATE
		update 	dst
			Set LastUpdateDateUtc = getutcdate()
					,LastUpdateByHostName = HOST_NAME()
					,RoutineType = src.RoutineType
					,ReturnType = src.ReturnType
					,IsDeleted = 0
					,ParametersXml = src.ParametersXml
					,ParameterCount = src.ParameterCount
		from orm.SprocDalMonitor dst
				inner join (select r.SPECIFIC_CATALOG 
							,r.SPECIFIC_SCHEMA 
							,r.SPECIFIC_NAME
							,r.ROUTINE_TYPE RoutineType
							,r.DATA_TYPE ReturnType
							,(
								select routine.SPECIFIC_CATALOG 
										,routine.SPECIFIC_SCHEMA 
										,routine.SPECIFIC_NAME
										,Parameter.PARAMETER_MODE ParameterMode
										,Parameter.IS_RESULT IsResult
										,Parameter.PARAMETER_NAME ParameterName
										,Parameter.DATA_TYPE DataType
										,Parameter.CHARACTER_OCTET_LENGTH Length
									from INFORMATION_SCHEMA.ROUTINES Routine
											inner join INFORMATION_SCHEMA.PARAMETERS Parameter on Parameter.SPECIFIC_NAME = routine.SPECIFIC_NAME
																							and Parameter.SPECIFIC_CATALOG = routine.SPECIFIC_CATALOG
																							and Parameter.SPECIFIC_SCHEMA = routine.SPECIFIC_SCHEMA
								where routine.SPECIFIC_NAME = r.SPECIFIC_NAME
									and routine.SPECIFIC_CATALOG = r.SPECIFIC_CATALOG
									and routine.SPECIFIC_SCHEMA = r.SPECIFIC_SCHEMA
								for xml auto, elements
							) ParametersXml
							,(select count(1)
									from INFORMATION_SCHEMA.ROUTINES Routine
											inner join INFORMATION_SCHEMA.PARAMETERS Parameter on Parameter.SPECIFIC_NAME = routine.SPECIFIC_NAME
																							and Parameter.SPECIFIC_CATALOG = routine.SPECIFIC_CATALOG
																							and Parameter.SPECIFIC_SCHEMA = routine.SPECIFIC_SCHEMA
								where routine.SPECIFIC_NAME = r.SPECIFIC_NAME
									and routine.SPECIFIC_CATALOG = r.SPECIFIC_CATALOG
									and routine.SPECIFIC_SCHEMA = r.SPECIFIC_SCHEMA
							) ParameterCount
						from INFORMATION_SCHEMA.ROUTINES r) src on  dst.RoutineName = src.SPECIFIC_NAME and dst.SchemaName = src.SPECIFIC_SCHEMA and dst.CatalogName = src.SPECIFIC_CATALOG


	
	DECLARE @catalog varchar(500)
			,@schema varchar(500)
			,@routine varchar(500)

	DECLARE curInit CURSOR LOCAL FOR
		select CatalogName, SchemaName, RoutineName from orm.SprocDalMonitor where JsonMetadata is null
 
	OPEN curInit
	FETCH NEXT FROM curInit INTO @catalog, @schema, @routine
	WHILE @@FETCH_STATUS = 0
	BEGIN
		 exec [orm].[SprocGenExtractAndStoreJsonMetadata] @catalog = @catalog, @schema = @schema, @routine = @routine
	FETCH NEXT FROM curInit INTO @catalog, @schema, @routine
	END
	CLOSE curInit
	DEALLOCATE curInit


			
end
')
END

if (not exists (select top 1 1 from sys.procedures where name ='SprocGenGetRoutineList' and SCHEMA_NAME(schema_Id) = 'orm'))
BEGIN
	EXEC('
	CREATE procedure [orm].[SprocGenGetRoutineList]
	(
		@maxRowver		bigint = 0
	)
	as
	begin

		select mon.Id
				,mon.CatalogName
				,mon.SchemaName
				,mon.RoutineName
				,case 
					when UPPER(mon.RoutineType) = ''FUNCTION'' AND UPPER(mon.ReturnType) = ''TABLE'' then ''TVF''
					else mon.RoutineType 
			 	end  RoutineType
				,cast(mon.rowver as bigint) rowver
				,mon.IsDeleted
				,mon.ParametersXml
				,mon.ParameterCount	
				,object_id(QUOTENAME(mon.CatalogName) + ''.'' + QUOTENAME(mon.SchemaName) + ''.'' + QUOTENAME(mon.RoutineName)) ObjectId
				,mon.JsonMetadata
			from orm.[SprocDalMonitor] mon with (nolock)
		where mon.rowver > @maxRowver
		order by rowver
	end')
END

if (not exists (select top 1 1 from sys.procedures where name ='SprocGenGetRoutineListCnt' and SCHEMA_NAME(schema_Id) = 'orm'))
BEGIN
	EXEC('
	CREATE procedure [orm].[SprocGenGetRoutineListCnt]
	(
		@maxRowver		bigint = 0
	)
	as
	begin

		select count(1) CNT
			from orm.[SprocDalMonitor] mon with (nolock)
		where mon.rowver > @maxRowver

	end')
END


if (not exists (select top 1 1 from sys.triggers where name = 'SprocDalMonitor' and parent_class_desc = 'DATABASE')) 
BEGIN

	DECLARE @trig nvarchar(max) 
	
	set @trig ='

	CREATE TRIGGER [SprocDalMonitor] ON DATABASE 
		FOR CREATE_PROCEDURE, ALTER_PROCEDURE, CREATE_FUNCTION, ALTER_FUNCTION, DROP_PROCEDURE, DROP_FUNCTION,  ALTER_SCHEMA, RENAME
	AS 
	BEGIN
		SET NOCOUNT ON
	
		DECLARE @eventType NVARCHAR(MAX)
				,@dbName NVARCHAR(MAX)
				,@schema NVARCHAR(MAX)
				,@objectName NVARCHAR(MAX)
				,@objectType NVARCHAR(MAX)
	
		SELECT @eventType = EVENTDATA().value(''(/EVENT_INSTANCE/EventType)[1]'',''nvarchar(max)'')
				,@dbName = EVENTDATA().value(''(/EVENT_INSTANCE/DatabaseName)[1]'',''nvarchar(max)'')
				,@schema = EVENTDATA().value(''(/EVENT_INSTANCE/SchemaName)[1]'',''nvarchar(max)'')
				,@objectName = EVENTDATA().value(''(/EVENT_INSTANCE/ObjectName)[1]'',''nvarchar(max)'')
				,@objectType = EVENTDATA().value(''(/EVENT_INSTANCE/ObjectType)[1]'',''nvarchar(max)'')

		if (@eventType = ''RENAME'')
		begin
			set @objectName = EVENTDATA().value(''(/EVENT_INSTANCE/NewObjectName)[1]'',''nvarchar(max)'')
		end
	 
		DECLARE @existingId INT
				,@isDeleted BIT 
			
		set @isDeleted = case LEFT(@eventType,5) when ''DROP_'' then 1 else 0 end

		-- look for an existing Monitor entry
		select @existingId = m.Id 
			from orm.[SprocDalMonitor] m (nolock)
		where m.CatalogName = @dbName
		  and m.SchemaName = @schema
		  and m.RoutineName = @objectName
	 
		DECLARE @parameterXml varchar(max)
			,@parameterCount int
	
		set @parameterXml = (select routine.SPECIFIC_CATALOG [Catalog]
									,routine.SPECIFIC_SCHEMA [Schema]
									,routine.SPECIFIC_NAME RoutineName
									,Parameter.PARAMETER_MODE ParameterMode
									,Parameter.IS_RESULT IsResult
									,Parameter.PARAMETER_NAME ParameterName
									,Parameter.DATA_TYPE DataType
									,Parameter.CHARACTER_OCTET_LENGTH Length
								from INFORMATION_SCHEMA.ROUTINES Routine
									 inner join INFORMATION_SCHEMA.PARAMETERS Parameter on Parameter.SPECIFIC_NAME = routine.SPECIFIC_NAME
																						and Parameter.SPECIFIC_CATALOG = routine.SPECIFIC_CATALOG
																						and Parameter.SPECIFIC_SCHEMA = routine.SPECIFIC_SCHEMA
							where routine.SPECIFIC_NAME = @objectName
							  and routine.SPECIFIC_CATALOG = @dbName
							  and routine.SPECIFIC_SCHEMA = @schema
							for xml auto, elements)
						

		select @parameterCount = COUNT(1)
								from INFORMATION_SCHEMA.ROUTINES Routine
									 inner join INFORMATION_SCHEMA.PARAMETERS Parameter on Parameter.SPECIFIC_NAME = routine.SPECIFIC_NAME
																						and Parameter.SPECIFIC_CATALOG = routine.SPECIFIC_CATALOG
																						and Parameter.SPECIFIC_SCHEMA = routine.SPECIFIC_SCHEMA
							where routine.SPECIFIC_NAME = @objectName
							  and routine.SPECIFIC_CATALOG = @dbName
							  and routine.SPECIFIC_SCHEMA = @schema
	
		if (@existingId is null)
		begin
	
			INSERT INTO orm.[SprocDalMonitor] (CatalogName, schemaname, routinename, RoutineType,ReturnType, IsDeleted, LastUpdateByHostName, ParametersXml, ParameterCount)
			SELECT SPECIFIC_CATALOG, SPECIFIC_SCHEMA, SPECIFIC_NAME, ROUTINE_TYPE, DATA_TYPE, @isDeleted, HOST_NAME(), @parameterXml, @parameterCount
			FROM INFORMATION_SCHEMA.ROUTINES r
			WHERE r.SPECIFIC_CATALOG = @dbName
			  AND r.SPECIFIC_SCHEMA = @schema
			  AND r.SPECIFIC_NAME = @objectName
	
		end
		else
		begin
	
			update orm.[SprocDalMonitor]
				set  LastUpdateDateUtc = getutcdate()
					,LastUpdateByHostName = HOST_NAME()
					,RoutineType = @objectType
					,ReturnType = IsNull(r.DATA_TYPE, ReturnType)
					,IsDeleted = @isDeleted
					,ParametersXml = @parameterXml
					,ParameterCount = @parameterCount
			from orm.[SprocDalMonitor] m (nolock)
				left join INFORMATION_SCHEMA.ROUTINES r on r.SPECIFIC_CATALOG = @dbName
										AND r.SPECIFIC_SCHEMA = @schema
										AND r.SPECIFIC_NAME = @objectName
			where m.ID = @existingId
		
		end

		-- handle schema transfers
		--if (@eventType = ''ALTER_SCHEMA'')
		begin
			-- ''delete'' any entries that no longer exist
			update s
				set s.IsDeleted = 1
			from orm.SprocDalMonitor s 
				left join INFORMATION_SCHEMA.ROUTINES r on r.SPECIFIC_SCHEMA = s.SchemaName and r.SPECIFIC_NAME = s.RoutineName
			where r.SPECIFIC_NAME is null
			  and s.IsDeleted = 0
		end

		exec [orm].[SprocGenExtractAndStoreJsonMetadata] @catalog = @dbName, @schema = @schema, @routine = @objectName
	
	END

	';
	exec sp_executesql @trig

END

if (not exists (select top 1 1 from sys.procedures where name ='Uninstall' and SCHEMA_NAME(schema_Id) = 'orm'))
begin
	EXEC('
	create proc orm.Uninstall
	as
	begin
	
		if (exists (select top 1 1 from sys.triggers where name = ''SprocDalMonitor'' and parent_class_desc = ''DATABASE'')) drop trigger SprocDalMonitor on database
	
		if (exists (select top 1 1 from sys.procedures where name =''SprocGenExtractAndStoreJsonMetadata'' and SCHEMA_NAME(schema_Id) = ''orm'')) drop proc orm.SprocGenExtractAndStoreJsonMetadata
		
		if (exists (select top 1 1 from sys.procedures where name =''SprocGenGetParameterList'' and SCHEMA_NAME(schema_Id) = ''orm'')) drop proc orm.SprocGenGetParameterList
		if (exists (select top 1 1 from sys.procedures where name =''SprocGenInitialise'' and SCHEMA_NAME(schema_Id) = ''orm'')) drop proc orm.SprocGenInitialise
		if (exists (select top 1 1 from sys.procedures where name =''SprocGenGetRoutineList'' and SCHEMA_NAME(schema_Id) = ''orm'')) drop proc orm.SprocGenGetRoutineList
		if (exists (select top 1 1 from sys.procedures where name =''SprocGenGetRoutineListCnt'' and SCHEMA_NAME(schema_Id) = ''orm'')) drop proc orm.SprocGenGetRoutineListCnt

		if (exists (select top 1 1 from sys.tables where name =''SprocDalMonitorAdditional'' and SCHEMA_NAME(schema_id) = ''orm'')) drop table orm.SprocDalMonitorAdditional

		if (exists (select 1 from sys.indexes where name = ''IX_SprocDalMonitor_Rowver'' and OBJECT_NAME(object_id) = ''SprocDalMonitor'')) DROP INDEX [IX_SprocDalMonitor_Rowver] ON [orm].[SprocDalMonitor]
		if (exists (select 1 from sys.indexes where name = ''IX_SprocDalMonitor_CatSchName'' and OBJECT_NAME(object_id) = ''SprocDalMonitor'')) DROP INDEX [IX_SprocDalMonitor_CatSchName] ON [orm].[SprocDalMonitor]

		if (exists (select top 1 1 from sys.tables where name =''SprocDalMonitor'' and SCHEMA_NAME(schema_id) = ''orm'')) drop table orm.SprocDalMonitor
	

		drop proc orm.Uninstall
		if (exists (select top 1 1 from sys.schemas where name = ''orm'')) DROP SCHEMA orm
	end
	')
end

exec orm.SprocGenInitialise