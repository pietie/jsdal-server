"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./../util/log");
const thread_util_1 = require("./../util/thread-util");
const settings_instance_1 = require("./../settings/settings-instance");
const cached_routine_1 = require("./../settings/object-model/cache/cached-routine");
const routine_parameter_1 = require("./../settings/object-model/cache/routine-parameter");
const orm_dal_1 = require("../database/orm-dal");
const js_generator_1 = require("./js-generator");
const async = require("async");
const sql = require("mssql");
const fs = require("fs");
const shortid = require("shortid");
const xml2js = require("xml2js");
const moment = require("moment");
const sql_config_builder_1 = require("./../util/sql-config-builder");
const exception_logger_1 = require("./../util/exception-logger");
const routine_parser_1 = require("./routine-parser");
class WorkSpawner {
    static resetMaxRowDate(dbSource) {
        let worker = WorkSpawner._workerList.find(wl => wl.dbSourceKey == dbSource.CacheKey);
        if (worker)
            worker.resetMaxRowDate();
    }
    static getWorker(name) {
        return WorkSpawner._workerList.find(wl => wl.name == name);
    }
    static getWorkerById(id) {
        return WorkSpawner._workerList.find(wl => wl.id == id);
    }
    static get workerList() {
        return WorkSpawner._workerList;
    }
    static Start() {
        try {
            let dbSources = settings_instance_1.SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources).reduce((prev, next) => { return prev.concat(next); });
            WorkSpawner.TEMPLATE_RoutineContainer = fs.readFileSync('./resources/RoutineContainerTemplate.txt', { encoding: "utf8" });
            WorkSpawner.TEMPLATE_Routine = fs.readFileSync('./resources/RoutineTemplate.txt', { encoding: "utf8" });
            WorkSpawner.TEMPLATE_TypescriptDefinitions = fs.readFileSync('./resources/TypeScriptDefinitionsContainer.d.ts', { encoding: "utf8" });
            WorkSpawner._workerList = [];
            //dbSources = [dbSources[3]]; //TEMP 
            async.each(dbSources, (source) => {
                try {
                    let worker = new Worker();
                    worker.dbSourceKey = source.CacheKey;
                    worker.name = source.Name;
                    worker.description = `${source.dataSource}; ${source.initialCatalog} `;
                    console.log(`Spawning new worker for ${source.Name}`);
                    WorkSpawner._workerList.push(worker);
                    worker.run(source);
                }
                catch (e) {
                    exception_logger_1.ExceptionLogger.logException(e);
                    console.log(e.toString());
                }
            }, error => {
                log_1.SessionLog.error(error.toString());
            });
        }
        catch (e) {
            log_1.SessionLog.exception(e);
            console.error(e);
        }
    }
}
exports.WorkSpawner = WorkSpawner;
class Worker {
    constructor() {
        this.isRunning = false;
        this.maxRowDate = 0;
        this._id = shortid.generate();
        this._log = new log_1.MemoryLog(300);
    }
    get id() { return this._id; }
    get running() { return this.isRunning; }
    get status() { return this._status; }
    set status(val) { this._status = val; }
    get log() { return this._log; }
    resetMaxRowDate() {
        this.maxRowDate = 0;
        this._log.info("MaxRowDate reset to 0.");
    }
    start() {
        if (this.isRunning)
            return;
        this.status = "Starting up...";
        this._log.info("Worker started by user.");
        this.run(this._dbSource);
    }
    stop() {
        this.isRunning = false;
        this.status = "Stopped.";
        this._log.info("Worker stopped by user.");
    }
    run(dbSource) {
        return __awaiter(this, void 0, void 0, function* () {
            this._dbSource = dbSource;
            this.isRunning = true;
            let lastSavedDate = new Date();
            let sqlConfig = sql_config_builder_1.SqlConfigBuilder.build(dbSource);
            var cache = dbSource.cache;
            if (cache != null && cache.length > 0) {
                this.maxRowDate = Math.max(...cache.map(c => c.RowVer));
                log_1.SessionLog.info(`${dbSource.Name}\tMaxRowDate from cache = ${this.maxRowDate}`);
                this._log.info(`${dbSource.Name}\tMaxRowDate from cache = ${this.maxRowDate}`);
            }
            let connectionErrorCnt = 0;
            let con;
            let last0Cnt = null;
            while (this.isRunning) {
                if (!dbSource.IsOrmInstalled) {
                    // try again in 10 seconds
                    this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - Waiting for ORM to be installed.`;
                    setTimeout(() => this.run(dbSource), 10000);
                    return;
                }
                try {
                    // reconnect if necessary 
                    if (!con || !con.connected) {
                        //console.log('\tConnecting to...', sqlConfig.server, sqlConfig.database);
                        con = (yield new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                            this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - Failed to open connection to database: ` + err.toString();
                            log_1.SessionLog.error(`Failed to open conneciton to database. ${sqlConfig.server}->${sqlConfig.database}`);
                            if (err.message == null)
                                err.message = "";
                            let config = {};
                            Object.assign(config, sqlConfig);
                            delete config.password;
                            err.message += "; debug:" + JSON.stringify(config);
                            log_1.SessionLog.exception(err);
                            this._log.error(`Failed to open conneciton to database. ${sqlConfig.server}->${sqlConfig.database}`);
                            this._log.exception(err);
                        }));
                    }
                    if (!con) {
                        connectionErrorCnt++;
                        let waitMS = Math.min(3000 + (connectionErrorCnt * 3000), 300000 /*Max 5mins between tries*/);
                        this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - Attempt: #${connectionErrorCnt + 1} (waiting for ${waitMS}ms). ` + this.status;
                        this._log.info(this.status);
                        yield thread_util_1.ThreadUtil.Sleep(waitMS);
                        continue;
                    }
                    connectionErrorCnt = 0;
                    let routineCount = yield orm_dal_1.OrmDAL.SprocGenGetRoutineListCnt(con, this.maxRowDate);
                    let curRow = 0;
                    if (routineCount > 0) {
                        last0Cnt = null;
                        log_1.SessionLog.info(`${dbSource.Name}\t${routineCount} change(s) found using row date ${this.maxRowDate}`);
                        this._log.info(`${dbSource.Name}\t${routineCount} change(s) found using row date ${this.maxRowDate}`);
                        this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - ${routineCount} change(s) found using rowdate ${this.maxRowDate}`;
                        yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                            let genGetRoutineListStream = orm_dal_1.OrmDAL.SprocGenGetRoutineListStream(con, this.maxRowDate);
                            let stillProcessingCnt = 0;
                            let isDone = false;
                            // for every row
                            genGetRoutineListStream.on('row', (row) => __awaiter(this, void 0, void 0, function* () {
                                if (routineCount == 1) {
                                    this._log.info(`(single change) ${dbSource.Name}\t[${row.SchemaName}].[${row.RoutineName}]`);
                                }
                                stillProcessingCnt++;
                                let newCachedRoutine = new cached_routine_1.CachedRoutine();
                                newCachedRoutine.Routine = row.RoutineName;
                                newCachedRoutine.Schema = row.SchemaName;
                                newCachedRoutine.Type = row.RoutineType;
                                newCachedRoutine.IsDeleted = row.IsDeleted;
                                newCachedRoutine.Parameters = [];
                                newCachedRoutine.RowVer = row.rowver;
                                if (row.JsonMetadata && row.JsonMetadata != "") {
                                    try {
                                        newCachedRoutine.jsDALMetadata = JSON.parse(row.JsonMetadata);
                                    }
                                    catch (ex) {
                                        newCachedRoutine.jsDALMetadata = { error: ex };
                                    }
                                }
                                // convert ParameterXml to a javscript object
                                xml2js.parseString(row.ParametersXml, (err, result) => {
                                    if (!err && result && result.Routine && result.Routine.Parameter) {
                                        for (var e in result.Routine.Parameter) {
                                            let newParm = routine_parameter_1.RoutineParameter.createFromJson(result.Routine.Parameter[e]);
                                            newCachedRoutine.Parameters.push(newParm);
                                        }
                                    }
                                });
                                curRow++;
                                let perc = (curRow / routineCount) * 100.0;
                                this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - ${dbSource.Name} - Overall progress: (${perc.toFixed(2)}%. Currently processing [${row.SchemaName}].[${row.RoutineName}]`; //, schema, name, perc);
                                if (!newCachedRoutine.IsDeleted) {
                                    /*
                                        Resultset METADATA
                                    */
                                    if (newCachedRoutine.ResultSetRowver && newCachedRoutine.ResultSetRowver >= newCachedRoutine.RowVer) {
                                        console.log("Result set metadata up to date");
                                    }
                                    else {
                                        //logLine.Append("Generating result set metadata");
                                        //console.log("Generating result set metadata");
                                        try {
                                            let resultSets = yield orm_dal_1.OrmDAL.RoutineGetFmtOnlyResults(con, newCachedRoutine.Schema, newCachedRoutine.Routine, newCachedRoutine.Parameters);
                                            if (resultSets) {
                                                newCachedRoutine.ResultSetMetadata = resultSets;
                                            }
                                            else {
                                                // console.log("\t(no results) ", newCachedRoutine.Routine);
                                            }
                                            newCachedRoutine.ResultSetRowver = row.rowver;
                                            newCachedRoutine.ResultSetError = null;
                                        }
                                        catch (e) {
                                            // TODO: Loggity log
                                            newCachedRoutine.ResultSetRowver = row.rowver;
                                            newCachedRoutine.ResultSetError = e.toString();
                                        }
                                    }
                                    {
                                        // PARSE routine body
                                        /*if (routineParsingRowver.HasValue && routineParsingRowver >= row.rowver) {
                                            //!logLine.Append("Routine body parsing up to date");
                                        }
                                        else*/
                                        {
                                            //!logLine.Append("Parsing routine body");
                                            //!
                                            let routineDefinition = null;
                                            // TODO: Wrap in try...catch?
                                            routineDefinition = yield orm_dal_1.OrmDAL.FetchRoutineDefinition(con, /*dbSource.MetadataConnection.ConnectionStringDecrypted*/ dbSource.MetadataConnection.initialCatalog, row.SchemaName, row.RoutineName);
                                            if (routineDefinition != null) {
                                                let parsed = yield routine_parser_1.RoutineParser.parse(routineDefinition);
                                                if (parsed && parsed.Parameters != null && newCachedRoutine.Parameters != null) {
                                                    parsed.Parameters.forEach(parsedParm => {
                                                        // find corresponding Routine Parameter
                                                        let p = newCachedRoutine.Parameters.find(rp => rp.ParameterName.toLowerCase() == parsedParm.VariableName.toLowerCase());
                                                        if (p != null) {
                                                            //p.DefaultValue = parsedParm.DefaultValue;
                                                            //p.DefaultValueType = parsedParm.DefaultValueType;
                                                            p.HasDefaultValue = parsedParm.HasDefault;
                                                        }
                                                    });
                                                }
                                                //!newCachedRoutine.jsDALMetadata = parsed.jsDALMetadata;
                                                //!newCachedRoutine.RoutineParsingRowver = rowDate;
                                            }
                                            //!logLine.Append(""); // output last duration
                                        }
                                    }
                                } // !IsDeleted
                                dbSource.addToCache(row.rowver, newCachedRoutine);
                                // TODO: Make saving gap configurable?
                                if (new Date().getTime() - lastSavedDate.getTime() >= 20000 /*ms*/) {
                                    lastSavedDate = new Date();
                                    dbSource.saveCache();
                                }
                                if (this.maxRowDate == null || row.rowver > this.maxRowDate) {
                                    this.maxRowDate = parseInt(row.rowver);
                                }
                                stillProcessingCnt--;
                            })); // "on row"
                            genGetRoutineListStream.on('error', (err) => {
                                // May be emitted multiple times
                                console.error(err);
                                reject(err);
                            });
                            genGetRoutineListStream.on('done', (affected) => {
                                isDone = true;
                                dbSource.saveCache();
                            });
                            /*
                                The following loop waits for all the routines to finish processing.
                            */
                            while (true) {
                                if (isDone) {
                                    // TODO : add timeout here but only once we've reached the done event
                                    if (stillProcessingCnt <= 0) {
                                        resolve();
                                        break;
                                    }
                                }
                                yield thread_util_1.ThreadUtil.Sleep(200);
                            }
                        })); // await Promise...
                        // processing of found changes complete...
                        {
                            // call save for final changes 
                            dbSource.saveCache();
                            this.generateOutputFiles(dbSource);
                        }
                    } // if (routineCount > 0) 
                    else {
                        if (last0Cnt == null)
                            last0Cnt = moment();
                        // only update status if we've been receiving 0 changes for a while
                        if (moment().diff(last0Cnt, 'seconds') > 30) {
                            this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - no changes found`;
                        }
                        // handle the case where the output files no longer exist but we have also not seen any changes on the DB again
                        dbSource.JsFiles.forEach(jsFile => {
                            let path = dbSource.outputFilePath(jsFile);
                            if (!fs.existsSync(path)) {
                                js_generator_1.JsFileGenerator.generateJsFile(dbSource, jsFile);
                                //!this.IsRulesDirty = false;
                                //!this.IsOutputFilesDirty = false;
                                dbSource.LastUpdateDate = new Date();
                            }
                        });
                    }
                    // TODO: generate files if not exists yet
                    /* TODO: !!
                                    if (this.IsRulesDirty || this.IsOutputFilesDirty) {
                                        if (this.IsRulesDirty) Console.WriteLine("{0}\tRules changed", this.DatabaseSource.CacheKey);
                                        if (this.IsOutputFilesDirty) Console.WriteLine("{0}\tOutput files changed", this.DatabaseSource.CacheKey);
                    
                                        GenerateOutputFiles();
                                    }
                                    */
                }
                catch (e) {
                    if (e.number == 2812 /*Could not find SPROC*/) {
                        dbSource.IsOrmInstalled = false; // something is missing, need to reinstall
                    }
                    log_1.SessionLog.error("reached catch handler ref: ab123");
                    log_1.SessionLog.exception(e);
                    console.log("or catch here?", e.toString());
                }
                finally {
                    //if (con && con.connected) con.close();
                }
                yield thread_util_1.ThreadUtil.Sleep(settings_instance_1.SettingsInstance.Instance.Settings.DbSource_CheckForChangesInMilliseconds);
            }
            if (con && con.connected) {
                con.close();
            }
        });
    }
    generateOutputFiles(dbSource) {
        try {
            dbSource.JsFiles.forEach(jsFile => {
                js_generator_1.JsFileGenerator.generateJsFile(dbSource, jsFile);
                //!this.IsRulesDirty = false;
                //!this.IsOutputFilesDirty = false;
                dbSource.LastUpdateDate = new Date();
            });
        }
        catch (ex) {
            log_1.SessionLog.exception(ex);
            console.error(ex);
        }
    }
}
//# sourceMappingURL=work-spawner.js.map