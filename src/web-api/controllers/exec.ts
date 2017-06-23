import { ApiResponse, ApiResponseScalar, ApiResponseType } from './../api-response'
import { SettingsInstance } from './../../settings/settings-instance'
import { route } from './../decorators'

import { DatabaseSource } from './../../settings/object-model'
import { Request, Response } from "@types/express";

import * as sql from 'mssql';
import * as moment from 'moment';
import * as shortid from 'shortid';

import { SessionLog } from "./../../util/log";
import { jsDALServerVariables } from "./../jsdal-server-variables";
import { BlobStore } from "./../blob-store";

import * as multer from 'multer';
import { CachedRoutine } from "./../../settings/object-model/cache/cached-routine";

import * as request from 'request';
import { ExceptionLogger } from "./../../util/exception-logger";
import { ThreadUtil } from "./../../util/thread-util";
import { SqlConfigBuilder } from "./../../util/sql-config-builder";

// parse multipart/form-data
let memStorage = multer.memoryStorage();
let blobUploader = multer({ storage: memStorage, limits: { fileSize/*bytes*/: 1024 * 1024 * 10 } }).any(); // TODO: make max file size configurable

export class ExecController {



    @route("/api/blob", { get: false, post: true }, true)
    public static async prepareBlob(req: Request, res: Response): Promise<ApiResponse> {
        return new Promise<ApiResponse>((resolve, reject) => {

            try {
                blobUploader(req, res, (err) => {
                    if (err) {
                        res.status(500).send(err.toString());
                        return;
                    }

                    let keyList: string[] = [];

                    (<any>req.files).forEach(f => {
                        let id = shortid.generate();

                        BlobStore.add(id, f.buffer);
                        keyList.push(id);

                        // buffer:Uint8Array[1407] [0, 1, 245 …]
                        // encoding:"7bit"
                        // fieldname:"chrome.dll.sig"
                        // mimetype:"application/octet-stream"
                        // originalname:"chrome.dll.sig"

                    });

                    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
                    res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
                    res.setHeader("Content-Type", "application/json");

                    resolve(ApiResponse.Payload(keyList));
                });


            }
            catch (ex) {
                resolve(ApiResponse.Exception(ex));
            }

        });
    }


    @route("/api/execnq/:dbSourceGuid/:dbConnectionGuid/:schema/:routine", { get: true, post: true }, true)
    public static async execNonQuery(req: Request, res: Response): Promise<ApiResponse> {
        return ExecController.execQueryAndNonQuery(req, res, true);
    }

    @route("/api/exec/:dbSourceGuid/:dbConnectionGuid/:schema/:routine", { get: true, post: true }, true)
    public static async execQuery(req: Request, res: Response): Promise<ApiResponse> {
        return ExecController.execQueryAndNonQuery(req, res, false);
    }

