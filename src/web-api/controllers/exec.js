"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_response_1 = require("./../api-response");
const settings_instance_1 = require("./../../settings/settings-instance");
const decorators_1 = require("./../decorators");
const sql = require("mssql");
const log_1 = require("./../../util/log");
class ExecController {
    static Query(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let dbSourceGuid = req.params.dbSourceGuid;
                    let dbConnectionGuid = req.params.dbConnectionGuid;
                    let schema = req.params.schema;
                    let routine = req.params.routine;
                    let dbSources = settings_instance_1.SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources);
                    let dbSourcesFlat = [].concat.apply([], dbSources); // flatten the array of arrays
                    let dbSource = dbSourcesFlat.find(dbs => dbs.CacheKey === dbSourceGuid);
                    if (dbSource == null)
                        throw `The specified DB source '${dbSourceGuid}' was not found.`;
                    // make sure the source domain/IP is allowed access
                    let mayAccess = dbSource.mayAccessDbSource(req);
                    if (!mayAccess.success) {
                        res.status(403).send(mayAccess.userErrorMsg);
                        return undefined;
                    }
                    let execResult = yield ExecController.execRoutineQuery(req, schema, routine, dbSource, dbConnectionGuid, req.query).catch(e => {
                        resolve(api_response_1.ApiResponse.Exception(e));
                        return;
                    });
                    //??? resolve(ApiResponse.Payload({ ret: "TODO:(" }));
                    let retVal = {};
                    let dataContainers = {};
                    //!let dataContainers = execResult.results.ToJsonDS();
                    retVal.OutputParms = execResult.outputParms;
                    var keys = Object.keys(dataContainers);
                    for (var i = 0; i < keys.length; i++) {
                        retVal[keys[i]] = dataContainers[keys[i]];
                    }
                    retVal.HasResultSets = keys.length > 0;
                    retVal.ResultSetKeys = keys;
                    let ret = api_response_1.ApiResponse.Payload(retVal);
                    // TODO: Consider making this a plugin
                    if (execResult.outputParms != null && Object.keys(execResult.outputParms).length > 0) {
                        let possibleUEParmNames = ["usererrormsg", "usrerrmsg", "usererrormessage", "usererror", "usererrmsg"];
                        var ueKey = Object.keys(execResult.outputParms).find(k => possibleUEParmNames.indexOf(k.toLowerCase()) >= 0);
                        // if a user error msg is defined.
                        if (ueKey && ueKey.trim() != "" && execResult.outputParms[ueKey] != null && execResult.outputParms[ueKey].trim() != "") {
                            ret.Message = execResult.outputParms[ueKey];
                            ret.Title = "Action failed";
                            ret.Type = api_response_1.ApiResponseType.ExclamationModal;
                        }
                    }
                    /*
                                    var response = Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.OK, ret);
                    
                                    response.Headers.Clear();
                    
                                    
                                    //response.Headers.Add("Content-Type", "application/json");
                                    response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                    
                    
                                    return response;*/
                    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
                    res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
                    res.setHeader("Content-Type", "application/json");
                    resolve(ret);
                }
                catch (ex) {
                    resolve(api_response_1.ApiResponse.Exception(ex));
                }
            }));
        });
    }
    static execRoutineQuery(request, schemaName, routineName, dbSource, dbConnectionGuid, queryString, commandTimeOutInSeconds = 30) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let outputParameterDictionary = {};
                let routineCache = dbSource.cache;
                let cachedRoutine = routineCache.find(r => r.equals(schemaName, routineName));
                if (cachedRoutine == null) {
                    throw `The routine [${schemaName}].[${routineName}] was not found.`;
                }
                try {
                    let dbConn = dbSource.getSqlConnection(dbConnectionGuid);
                    let sqlConfig = {
                        user: dbConn.user,
                        password: dbConn.password,
                        server: dbConn.server,
                        database: dbConn.database,
                        connectionTimeout: 15000,
                        requestTimeout: commandTimeOutInSeconds * 1000,
                        stream: false,
                        options: {
                            encrypt: true
                        }
                    };
                    let con = yield new sql.Connection(sqlConfig).connect().catch(err => {
                        log_1.SessionLog.error(err.toString());
                        reject(err);
                        return;
                    });
                    if (con == null)
                        return;
                    // PLUGINS
                    ExecController.processPlugins(dbSource, queryString, con);
                    let cmd = new sql.Request(con);
                    cmd.stream = false; // TODO: In future consider streaming for async calls
                    if (cachedRoutine.Type == "PROCEDURE"
                        || cachedRoutine.Type == "TVF" /*TABLE-VALUED FUNCTION*/) {
                        let isTVF = cachedRoutine.Type == "TVF" /*TABLE-VALUED FUNCTION*/;
                        //!cmd.CommandType = CommandType.StoredProcedure;
                        //!cmd.CommandText = string.Format("[{0}].[{1}]", schemaName, routineName);
                        if (isTVF) {
                            //!let parmCsvList = string.Join(",", cachedRoutine.Parameters.Where(p => !p.IsResult.Equals("YES", StringComparison.OrdinalIgnoreCase)).Select(p => p.ParameterName).ToArray());
                            //!cmd.CommandType = CommandType.Text;
                            //!cmd.CommandText = string.Format("select * from [{0}].[{1}]({2})", schemaName, routineName, parmCsvList);
                        }
                        let outputParmLookup = [];
                        if (cachedRoutine.Parameters != null) {
                            cachedRoutine.Parameters.forEach(p => {
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
                                    parmValue = val; // TODO:!!!!
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
                                    outputParmLookup.push(parmName);
                                    cmd.output(parmName, sqlType);
                                }
                            }); // foreach Parameter 
                        }
                        //var da = new SqlDataAdapter(cmd);
                        //var ds = new DataSet();
                        //!var executionTrackingEndFunction = ExecTracker.Track(dbSource.Name, cachedRoutine.Schema, cachedRoutine.Routine);
                        let res = yield cmd.execute(`[${cachedRoutine.Schema}].[${cachedRoutine.Routine}]`).catch(e => {
                            //todo: handle execution error
                            console.error(e);
                        });
                        // OUTPUT parameters
                        {
                            if (outputParmLookup.length > 0) {
                                // retrieve OUT-parameters and their values
                                outputParmLookup.forEach(outParm => {
                                    let val = null;
                                    val = cmd.parameters[outParm].value;
                                    //if (val == DBNull.Value) val = null;
                                    outputParameterDictionary[outParm] = val;
                                });
                            }
                        }
                        //!executionTrackingEndFunction();
                        con.close();
                        resolve({ results: "TODO", outputParms: outputParameterDictionary });
                    }
                    else if (cachedRoutine.Type == "FUNCTION") {
                        throw "Use ExecScalar for UDF calls";
                    }
                    //     using (var con = new SqlConnection(dbSource.GetSqlConnectionString(dbConnectionGuid)))
                    //     {
                    //             if (queryString.ContainsKey("$select") && ds.Tables.Count > 0)
                    //             {
                    //                 string limitToFieldsCsv = queryString["$select"];
                    //                 if (!string.IsNullOrEmpty(limitToFieldsCsv))
                    //                 {
                    //                     var listPerTable = limitToFieldsCsv.Split(new char[] { ';' }/*, StringSplitOptions.RemoveEmptyEntries*/);
                    //                     for (int tableIx = 0; tableIx < listPerTable.Length; tableIx++)
                    //                     {
                    //                         var fieldsToKeep = listPerTable[tableIx].Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries).ToLookup(s => s.Trim());
                    //                         if (fieldsToKeep.Count > 0)
                    //                         {
                    //                             var table = ds.Tables[tableIx];
                    //                             for (int i = 0; i < table.Columns.Count; i++)
                    //                             {
                    //                                 var match = fieldsToKeep.FirstOrDefault((k) => k.Key.Equals(table.Columns[i].ColumnName, StringComparison.OrdinalIgnoreCase));
                    //                                 if (match == null)
                    //                                 {
                    //                                     table.Columns.Remove(table.Columns[i]);
                    //                                     i--;
                    //                                 }
                    //                             }
                    //                         }
                    //                     }
                    //                 }
                    //             }
                }
                catch (ex) {
                    reject(ex);
                }
            }));
        });
    }
    static getSqlDbTypeFromParameterType(parameterDataType) {
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
    static processPlugins(dbSource, queryString, con) {
        let pluginAssemblies = global["PluginAssemblies"];
        if (pluginAssemblies != null && dbSource.Plugins != null) {
            dbSource.Plugins.forEach(pluginGuid => {
                let plugin = pluginAssemblies.find(p => p.Guid && p.Guid.toLowerCase() == pluginGuid.toLowerCase());
                if (plugin != null) {
                    try {
                        plugin.OnConnectionOpened(con, queryString);
                        // var concrete = (jsDALPlugin)plugin.Assembly.CreateInstance(plugin.TypeInfo.FullName);
                        // var initPluginMethod = typeof (jsDALPlugin).GetMethod("InitPlugin", BindingFlags.NonPublic | BindingFlags.Instance);//TODO: thie method signature can be cached?
                        // initPluginMethod.Invoke(concrete, new object[] { queryString });
                        // concrete.OnConnectionOpened(con);
                    }
                    catch (ex) {
                        log_1.SessionLog.error(`Failed to instantiate '${plugin.Name}' (${plugin.Guid})`);
                        log_1.SessionLog.exception(ex);
                    }
                }
                else {
                    log_1.SessionLog.warning(`The specified plugin GUID '${pluginGuid}' was not found in the list of loaded plugins.`);
                }
            });
        }
    }
}
__decorate([
    decorators_1.route("/api/exec/:dbSourceGuid/:dbConnectionGuid/:schema/:routine", { get: true }, true) //e.g. /api/exec/vZero/
    ,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExecController, "Query", null);
exports.ExecController = ExecController;
/*
 [HttpPost]
        [Route("api/blob")]
        [ValidateMimeMultipartContentFilter]
        public async Task<HttpResponseMessage> PrepareBlob() // TODO: Need some way of enforcing a max upload size
        {
            try
            {
                if (!Request.Content.IsMimeMultipartContent()) throw new Exception("api/blob/prepare expects multi-part content to be posted");


                var memProvider = await this.Request.Content.ReadAsMultipartAsync(new MultipartMemoryStreamProvider());

                
                var filesUploaded = (memProvider.Contents.Select(async i =>
                {
                    return new
                    {
                        i.Headers.ContentDisposition.Name,
                        Data = await i.ReadAsByteArrayAsync()
                    };

                })).Select(i => i.Result);//.ToList();

                List<Guid> keyList = new List<Guid>();

                foreach (var f in filesUploaded)
                {
                    Guid key = Guid.NewGuid();

                    keyList.Add(key);
                    BlobStore.Add(key, f.Data);
                }

                var response = Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.OK, ApiResponse.Payload(string.Join(",", keyList.ToArray())));

                response.Headers.Clear();
                response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0"); // HTTP 1.1.
                response.Headers.Add("Pragma", "no-cache"); // HTTP 1.0.

                return response;
            }
            catch (Exception ex)
            {
                return Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.InternalServerError, ApiResponse.Exception(ex));
            }
        }

        
    

        [HttpPost]
        [Route("api/exec/{dbSourceGuid}/{dbConnectionGuid}/{schema}/{routine}")] //e.g. /api/exec/vZero/
        public async Task<HttpResponseMessage> NonQuery(Guid dbSourceGuid, Guid? dbConnectionGuid, string schema, string routine)
        {
            try
            {
                var dbSource = Settings.Instance.ProjectList.SelectMany(p => p.Value.DatabaseSources).FirstOrDefault(dbs => dbs.CacheKey == dbSourceGuid);

                // TODO: if not found...
                if (dbSource == null) throw new Exception(string.Format("The specified DB source '{0}' was not found.", dbSourceGuid));

                // make sure the source domain/IP is allowed access
                string ue;
                if (!dbSource.MayAccessDbSource(Request, out ue))
                {
                    return Request.CreateResponse<string>(System.Net.HttpStatusCode.Forbidden, ue);
                }


                var contentBytes = await this.Request.Content.ReadAsByteArrayAsync();

                var content = System.Text.Encoding.UTF8.GetString(contentBytes);

                var sprocParams = JsonConvert.DeserializeObject<Dictionary<string, string>>(content);

                //var queryString = this.Request.GetQueryNameValuePairs();


                Dictionary<string, dynamic> outputParms;


                var dataSet = Database.ExecRoutineQuery(this.Request, schema, routine, out outputParms, dbSource, dbConnectionGuid, sprocParams);

                var retVal = (IDictionary<string, object>)new System.Dynamic.ExpandoObject();

                var dataContainers = dataSet.ToJsonDS();

                retVal.Add("OutputParms", outputParms);

                var keys = dataContainers.Keys.ToList();

                for (var i = 0; i < keys.Count; i++)
                {
                    retVal.Add(keys[i], dataContainers[keys[i]]);
                }

                retVal.Add("HasResultSets", keys.Count > 0);
                retVal.Add("ResultSetKeys", keys.ToArray());

                var ret = ApiResponse.Payload(retVal);

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

                var response = Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.OK, ret);

                response.Headers.Clear();
                response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0"); // HTTP 1.1.
                response.Headers.Add("Pragma", "no-cache"); // HTTP 1.0.

                return response;

            }
            catch (Exception ex)
            {
                return Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.InternalServerError, ApiResponse.Exception(ex));
            }
        }

        [HttpGet]
        [Route("api/execScalar/{dbSourceGuid}/{dbConnectionGuid}/{schema}/{routine}")] //e.g. /api/exec/vZero/
        public HttpResponseMessage Scalar(Guid dbSourceGuid, Guid? dbConnectionGuid, string schema, string routine)
        {
            try
            {
                var dbSource = Settings.Instance.ProjectList.SelectMany(p => p.Value.DatabaseSources).FirstOrDefault(dbs => dbs.CacheKey == dbSourceGuid);

                // TODO: if not found...
                if (dbSource == null)
                {
                    HttpResponseMessage ret = new HttpResponseMessage();

                    //var ret = Request.CreateResponse<string>(System.Net.HttpStatusCode.NotFound, string.Format("The specified DB source '{0}' was not found.", dbSourceGuid));
                    ret.Content = new StringContent(string.Format("The specified DB source '{0}' was not found.", dbSourceGuid));
                    ret.StatusCode = System.Net.HttpStatusCode.NotFound;
                    ret.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");
                    return ret;
                    //throw new Exception(string.Format("The specified DB source '{0}' was not found.", dbSourceGuid));
                }

                // make sure the source domain/IP is allowed access
                string ue;
                if (!dbSource.MayAccessDbSource(Request, out ue))
                {
                    return Request.CreateResponse<string>(System.Net.HttpStatusCode.Forbidden, ue);
                }

                var queryString = this.Request.GetQueryNameValuePairs();

                var scalar = Database.ExecRoutineScalar(this.Request, schema, routine, dbSource, dbConnectionGuid, queryString.ToDictionary(t => t.Key, t => t.Value));

                if (scalar is DateTime)
                {
                    var dt = (DateTime)scalar;

                    // convert to Javascript Date ticks
                    var ticks = dt.ToUniversalTime().Subtract(new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;

                    var ret = ApiResponseScalar.Payload(ticks, true);

                    return Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.OK, ret);
                }

                var response = Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.OK, ApiResponse.Payload(scalar));

                response.Headers.Clear();
                response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0"); // HTTP 1.1.
                response.Headers.Add("Pragma", "no-cache"); // HTTP 1.0.

                return response;
            }
            catch (Exception ex)
            {
                return Request.CreateResponse<ApiResponse>(System.Net.HttpStatusCode.InternalServerError, ApiResponse.Exception(ex));
            }
        }

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
}
//# sourceMappingURL=exec.js.map