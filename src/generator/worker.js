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
const js_generator_1 = require("./js-generator");
const thread_util_1 = require("./../util/thread-util");
const settings_instance_1 = require("./../settings/settings-instance");
const moment = require("moment");
const shortid = require("shortid");
const sql = require("mssql");
const xml2js = require("xml2js");
const fs = require("fs");
const sql_config_builder_1 = require("./../util/sql-config-builder");
const cached_routine_1 = require("./../settings/object-model/cache/cached-routine");
const routine_parameter_1 = require("./../settings/object-model/cache/routine-parameter");
const orm_dal_1 = require("../database/orm-dal");
class Worker {
    constructor() {
        this.isRunning = false;
        this.maxRowDate = 0;
        this.isForcedStopped = false;
        this._id = shortid.generate();
        this._log = new log_1.MemoryLog(300);
        this.lastConnectedMoment = moment(); // start off with a value so that the WorkSpawner monitor does not pick it up immediately 
    }
    get dbSource() { return this._dbSource; }
    get id() { return this._id; }
    get running() { return this.isRunning; }
    get status() { return this._status; }
    set status(val) { this._status = val; }
    get log() { return this._log; }
    progress(progress) {
        this.lastProgress = progress;
        this.lastProgressMoment = moment();
    }
    memDetail() {
        return {
            Name: this.name,
            // This: sizeof(this),
            Log: this._log.memDetail()
        };
    }
    resetMaxRowDate() {
        this.maxRowDate = 0;
        this._log.info("MaxRowDate reset to 0.");
    }
    start() {
        if (this.isRunning)
            return;
        this.isForcedStopped = false;
        this.status = "Starting up...";
        this._log.info("Worker started by user.");
        this.run(this._dbSource);
    }
    stop() {
        this.isForcedStopped = true;
        this.isRunning = false;
        this.status = "Stopped.";
        this._log.info("Worker stopped by user.");
    }
    dispose() {
        try {
            this.isRunning = false;
            this.status = "Disposing...";
        }
        catch (e) {
        }
    }
    recordReplacement(oldId) {
        this._log.warning(`Replaced worker ${oldId}.`);
    }
    copyInto(dst) {
        dst.name = this.name;
        dst._dbSource = this._dbSource;
        dst.dbSourceKey = this.dbSourceKey;
        dst.description = this.description;
        dst._log.copyFrom(this._log);
    }
    run(dbSource) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.progress("Staring...");
                this._log.info(`Id = ${this.id}`);
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
                let lastIterationStatusMoment = null; // used for debugging
                let last0Cnt = null;
                let debugMode = true; // if true more verbose logging is used
                while (this.isRunning) {
                    try {
                        this.progress("while loop top");
                        if (!dbSource.IsOrmInstalled) {
                            // try again in 10 seconds
                            this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - Waiting for ORM to be installed.`;
                            setTimeout(() => this.run(dbSource), 10000);
                            return;
                        }
                        if (debugMode) {
                            if (lastIterationStatusMoment == null || moment().diff(lastIterationStatusMoment, 'minutes') > 5) {
                                lastIterationStatusMoment = moment();
                                this._log.info(`DEBUG STATUS: IsConnected?: ${con && con.connected}`);
                            }
                        }
                        // reconnect if necessary 
                        if (!con || !con.connected) {
                            if (con) {
                                this._log.info("Reconnecting...");
                                con.removeAllListeners();
                            }
                            try {
                                this.progress("New connection pool...");
                                con = yield new sql.ConnectionPool(sqlConfig).connect().catch(e => {
                                    this.progress("Connection pool catch");
                                    this._log.exception(e);
                                    return null;
                                });
                                con.addListener("error", err => {
                                    this.progress("Connection error 002:" + err.toString());
                                    this._log.exception(err);
                                    log_1.SessionLog.error(`Connection error: ${dbSource.Name}. ${this.id}`);
                                    log_1.SessionLog.exception(err);
                                    con = null; /// Make it break lower down
                                    //TODO: kill connection? start over somehow
                                });
                            }
                            catch (err) {
                                this.progress("Connection catch:" + err.toString());
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
                            }
                        }
                        if (con && con.connected) {
                            this.lastConnectedMoment = moment();
                        }
                        else {
                            this.progress("!con");
                            connectionErrorCnt++;
                            let waitMS = Math.min(3000 + (connectionErrorCnt * 3000), 300000 /*Max 5mins between tries*/);
                            this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - Attempt: #${connectionErrorCnt + 1} (waiting for ${waitMS}ms). ` + this.status;
                            this._log.info(this.status);
                            log_1.SessionLog.info(this.status);
                            yield thread_util_1.ThreadUtil.Sleep(waitMS);
                            continue;
                        }
                        connectionErrorCnt = 0;
                        this.progress("About to ask count");
                        let routineCount = yield orm_dal_1.OrmDAL.SprocGenGetRoutineListCnt(con, this.maxRowDate).catch(e => {
                            this._log.exception(e);
                            return -1;
                        });
                        let curRow = 0;
                        this.progress("Got count:" + routineCount);
                        if (routineCount > 0) {
                            last0Cnt = null;
                            log_1.SessionLog.info(`${dbSource.Name}\t${routineCount} change(s) found using row date ${this.maxRowDate}`);
                            this._log.info(`${dbSource.Name}\t${routineCount} change(s) found using row date ${this.maxRowDate}`);
                            this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - ${routineCount} change(s) found using rowdate ${this.maxRowDate}`;
                            yield (new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                                this.progress("Asking for list of changes...");
                                let genGetRoutineListStream = orm_dal_1.OrmDAL.SprocGenGetRoutineListStream(con, this.maxRowDate);
                                this.progress("Got list of changes...");
                                let stillProcessingCnt = 0;
                                let isDone = false;
                                // for every row
                                genGetRoutineListStream.on('row', (row) => __awaiter(this, void 0, void 0, function* () {
                                    this.progress("genGetRoutineListStream row...");
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
                                                let resultSets = yield orm_dal_1.OrmDAL.RoutineGetFmtOnlyResults(con, newCachedRoutine.Schema, newCachedRoutine.Routine, newCachedRoutine.Parameters).catch(e => {
                                                    //this._log.exception(e);
                                                    newCachedRoutine.ResultSetRowver = row.rowver;
                                                    newCachedRoutine.ResultSetError = e.toString();
                                                    return null;
                                                });
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
                                        // HasDefault calculated on sproc-level so no longer need this
                                        // {
                                        //     // PARSE routine body
                                        //     /*if (routineParsingRowver.HasValue && routineParsingRowver >= row.rowver) {
                                        //         //!logLine.Append("Routine body parsing up to date");
                                        //     }
                                        //     else*/
                                        //     {
                                        //         //!logLine.Append("Parsing routine body");
                                        //         //!
                                        //         let routineDefinition: string = null;
                                        //         // TODO: Wrap in try...catch?
                                        //         routineDefinition = await OrmDAL.FetchRoutineDefinition(con, /*dbSource.MetadataConnection.ConnectionStringDecrypted*/
                                        //             dbSource.MetadataConnection.initialCatalog, row.SchemaName, row.RoutineName);
                                        //         if (routineDefinition != null) {
                                        //             let parsed = await RoutineParser.parse(routineDefinition);
                                        //             if (parsed && parsed.Parameters != null && newCachedRoutine.Parameters != null) {
                                        //                 parsed.Parameters.forEach(parsedParm => {
                                        //                     // find corresponding Routine Parameter
                                        //                     let p = newCachedRoutine.Parameters.find(rp => rp.ParameterName.toLowerCase() == parsedParm.VariableName.toLowerCase());
                                        //                     if (p != null) {
                                        //                         //p.DefaultValue = parsedParm.DefaultValue;
                                        //                         //p.DefaultValueType = parsedParm.DefaultValueType;
                                        //                         p.HasDefaultValue = parsedParm.HasDefault;
                                        //                     }
                                        //                 });
                                        //             }
                                        //         }
                                        //         //!logLine.Append(""); // output last duration
                                        //     }
                                        // }
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
                                    //?genGetRoutineListStream.removeAllListeners();
                                    this.progress("genGetRoutineListStream error...");
                                    this._log.error(err.toString());
                                    log_1.SessionLog.error(`${dbSource.Name}: ${err.toString()}`);
                                    console.error(err);
                                    reject(err);
                                });
                                genGetRoutineListStream.on('done', (affected) => {
                                    isDone = true;
                                    this.progress('genGetRoutineListStream done');
                                    dbSource.saveCache();
                                    if (genGetRoutineListStream)
                                        genGetRoutineListStream.removeAllListeners();
                                });
                                /*
                                    The following loop waits for all the routines to finish processing.
                                */
                                while (true) {
                                    this.progress('while(true)');
                                    if (isDone) {
                                        if (genGetRoutineListStream)
                                            genGetRoutineListStream.removeAllListeners();
                                        genGetRoutineListStream = null;
                                        // TODO : add timeout here but only once we've reached the done event
                                        if (stillProcessingCnt <= 0) {
                                            resolve();
                                            break;
                                        }
                                    }
                                    yield thread_util_1.ThreadUtil.Sleep(200);
                                }
                            }))).catch(e => {
                                this._log.exception(e);
                            }); // await Promise...
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
                                    this.progress('Generating ' + jsFile.Filename);
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
                        this.progress('While loop catch');
                        this._log.error("Reached while loop catch handler");
                        this._log.exception(e);
                        log_1.SessionLog.error("Reached while loop catch handler");
                        log_1.SessionLog.exception(e);
                    }
                    finally {
                        // close the connection each time to take care of memory leak problems that I just cannot resolve :-/
                        if (con && con.connected) {
                            con.removeAllListeners();
                            //!console.log("Closing connection for:", dbSource.Name)
                            con.close();
                            con = null;
                        }
                    }
                    yield thread_util_1.ThreadUtil.Sleep(settings_instance_1.SettingsInstance.Instance.Settings.DbSource_CheckForChangesInMilliseconds);
                } // while IsRunning
                if (con && con.connected) {
                    con.removeAllListeners();
                    con.close();
                }
            }
            catch (e) {
                this.progress('main catch');
                this.isRunning = false;
                this._log.exception(e);
                log_1.SessionLog.exception(e);
                this.status = "main catch - " + e.toString();
            }
            finally {
                log_1.SessionLog.info(`Exiting...${dbSource.Name}, ${this.id}`);
                this._log.info(`Exiting...${dbSource.Name}, ${this.id}`);
                console.info(`Exiting...${dbSource.Name}, ${this.id}`);
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
exports.Worker = Worker;
//# sourceMappingURL=worker.js.map