    public static async execQueryAndNonQuery(req: Request, res: Response, isNonQuery: boolean): Promise<ApiResponse> {
        return new Promise<ApiResponse>(async (resolve, reject) => {

            let debugInfo: string = "";
            try {
                let isPOST = req.method === "POST";

                let dbSourceGuid: string = req.params.dbSourceGuid;
                let dbConnectionGuid: string = req.params.dbConnectionGuid;
                let schema: string = req.params.schema;
                let routine: string = req.params.routine;

                debugInfo += `[${schema}].[${routine}]`;

                let dbSources = SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources);
                let dbSourcesFlat = [].concat.apply([], dbSources); // flatten the array of arrays

                let dbSource: DatabaseSource = dbSourcesFlat.find(dbs => dbs.CacheKey === dbSourceGuid);

                if (dbSource == null) throw `The specified DB source '${dbSourceGuid}' was not found.`;

                // make sure the source domain/IP is allowed access
                let mayAccess = dbSource.mayAccessDbSource(req);

                if (!mayAccess.success) {
                    res.status(403).send(mayAccess.userErrorMsg);
                    return undefined;
                }

                let execResult: any = await ExecController.execRoutineQuery(req, res,
                    schema,
                    routine,
                    dbSource,
                    dbConnectionGuid,
                    isPOST ? req.body : req.query
                );
                // .catch(e => {
                //     resolve(ApiResponse.Exception(e));
                //     return;
                // });

                if (execResult == undefined) return;

                let retVal: any = {};

                retVal.OutputParms = execResult.outputParms;

                if (!isNonQuery) {
                    let dataContainers = ExecController.toJsonDataset(execResult.results);
                    let keys = Object.keys(dataContainers);

                    for (let i = 0; i < keys.length; i++) {
                        retVal[keys[i]] = dataContainers[keys[i]];
                    }

                    retVal.HasResultSets = keys.length > 0;
                    retVal.ResultSetKeys = keys;
                }

                let ret = ApiResponse.Payload(retVal);

                // TODO: Consider making this a plugin
                if (execResult.outputParms != null && Object.keys(execResult.outputParms).length > 0) {
                    let possibleUEParmNames = ["usererrormsg", "usrerrmsg", "usererrormessage", "usererror", "usererrmsg"];

                    var ueKey = Object.keys(execResult.outputParms).find(k => possibleUEParmNames.indexOf(k.toLowerCase()) >= 0);

                    // if a user error msg is defined.
                    if (ueKey && ueKey.trim() != "" && execResult.outputParms[ueKey] != null && execResult.outputParms[ueKey].trim() != "") {
                        ret.Message = execResult.outputParms[ueKey];
                        ret.Title = "Action failed";
                        ret.Type = ApiResponseType.ExclamationModal;
                    }
                }


                res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
                res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
                res.setHeader("Content-Type", "application/json");

                resolve(ret);

            }
            catch (ex) {
                resolve(ApiResponse.Exception(ex, debugInfo));
            }


        });
    }

    @route("/api/execScalar/:dbSourceGuid/:dbConnectionGuid/:schema/:routine", { get: true }, true)
    public static async Scalar(req: Request, res: Response): Promise<ApiResponse> {

        return new Promise<ApiResponse>(async (resolve, reject) => {

            try {
                let dbSourceGuid: string = req.params.dbSourceGuid;
                let dbConnectionGuid: string = req.params.dbConnectionGuid;
                let schema: string = req.params.schema;
                let routine: string = req.params.routine;

                let dbSources = SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources);
                let dbSourcesFlat = [].concat.apply([], dbSources); // flatten the array of arrays

                let dbSource: DatabaseSource = dbSourcesFlat.find(dbs => dbs.CacheKey === dbSourceGuid);

                if (dbSource == null) throw `The specified DB source '${dbSourceGuid}' was not found.`;

                // make sure the source domain/IP is allowed access
                let mayAccess = dbSource.mayAccessDbSource(req);
                if (!mayAccess.success) {
                    res.status(403).send(mayAccess.userErrorMsg);
                    return undefined;
                }

                let scalar = await ExecController.execRoutineScalar(req, schema, routine, dbSource, dbConnectionGuid, req.query);

                let ret;

                if (scalar instanceof Date) {
                    ret = ApiResponseScalar.PayloadScalar(scalar.getTime(), true);
                }
                else {
                    ret = ApiResponse.Payload(scalar);
                }

                res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
                res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
                res.setHeader("Content-Type", "application/json");

                resolve(ret);
            }
            catch (ex) {
                resolve(ApiResponse.Exception(ex));
            }
        });
    }

    private static toJsonDataset(results: sql.IResult<any>) {
        let ret = {};

        if (results && results.recordsets) {

            for (let i = 0; i < results.recordsets.length; i++) {
                let rs = results.recordsets[i];

                let fields = Object.keys(rs.columns).map(colName => { return { name: colName, type: (<any>rs.columns[colName].type).name } });
                let table = (<any>rs).toTable();

                ret["Table" + i] = {
                    Fields: fields,
                    Data: table.rows
                };
            }
        }

        return ret;
    }

    private static async processMetadata(req: Request, res: Response, cachedRoutine: CachedRoutine): Promise<{ success: boolean, userErrorMsg?: string }> {
        if (cachedRoutine.jsDALMetadata && cachedRoutine.jsDALMetadata.jsDAL) {
            if (cachedRoutine.jsDALMetadata.jsDAL.security) {
                if (cachedRoutine.jsDALMetadata.jsDAL.security.requiresCaptcha) {
                    if (!req.headers["captcha-val"]) {

                        await ThreadUtil.Sleep(1000 * 5); // TODO: Make this configurable? We intentionally slow down requests that do not conform 

                        throw new Error("captcha-val header not specified");
                    }

                    if (!SettingsInstance.Instance.Settings.GoogleRecaptchaSecret) {
                        throw new Error("The setting GoogleRecaptchaSecret is not configured on this jsDAL server.");
                    }

                    let capResp = await ExecController.validateGoogleRecaptcha(req.headers["captcha-val"]);

                    res.setHeader("captcha-ret", capResp.success ? "1" : "0");

                    if (capResp.success) return { success: true };
                    else return { success: false, userErrorMsg: "Captcha failed." }

                }
            }
        }

        return { success: true };
    }

    private static validateGoogleRecaptcha(captcha: string): Promise<{ success: boolean, "error-codes"?: string[] }> {

        return new Promise<{ success: boolean, "error-codes"?: string[] }>((resolve, reject) => {
            let postData = {
                secret: SettingsInstance.Instance.Settings.GoogleRecaptchaSecret,
                response: captcha

            };

            request.post('https://www.google.com/recaptcha/api/siteverify',
                {
                    headers: { 'content-type': 'application/json' },
                    form: postData
                }, (error: any, response: request.RequestResponse, body: any) => {
                    if (!error) {
                        try {
                            resolve(JSON.parse(body));
                        }
                        catch (e) {
                            ExceptionLogger.logException(e);
                            reject(e);
                        }
                    }
                    else {
                        reject(error);
                    }

                });
        });
    }

    private static async execRoutineQuery(req: Request, res: Response,
        schemaName: string,
        routineName: string,
        dbSource: DatabaseSource,
        dbConnectionGuid: string,
        queryString: object,
        commandTimeOutInSeconds: number = 60
    ): Promise<ExecutionResult> {
        return new Promise<ExecutionResult>(async (resolve, reject) => {
            try {

                let routineCache = dbSource.cache;

                let cachedRoutine = routineCache.find(r => r.equals(schemaName, routineName));

                if (routineName == "RegisterManually") {
                    console.log(` exec on dbSource ${dbSource.CacheKey}...${cachedRoutine.jsDALMetadata != null ? "YES" : "NO"}`);

                }

                if (cachedRoutine == null) {
                    throw new Error(`The routine [${schemaName}].[${routineName}] was not found.`);
                }


                let metaResp = await ExecController.processMetadata(req, res, cachedRoutine);

                if (!metaResp.success) {
                    res.send(ApiResponse.ExclamationModal(metaResp.userErrorMsg));
                    resolve(undefined);
                    return;
                }


                let dbConn = dbSource.getSqlConnection(dbConnectionGuid);

                let sqlConfig = SqlConfigBuilder.build(dbConn);

                let con: sql.ConnectionPool = <sql.ConnectionPool>await new sql.ConnectionPool(sqlConfig)
                    .connect()
                    .catch(err => {
                        console.log(".....rejecting with error:", err);
                        reject(err);
                        return;
                    });

                (<any>sql).on('error', err => {
                    console.log("*****************!!! ", err);
                })

                if (con == null) return;

                // PLUGINS
                await ExecController.processPlugins(dbSource, queryString, con);

                let cmd = new sql.Request(con);

                cmd.stream = false; // TODO: In future consider streaming for async calls

                let isTVF = cachedRoutine.Type == "TVF";

                if (cachedRoutine.Type == "PROCEDURE" || isTVF) {
                    if (cachedRoutine.Parameters != null) {
                        cachedRoutine.Parameters.forEach(p => {

                            let sqlType = ExecController.getSqlDbTypeFromParameterType(p.DataType);
                            let parmValue = null;

                            // trim leading '@'
                            let parmName = p.ParameterName.substr(1, 99999);

                            if (queryString[parmName]) {
                                let val = queryString[parmName];

                                // look for special jsDAL Server variables
                                val = jsDALServerVariables.parse(req, val);

                                if (val == null) {
                                    parmValue = null;
                                }
                                // TODO: Consider making this 'null' mapping configurable.This is just a nice to have for when the client does not call the API correctly
                                // convert the string value of 'null' to actual JavaScript null
                                else if (val === "null") {
                                    parmValue = null;
                                }
                                else {

                                    parmValue = ExecController.convertParameterValue(sqlType, val);



                                    // TODO: Workaround for issue for datetime conversions - see https://github.com/patriksimek/node-mssql/issues/377
                                    if (sqlType == sql.DateTime) sqlType = sql.NVarChar;
                                }
                            }
                            else {

                                //     if (p.HasDefault) // fall back to default parameter value if one exists
                                //     {
                                //         // If no explicit value was specified and the parameter has it's own default...
                                //         // Then DO NOT set newSqlParm.Value so that the DB Engine applies the default defined in SQL
                                //         newSqlParm.Value = null;
                                //     }
                                //     else {
                                //         newSqlParm.Value = DBNull.Value;
                                //     }
                            }

                            if (p.ParameterMode == "IN") {
                                cmd.input(parmName, sqlType, parmValue);
                            }
                            else {
                                cmd.output(parmName, sqlType);
                            }
                        }); // foreach Parameter 

                    }

                    //!var executionTrackingEndFunction = ExecTracker.Track(dbSource.Name, cachedRoutine.Schema, cachedRoutine.Routine);

                    //                     cmd.on("error", (a,b)=>
                    //                     {
                    // let aaa = a;
                    //                     });

                    let res: any;

                    if (isTVF) {
                        let parmCsvList = cachedRoutine.Parameters.filter(p => p.IsResult == null || p.IsResult.toUpperCase() != "YES").map(p => p.ParameterName);

                        res = await cmd.query(`select * from [${schemaName}].[${routineName}](${parmCsvList})`);
                    }
                    else {
                        res = await cmd.execute(`[${cachedRoutine.Schema}].[${cachedRoutine.Routine}]`);
                    }

                    /////////////////////
                    // $select
                    // ¯¯¯¯¯¯¯¯
                    // Allows the user to only return certain fields
                    // comma(,) splits fields and semi-colon(;) splits across table results
                    {
                        if (queryString["$select"] && res.recordsets.length > 0) {
                            let limitToFieldsCsv: string = queryString["$select"];

                            if (limitToFieldsCsv && limitToFieldsCsv.trim() != "") {
                                let listPerTable = limitToFieldsCsv.split(';');

                                for (let tableIx = 0; tableIx < listPerTable.length; tableIx++) {
                                    let fieldsToKeep = listPerTable[tableIx].split(',').map(s => s.trim());

                                    if (fieldsToKeep.length > 0) {
                                        let table = res.recordsets[tableIx];
                                        let columns = Object.keys(table.columns);

                                        for (let i = 0; i < columns.length; i++) {
                                            let match = fieldsToKeep.find(f => f.toLowerCase() == columns[i].toLowerCase());

                                            if (match == null) {
                                                delete res.recordsets[tableIx].columns[columns[i]];
                                            }
                                        }

                                    }

                                }


                            }

                        }
                    }


                    //!executionTrackingEndFunction();

                    con.close();

                    resolve({ results: res, outputParms: (<any>res).output });

                }
                else if (cachedRoutine.Type == "FUNCTION") {
                    throw "Use ExecScalar for UDF calls";
                }
            }
            catch (ex) {
                reject(ex);
            }

        });
    }

    private static async execRoutineScalar(request: Request,
        schemaName: string,
        routineName: string,
        dbSource: DatabaseSource,
        dbConnectionGuid: string,
        queryString: object,
        commandTimeOutInSeconds: number = 30
    ): Promise<ExecutionResult> {
        return new Promise<ExecutionResult>(async (resolve, reject) => {

            try {

                let routineCache = dbSource.cache;

                let cachedRoutine = routineCache.find(r => r.equals(schemaName, routineName));

                if (cachedRoutine == null) {
                    throw `The routine [${schemaName}].[${routineName}] was not found.`;
                }

                let dbConn = dbSource.getSqlConnection(dbConnectionGuid);
                let sqlConfig = SqlConfigBuilder.build(dbConn);

                let con: sql.ConnectionPool = <sql.ConnectionPool>await new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                    SessionLog.error(err.toString());
                    reject(err);
                    return;
                });

                if (con == null) return;

                // PLUGINS
                await ExecController.processPlugins(dbSource, queryString, con);

                let cmd = new sql.Request(con);

                cmd.stream = false; // TODO: In future consider streaming for async calls

                if (cachedRoutine.Parameters != null) {
                    cachedRoutine.Parameters.filter(p => p.IsResult == null || p.IsResult.toUpperCase() != "YES").forEach(p => {

                        let sqlType = ExecController.getSqlDbTypeFromParameterType(p.DataType);
                        let parmValue = null;

                        // trim leading '@'
                        let parmName = p.ParameterName.substr(1, 99999);

                        if (queryString[parmName]) {
                            let val = queryString[parmName];

                            // TODO: support jsDAL variables
                            // look for special jsDAL Server variables
                            //val = jsDALServerVariables.Parse(request, val);

                            //!?parmValue = val == null ? DBNull.Value : ConvertParameterValue(sqlType, val);
                            parmValue = val;

                            // TODO: Consider making this 'null' mapping configurable.This is just a nice to have for when the client does not call the API correctly
                            // convert the string value of 'null' to actual JavaScript null
                            if (parmValue === "null") {
                                parmValue = null;
                            }
                        }

                        if (p.ParameterMode == "IN") {
                            cmd.input(parmName, sqlType, parmValue);
                        }
                        else {
                            cmd.output(parmName, sqlType);
                        }
                    }); // foreach Parameter 

                }

                let parmCsvList = cachedRoutine.Parameters.filter(p => p.IsResult == null || p.IsResult.toUpperCase() != "YES").map(p => p.ParameterName);
                let result: sql.IResult<any> | sql.IProcedureResult<any> | any;

                if (cachedRoutine.Type == "PROCEDURE") {

                    result = await cmd.execute(`[${cachedRoutine.Schema}].[${cachedRoutine.Routine}]`);

                    resolve(result.returnValue);
                }
                else if (cachedRoutine.Type == "FUNCTION") {
                    result = await cmd.query(`select [${schemaName}].[${routineName}](${parmCsvList})`);

                    if (result && result.recordset && result.recordset.length > 0) {
                        resolve(result.recordset[0][""]);
                    }
                    else {
                        resolve(null);
                    }
                }
            }
            catch (ex) {
                reject(ex);
            }

        });
    }



    private static getSqlDbTypeFromParameterType(parameterDataType: string): sql.ISqlTypeFactoryWithNoParams {
        switch (parameterDataType.toLowerCase()) {
            case "date":
                return sql.Date;
            case "datetime":
                return sql.DateTime;
            case "smalldatetime":
                return sql.SmallDateTime;
            case "int":
                return sql.Int;
            case "smallint":
                return sql.SmallInt;
            case "bigint":
                return sql.BigInt;
            case "bit":
                return sql.Bit;
            case "nvarchar":
                return sql.NVarChar;
            case "varchar":
                return sql.VarChar;
            case "text":
                return sql.Text;
            case "ntext":
                return sql.NText;
            case "varbinary":
                return sql.VarBinary;
            case "decimal":
                return sql.Decimal;
            case "uniqueidentifier":
                return sql.UniqueIdentifier;
            case "money":
                return sql.Money;
            case "char":
                return sql.Char;
            case "nchar":
                return sql.NChar;
            case "xml":
                return sql.Xml;
            case "float":
                return sql.Float;
            case "image":
                return sql.Image;
            case "tinyint":
                return sql.TinyInt;
            default:
                throw ("getSqlDbTypeFromParameterType::Unsupported data type: " + parameterDataType);
        }
    }

    private static processPlugins(dbSource: DatabaseSource, queryString: { [key: string]: any }, con: sql.ConnectionPool): Promise<any> {

        let promises = [];
        let pluginAssemblies: any[] = global["PluginAssemblies"];

        if (pluginAssemblies != null && dbSource.Plugins != null) {


            dbSource.Plugins.forEach(pluginGuid => {
                let plugin = pluginAssemblies.find(p => p.Guid && p.Guid.toLowerCase() == pluginGuid.toLowerCase());

                if (plugin != null) {
                    try {

                        let prom = plugin.OnConnectionOpened(con, queryString);

                        promises.push(prom);
                    }
                    catch (ex) {
                        SessionLog.error(`Failed to instantiate '${plugin.Name}' (${plugin.Guid})`);
                        SessionLog.exception(ex);
                    }
                }
                else {
                    SessionLog.warning(`The specified plugin GUID '${pluginGuid}' was not found in the list of loaded plugins.`);
                }
            });
        }

        return Promise.all(promises);
    }

    private static convertParameterValue(sqlType: sql.ISqlTypeFactoryWithNoParams, value: any): any {

        if (sqlType == sql.Date || sqlType == sql.DateTime || sqlType == sql.DateTime2 || sqlType == sql.SmallDateTime) {
            //return Date.parse(value);
            let mom = moment.utc(value);
            // TODO: temporary fix for tedious Date issue
            return mom.format("YYYY-MM-DD hh:mm:ss.SSS A");
            //        return dt.toString();

            //return dt;
        }
        else if (sqlType == sql.Bit) {
            let v = value.toString().toLowerCase();
            return value == "true" || value == "1" || value == "yes";
        }
        else if (sqlType == sql.VarBinary) {
            return ExecController.convertToSqlBinary(value);
        }

        return value;
    }

    private static convertToSqlBinary(value: any) {
        if (typeof (value) === "string") {

            let str: string = value.toString();
            let blobRefPrefix = "blobRef:";

            if (str.startsWith(blobRefPrefix)) {
                let key: string = str.substring(blobRefPrefix.length);

                if (!BlobStore.exists(key)) throw new Error(`Invalid, non-existent or expired blob reference specified: '${str}'`);

                return BlobStore.get(key);
            }
            else {
                // assume a base64 string was posted for the binary data
                return Buffer.from(str, 'base64');
            }
        }

        return value;
    }

}


