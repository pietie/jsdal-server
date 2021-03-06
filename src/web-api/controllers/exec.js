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
const moment = require("moment");
const shortid = require("shortid");
const log_1 = require("./../../util/log");
const jsdal_server_variables_1 = require("./../jsdal-server-variables");
const blob_store_1 = require("./../blob-store");
const multer = require("multer");
const request = require("request");
const exception_logger_1 = require("./../../util/exception-logger");
const thread_util_1 = require("./../../util/thread-util");
const sql_config_builder_1 = require("./../../util/sql-config-builder");
// parse multipart/form-data
let memStorage = multer.memoryStorage();
let blobUploader = multer({ storage: memStorage, limits: { fileSize /*bytes*/: 1024 * 1024 * 10 } }).any(); // TODO: make max file size configurable
class ExecController {
    static prepareBlob(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    blobUploader(req, res, (err) => {
                        if (err) {
                            res.status(500).send(err.toString());
                            return;
                        }
                        let keyList = [];
                        req.files.forEach(f => {
                            let id = shortid.generate();
                            blob_store_1.BlobStore.add(id, f.buffer);
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
                        resolve(api_response_1.ApiResponse.Payload(keyList));
                    });
                }
                catch (ex) {
                    resolve(api_response_1.ApiResponse.Exception(ex));
                }
            });
        });
    }
    static execNonQuery(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            return ExecController.execQueryAndNonQuery(req, res, true);
        });
    }
    static execQuery(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            return ExecController.execQueryAndNonQuery(req, res, false);
        });
    }
    static execQueryAndNonQuery(req, res, isNonQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            // always start off not caching whatever we send back
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
            res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
            res.setHeader("Content-Type", "application/json");
            let dbSource;
            let dbConnectionGuid;
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let debugInfo = "";
                try {
                    let isPOST = req.method === "POST";
                    let dbSourceGuid = req.params.dbSourceGuid;
                    dbConnectionGuid = req.params.dbConnectionGuid;
                    let schema = req.params.schema;
                    let routine = req.params.routine;
                    debugInfo += `[${schema}].[${routine}]`;
                    let dbSources = settings_instance_1.SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources);
                    let dbSourcesFlat = [].concat.apply([], dbSources); // flatten the array of arrays
                    dbSource = dbSourcesFlat.find(dbs => dbs.CacheKey === dbSourceGuid);
                    if (dbSource == null)
                        throw `The specified DB source '${dbSourceGuid}' was not found.`;
                    // make sure the source domain/IP is allowed access
                    let mayAccess = dbSource.mayAccessDbSource(req);
                    if (!mayAccess.success) {
                        res.set('Content-Type', 'text/plain');
                        res.status(403).send(mayAccess.userErrorMsg);
                        return undefined;
                    }
                    let execResult = yield ExecController.execRoutineQuery(req, res, schema, routine, dbSource, dbConnectionGuid, isPOST ? req.body : req.query);
                    // .catch(e => {
                    //     resolve(ApiResponse.Exception(e));
                    //     return;
                    // });
                    if (execResult == undefined)
                        return;
                    let retVal = {};
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
                    resolve(ret);
                }
                catch (ex) {
                    if (dbConnectionGuid && dbSource) {
                        let dbConn = dbSource.getSqlConnection(dbConnectionGuid);
                        if (debugInfo == null)
                            debugInfo = "";
                        if (dbConn) {
                            debugInfo = `${dbSource.Name} - ${dbConn.server} - ${debugInfo}`;
                        }
                        else {
                            debugInfo = `${dbSource.Name} - (no connection) - ${debugInfo}`;
                        }
                    }
                    resolve(api_response_1.ApiResponse.Exception(ex, debugInfo));
                }
            }));
        });
    }
    static Scalar(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // always start off not caching whatever we send back
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
            res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
            res.setHeader("Content-Type", "application/json");
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
                    let scalar = yield ExecController.execRoutineScalar(req, schema, routine, dbSource, dbConnectionGuid, req.query);
                    let ret;
                    if (scalar instanceof Date) {
                        ret = api_response_1.ApiResponseScalar.PayloadScalar(scalar.getTime(), true);
                    }
                    else {
                        ret = api_response_1.ApiResponse.Payload(scalar);
                    }
                    resolve(ret);
                }
                catch (ex) {
                    resolve(api_response_1.ApiResponse.Exception(ex));
                }
            }));
        });
    }
    static toJsonDataset(resultSets) {
        let ret = {};
        if (resultSets && resultSets.length > 0) {
            for (let i = 0; i < resultSets.length; i++) {
                let rs = resultSets[i];
                let fields = Object.keys(rs.columns).map(colName => { return { name: colName, type: rs.columns[colName].type.name }; });
                let table = rs.toTable();
                ret["Table" + i] = {
                    Fields: fields,
                    Data: table.rows
                };
            }
        }
        return ret;
    }
    static processMetadata(req, res, cachedRoutine) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (cachedRoutine.jsDALMetadata && cachedRoutine.jsDALMetadata.jsDAL) {
                if (cachedRoutine.jsDALMetadata.jsDAL.security) {
                    if (cachedRoutine.jsDALMetadata.jsDAL.security.requiresCaptcha) {
                        if (!req.headers["captcha-val"]) {
                            yield thread_util_1.ThreadUtil.Sleep(1000 * 5); // TODO: Make this configurable? We intentionally slow down requests that do not conform 
                            reject(new Error("captcha-val header not specified"));
                        }
                        if (!settings_instance_1.SettingsInstance.Instance.Settings.GoogleRecaptchaSecret) {
                            reject(new Error("The setting GoogleRecaptchaSecret is not configured on this jsDAL server."));
                        }
                        let capResp = yield ExecController.validateGoogleRecaptcha(req.headers["captcha-val"]);
                        res.setHeader("captcha-ret", capResp.success ? "1" : "0");
                        if (capResp.success)
                            resolve({ success: true });
                        else
                            resolve({ success: false, userErrorMsg: "Captcha failed." });
                    }
                }
            }
            resolve({ success: true });
        }));
    }
    static validateGoogleRecaptcha(captcha) {
        return new Promise((resolve, reject) => {
            let postData = {
                secret: settings_instance_1.SettingsInstance.Instance.Settings.GoogleRecaptchaSecret,
                response: captcha
            };
            request.post('https://www.google.com/recaptcha/api/siteverify', {
                headers: { 'content-type': 'application/json' },
                form: postData
            }, (error, response, body) => {
                if (!error) {
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch (e) {
                        exception_logger_1.ExceptionLogger.logException(e);
                        reject(e);
                    }
                }
                else {
                    reject(error);
                }
            });
        });
    }
    static execRoutineQuery(req, res, schemaName, routineName, dbSource, dbConnectionGuid, queryString, commandTimeOutInSeconds = 60) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let con = null;
                let cmd = null;
                try {
                    let routineCache = dbSource.cache;
                    let cachedRoutine = routineCache.find(r => r.equals(schemaName, routineName));
                    if (routineName == "RegisterManually") {
                        console.log(` exec on dbSource ${dbSource.CacheKey}...${cachedRoutine.jsDALMetadata != null ? "YES" : "NO"}`);
                    }
                    if (cachedRoutine == null) {
                        throw new Error(`The routine [${schemaName}].[${routineName}] was not found.`);
                    }
                    let metaResp = null;
                    try {
                        metaResp = yield ExecController.processMetadata(req, res, cachedRoutine);
                    }
                    catch (e) {
                        console.info("failed to retrieve metadata");
                        console.error(e);
                    }
                    if (metaResp && !metaResp.success) {
                        res.send(api_response_1.ApiResponse.ExclamationModal(metaResp.userErrorMsg));
                        resolve(undefined);
                        return;
                    }
                    let dbConn = dbSource.getSqlConnection(dbConnectionGuid);
                    let sqlConfig = sql_config_builder_1.SqlConfigBuilder.build(dbConn);
                    con = (yield new sql.ConnectionPool(sqlConfig)
                        .connect()
                        .catch(err => {
                        console.log(".....rejecting with error:", err);
                        reject(err);
                        return;
                    }));
                    // (<any>sql).on('error', err => {
                    //     //console.log("*****************!!! ", err);
                    //     if (con) {
                    //         con.removeAllListeners();
                    //         con.close();
                    //         con = null;
                    //     }
                    // })
                    if (con == null)
                        return;
                    // PLUGINS
                    yield ExecController.processPlugins(dbSource, queryString, con);
                    cmd = new sql.Request(con);
                    cmd.stream = false; // TODO: In future consider streaming for async calls
                    let isTVF = cachedRoutine.Type == "TVF";
                    if (cachedRoutine.Type == "PROCEDURE" || isTVF) {
                        if (cachedRoutine.Parameters != null) {
                            let queryStringKeys = Object.keys(queryString);
                            cachedRoutine.Parameters.forEach(p => {
                                let sqlType = ExecController.getSqlDbTypeFromParameterType(p.DataType);
                                let parmValue = null;
                                // trim leading '@'
                                let parmName = p.ParameterName.substr(1, 99999);
                                let skipParm = false;
                                if (queryStringKeys.indexOf(parmName) >= 0) {
                                    let val = queryString[parmName];
                                    // look for special jsDAL Server variables
                                    val = jsdal_server_variables_1.jsDALServerVariables.parse(req, val);
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
                                        if (sqlType == sql.DateTime)
                                            sqlType = sql.NVarChar;
                                    }
                                }
                                else {
                                    // do not skip on INOUT parameters as SQL does not apply default values to OUT parameters
                                    if (p.HasDefaultValue && (p.ParameterMode == "IN")) {
                                        skipParm = true;
                                    }
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
                                if (!skipParm) {
                                    if (p.ParameterMode == "IN") {
                                        cmd.input(parmName, sqlType, parmValue);
                                    }
                                    else if (p.ParameterMode == "INOUT") {
                                        cmd.output(parmName, sqlType, parmValue);
                                    }
                                    else {
                                        cmd.output(parmName, sqlType);
                                    }
                                }
                            }); // foreach Parameter 
                        }
                        //!var executionTrackingEndFunction = ExecTracker.Track(dbSource.Name, cachedRoutine.Schema, cachedRoutine.Routine);
                        //                     cmd.on("error", (a,b)=>
                        //                     {
                        // let aaa = a;
                        //                     });
                        let res;
                        if (isTVF) {
                            let parmCsvList = cachedRoutine.Parameters.filter(p => p.IsResult == null || p.IsResult.toUpperCase() != "YES").map(p => p.ParameterName);
                            res = yield cmd.query(`select * from [${schemaName}].[${routineName}](${parmCsvList})`);
                        }
                        else {
                            res = yield cmd.execute(`[${cachedRoutine.Schema}].[${cachedRoutine.Routine}]`);
                        }
                        /////////////////////
                        // $select
                        // ¯¯¯¯¯¯¯¯
                        // Allows the user to only return certain fields
                        // comma(,) splits fields and semi-colon(;) splits across table results
                        {
                            if (queryString["$select"] && res.recordsets.length > 0) {
                                let limitToFieldsCsv = queryString["$select"];
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
                        // clone so we can destroy the Request object in the finally block
                        let resCloned = Object.assign({}, res.recordsets);
                        let outputParmsClone = Object.assign({}, res.output);
                        resCloned.length = res.recordsets.length;
                        resolve({ results: resCloned, outputParms: outputParmsClone });
                    }
                    else if (cachedRoutine.Type == "FUNCTION") {
                        throw "Use ExecScalar for UDF calls";
                    }
                }
                catch (ex) {
                    reject(ex);
                }
                finally {
                    if (cmd) {
                        cmd.removeAllListeners();
                        cmd = null;
                    }
                    if (con) {
                        con.removeAllListeners();
                        con.close();
                        con = null;
                    }
                }
            }));
        });
    }
    static execRoutineScalar(request, schemaName, routineName, dbSource, dbConnectionGuid, queryString, commandTimeOutInSeconds = 30) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let routineCache = dbSource.cache;
                    let cachedRoutine = routineCache.find(r => r.equals(schemaName, routineName));
                    if (cachedRoutine == null) {
                        throw `The routine [${schemaName}].[${routineName}] was not found.`;
                    }
                    let dbConn = dbSource.getSqlConnection(dbConnectionGuid);
                    let sqlConfig = sql_config_builder_1.SqlConfigBuilder.build(dbConn);
                    let con = yield new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                        log_1.SessionLog.error(err.toString());
                        reject(err);
                        return;
                    });
                    if (con == null)
                        return;
                    // PLUGINS
                    yield ExecController.processPlugins(dbSource, queryString, con);
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
                    let result;
                    if (cachedRoutine.Type == "PROCEDURE") {
                        result = yield cmd.execute(`[${cachedRoutine.Schema}].[${cachedRoutine.Routine}]`);
                        resolve(result.returnValue);
                    }
                    else if (cachedRoutine.Type == "FUNCTION") {
                        result = yield cmd.query(`select [${schemaName}].[${routineName}](${parmCsvList})`);
                        if (result && result.recordset && result.recordset.length > 0) {
                            resolve(result.recordset[0][""]);
                        }
                        else {
                            resolve(null);
                        }
                    }
                    cmd.removeAllListeners();
                    con.removeAllListeners();
                    con.close();
                    cmd = null;
                    con = null;
                }
                catch (ex) {
                    reject(ex);
                }
                finally {
                    // TODO: Clean up
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
        let promises = [];
        let pluginAssemblies = global["PluginAssemblies"];
        if (pluginAssemblies != null && dbSource.Plugins != null) {
            dbSource.Plugins.forEach(pluginGuid => {
                let plugin = pluginAssemblies.find(p => p.Guid && p.Guid.toLowerCase() == pluginGuid.toLowerCase());
                if (plugin != null) {
                    try {
                        let prom = plugin.OnConnectionOpened(con, queryString);
                        promises.push(prom);
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
        return Promise.all(promises);
    }
    static convertParameterValue(sqlType, value) {
        let mayBeEmptyString = [sql.Char, sql.NChar, sql.NText, sql.NVarChar, sql.Text, sql.VarChar];
        // handle empty strings
        if (value === "") {
            // for non-string type sql types map empty string values to NULL
            if (mayBeEmptyString.indexOf(sqlType) == -1)
                return null;
        }
        if (sqlType == sql.DateTime || sqlType == sql.DateTime2 || sqlType == sql.SmallDateTime) {
            //return Date.parse(value);
            let mom = moment.utc(value);
            // TODO: temporary fix for tedious Date issue
            return mom.format("YYYY-MM-DD hh:mm:ss.SSS A");
            //return mom.toDate();
            //        return dt.toString();
            //return dt;
        }
        else if (sqlType == sql.Date) {
            return moment.utc(value).toDate();
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
    static convertToSqlBinary(value) {
        if (typeof (value) === "string") {
            let str = value.toString();
            let blobRefPrefix = "blobRef:";
            if (str.startsWith(blobRefPrefix)) {
                let key = str.substring(blobRefPrefix.length);
                if (!blob_store_1.BlobStore.exists(key))
                    throw new Error(`Invalid, non-existent or expired blob reference specified: '${str}'`);
                return blob_store_1.BlobStore.get(key);
            }
            else {
                // assume a base64 string was posted for the binary data
                return Buffer.from(str, 'base64');
            }
        }
        return value;
    }
}
__decorate([
    decorators_1.route("/api/blob", { get: false, post: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExecController, "prepareBlob", null);
__decorate([
    decorators_1.route("/api/execnq/:dbSourceGuid/:dbConnectionGuid/:schema/:routine", { get: true, post: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExecController, "execNonQuery", null);
__decorate([
    decorators_1.route("/api/exec/:dbSourceGuid/:dbConnectionGuid/:schema/:routine", { get: true, post: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExecController, "execQuery", null);
__decorate([
    decorators_1.route("/api/execScalar/:dbSourceGuid/:dbConnectionGuid/:schema/:routine", { get: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExecController, "Scalar", null);
exports.ExecController = ExecController;
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
}
//# sourceMappingURL=exec.js.map