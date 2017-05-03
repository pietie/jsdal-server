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
const async = require("async");
const sql = require("mssql");
const xml2js = require("xml2js");
class WorkSpawner {
    static Start() {
        try {
            let dbSources = settings_instance_1.SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources).reduce((prev, next) => { return prev.concat(next); });
            WorkSpawner._workerList = [];
            dbSources = [dbSources[0]]; //TEMP 
            async.each(dbSources, (source) => {
                let worker = new Worker();
                console.log(`Spawning new worker for ${source.Name}`);
                WorkSpawner._workerList.push(worker);
                worker.run(source);
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
    }
    get status() { return this._status; }
    set status(val) { this._status = val; }
    stop() {
        this.isRunning = false;
    }
    run(dbSource) {
        return __awaiter(this, void 0, void 0, function* () {
            this.isRunning = true;
            let lastSavedDate = new Date();
            var sqlConfig = {
                user: dbSource.userID,
                password: dbSource.password,
                server: dbSource.dataSource,
                database: dbSource.initialCatalog,
                stream: false,
                options: {
                    encrypt: true
                }
            };
            var cache = dbSource.cache;
            if (cache != null && cache.length > 0) {
                this.maxRowDate = Math.max(...cache.map(c => c.RowVer));
                log_1.SessionLog.info(`${dbSource.Name}\tMaxRowDate from cache = ${this.maxRowDate}`);
            }
            let x = 0;
            while (this.isRunning) {
                if (!dbSource.IsOrmInstalled) {
                    // try again in 2 seconds
                    this.status = `Waiting for ORM to be installed.`;
                    console.log(this.status);
                    setTimeout(() => this.run(dbSource), 2000);
                    return;
                }
                let con = yield new sql.Connection(sqlConfig).connect().catch(err => {
                    // TODO: Handle connection error
                    log_1.SessionLog.error(err.toString());
                    console.log("connection error", err);
                });
                //SessionLog.info(`${dbSource.Name} connected successfully.`);
                try {
                    let routineCount = yield orm_dal_1.OrmDAL.SprocGenGetRoutineListCnt(con, this.maxRowDate);
                    let curRow = 0;
                    if (routineCount > 0) {
                        x++;
                        log_1.SessionLog.info(`${x}. ${dbSource.Name}\t${routineCount} change(s) found using row date ${this.maxRowDate}`);
                        this.status = `${routineCount} change(s) found using rowdate ${this.maxRowDate}`;
                        yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                            let genGetRoutineListStream = orm_dal_1.OrmDAL.SprocGenGetRoutineListStream(con, this.maxRowDate);
                            let stillProcessingCnt = 0;
                            let isDone = false;
                            // for every row
                            genGetRoutineListStream.on('row', (row) => __awaiter(this, void 0, void 0, function* () {
                                stillProcessingCnt++;
                                let newCachedRoutine = new cached_routine_1.CachedRoutine();
                                newCachedRoutine.Routine = row.RoutineName;
                                newCachedRoutine.Schema = row.SchemaName;
                                newCachedRoutine.Type = row.RoutineType;
                                newCachedRoutine.IsDeleted = row.IsDeleted;
                                newCachedRoutine.Parameters = [];
                                newCachedRoutine.RowVer = row.rowver;
                                newCachedRoutine.ResultSetRowver = row.ResultSetRowver;
                                newCachedRoutine.RoutineParsingRowver = row.RoutineParsingRowver;
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
                                this.status = `${dbSource.Name} - Overall progress: (${perc.toFixed(2)}%. Currently processing [${row.SchemaName}].[${row.RoutineName}]`; //, schema, name, perc);
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
                                } // !IsDeleted
                                dbSource.addToCache(row.rowver, newCachedRoutine);
                                // TODO: Make saving gap configurable?
                                if (new Date().getTime() - lastSavedDate.getTime() >= 20000 /*ms*/) {
                                    lastSavedDate = new Date();
                                    dbSource.saveCache();
                                }
                                if (this.maxRowDate == null || row.rowver > this.maxRowDate) {
                                    this.maxRowDate = row.rowver;
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
                            console.log("PROMISE done. Always save here? call generate here?");
                        }
                    } // if (routineCount > 0) 
                }
                catch (e) {
                    console.log("or catch here?", e.toString());
                }
                yield thread_util_1.ThreadUtil.Sleep(settings_instance_1.SettingsInstance.Instance.Settings.DbSource_CheckForChangesInMilliseconds);
            }
        });
    }
}
//# sourceMappingURL=work-spawner.js.map