/*
 
 
       
 
 
        [HttpGet]
        [Route("api/execBatch")] 
        public HttpResponseMessage Batch(string batch, [FromUri] string options)
        {
            try
            {
                // do not allow JsonConvert to touch dates. Dates should continue on as plain strings so ADO.NET can convert them correctly (they should be coming in ISO-formatted)
                var callList = JsonConvert.DeserializeObject<dynamic>(batch, new JsonSerializerSettings() { DateParseHandling = DateParseHandling.None });
                var retList = new List<dynamic>();
 
                foreach (dynamic call in callList)
                {
                    int callIx = call["Ix"];
                    try
                    {
                        dynamic routine = call["Routine"];
                        Guid dbSourceGuid = routine["dbSource"];
                        Guid? dbConnectionGuid = null;
 
                        if (routine["dbConnection"] != null)
                        {
                            Guid g = Guid.Empty;
 
                            if (Guid.TryParse(routine["dbConnection"].ToString(), out g))
                            {
                                dbConnectionGuid = g;
                            }
                        }
 
 
                        string schema = routine["schema"];
                        string name = routine["routine"];
 
                        var parametersAndValues = new Dictionary<string, string>();
                        var parmArray = routine["params"] as JObject;
 
                        if (parmArray != null)
                        {
                            parametersAndValues = parmArray.ToObject<Dictionary<string, string>>();
                        }
                        
 
                        //string parms = routine["params"];
                        string fieldSelectList = routine["$select"];
 
                        var dbSource = Settings.Instance.ProjectList.SelectMany(p => p.Value.DatabaseSources).FirstOrDefault(dbs => dbs.CacheKey == dbSourceGuid);
                        if (dbSource == null) throw new Exception(string.Format("The specified DB source '{0}' was not found.", dbSourceGuid));
 
                        // make sure the source domain/IP is allowed access
                        string ue;
                        if (!dbSource.MayAccessDbSource(Request, out ue))
                        {
                            return Request.CreateResponse<string>(System.Net.HttpStatusCode.Forbidden, ue);
                        }
 
 
                        Dictionary<string, dynamic> outputParms = null;
 
                        if (!string.IsNullOrWhiteSpace(fieldSelectList)) parametersAndValues.Add("$select", fieldSelectList);
 
                        if (!string.IsNullOrWhiteSpace(options))
                        {
                            var uri = new Uri("http://dummy.com?" + options);
                            var optionVC = uri.ParseQueryString();
 
                            foreach (var k in optionVC.AllKeys)
                            {
                                parametersAndValues.Add(k, optionVC[k].ToString());
                            }
                        }
 
                        var routineCache = dbSource.GetCache();
 
                        var cachedRoutine = routineCache.FirstOrDefault(r => r.Schema.Equals(schema, StringComparison.OrdinalIgnoreCase) && r.Routine.Equals(name, StringComparison.OrdinalIgnoreCase));
 
                        if (cachedRoutine == null)
                        {
                            // TODO: Decide what to do here? 
                            throw new Exception("TODO: Decide what todo....routine not found");
                        }
 
                        var output = (IDictionary<string, object>)new System.Dynamic.ExpandoObject();
 
                        output.Add("Ix", callIx);
 
                        if (cachedRoutine.Type.Equals("FUNCTION", StringComparison.CurrentCultureIgnoreCase))
                        {
                            var scalar = Database.ExecRoutineScalar(this.Request, schema, name, dbSource, dbConnectionGuid, parametersAndValues);
 
                            if (scalar is DateTime)
                            {
                                var dt = (DateTime)scalar;
 
                                // convert to Javascript Date ticks
                                var ticks = dt.ToUniversalTime().Subtract(new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
                                // TODO: ?????????????
                                scalar = ApiResponseScalar.Payload(ticks, true);
 
                                //return ret;
                            }
 
                            output.Add("Data", scalar);
 
                        }
                        else
                        {
                            var ds = Database.ExecRoutineQuery(this.Request, schema, name, out outputParms, dbSource, dbConnectionGuid, parametersAndValues);
 
                            var dataContainers = ds.ToJsonDS();
 
                            output.Add("OutputParms", outputParms);
 
                            var keys = dataContainers.Keys.ToList();
 
                            for (var i = 0; i < keys.Count; i++)
                            {
                                output.Add(keys[i], dataContainers[keys[i]]);
                            }
 
                            output.Add("HasResultSets", keys.Count > 0);
                            output.Add("ResultSetKeys", keys.ToArray());
                        }
 
 
                        var ret = ApiResponse.Payload(output);
 
                        if (outputParms != null)
                        {
                            var possibleUEParmNames = (new string[] { "usererrormsg", "usrerrmsg", "usererrormessage", "usererror", "usererrmsg" }).ToList();
 
                            var ueKey = outputParms.Keys.FirstOrDefault(k => possibleUEParmNames.Contains(k.ToLower()));
 
                            // if a user error msg is defined.
                            if (!string.IsNullOrWhiteSpace(ueKey) && !string.IsNullOrWhiteSpace(outputParms[ueKey]))
                            {
                                ret.Message = outputParms[ueKey];
                                ret.Title = "Action failed";
                                ret.Type = ApiResponseType.ExclamationModal;
                            }
                        }
 
                        retList.Add(ret);
 
                    }
                    catch (Exception ex)
                    {
                        return Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.InternalServerError, ApiResponse.Exception(ex));
                    }
 
                }
                //HttpContext.Current.Response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0"); // HTTP 1.1.
                //HttpContext.Current.Response.AddHeader("Pragma", "no-cache"); // HTTP 1.0.
                //HttpContext.Current.Response.AddHeader("Expires", "0"); // Proxies.
 
 
                var response = Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.OK, ApiResponse.Payload(retList));
 
                response.Headers.Clear();
                //response.Headers.CacheControl.Private = true;
                response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0"); // HTTP 1.1.
                response.Headers.Add("Pragma", "no-cache"); // HTTP 1.0.
                
                //response.Headers.Add("Expires", "0"); // Proxies
 
                return response;
                //return ApiResponse.Payload(retList);
                //var dbSource = Settings.Instance.ProjectList.SelectMany(p => p.Value.DatabaseSources).FirstOrDefault(dbs => dbs.CacheKey == dbSourceGuid);
 
                //// TODO: if not found...
                //if (dbSource == null) throw new Exception(string.Format("The specified DB source '{0}' was not found.", dbSourceGuid));
 
                //var queryString = this.Request.GetQueryNameValuePairs();
 
                //var scalar = Database.ExecRoutineScalar(schema, routine, dbSource, queryString.ToDictionary(t => t.Key, t => t.Value));
 
                //if (scalar is DateTime)
                //{
                //    var dt = (DateTime)scalar;
 
                //    // convert to Javascript Date ticks
                //    var ticks = dt.ToUniversalTime().Subtract(new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
 
                //    var ret = ApiResponseScalar.Payload(ticks, true);
 
                //    return ret;
                //}
 
                //return ApiResponse.Payload(scalar);
            }
            catch (Exception ex)
            {
                return Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.InternalServerError, ApiResponse.Exception(ex));
            }
        }
 
*/

class ExecutionResult {
    results: any;
    outputParms: { [key: string]: any };
}