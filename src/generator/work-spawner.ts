import { SessionLog, MemoryLog } from './../util/log'
import { ThreadUtil } from './../util/thread-util'
import { SettingsInstance } from './../settings/settings-instance'
import { DatabaseSource, JsFile } from './../settings/object-model'
import { CachedRoutine } from './../settings/object-model/cache/cached-routine'
import { RoutineParameter, ResultsetMetadata } from './../settings/object-model/cache/routine-parameter'
import { OrmDAL } from '../database/orm-dal'

import { JsFileGenerator } from './js-generator'

//import * as async from 'async'
import * as sql from 'mssql';
import * as fs from 'fs';
import * as shortid from 'shortid';
import * as sizeof from 'object-sizeof';

import * as xml2js from 'xml2js'
import * as moment from 'moment';

import { SqlConfigBuilder } from "./../util/sql-config-builder";
import { ExceptionLogger } from "./../util/exception-logger";
import { RoutineParser } from "./routine-parser";

export class WorkSpawner {
    private static _workerList: Worker[];

    public static TEMPLATE_RoutineContainer: string;
    public static TEMPLATE_Routine: string;
    public static TEMPLATE_TypescriptDefinitions: string;

    public static memDetail(): any {
        return {
            Cnt: WorkSpawner._workerList.length, 
            //TotalMemBytes: sizeof(WorkSpawner._workerList), 
            Workers: WorkSpawner._workerList.map(w => w.memDetail())
        };
    }

    public static resetMaxRowDate(dbSource: DatabaseSource) {
        let worker = WorkSpawner._workerList.find(wl => wl.dbSourceKey == dbSource.CacheKey);

        if (worker) worker.resetMaxRowDate();
    }

    public static getWorker(name: string): Worker {
        return WorkSpawner._workerList.find(wl => wl.name == name);
    }
    public static getWorkerById(id: string): Worker {
        return WorkSpawner._workerList.find(wl => wl.id == id);
    }

    public static get workerList(): Worker[] {
        return WorkSpawner._workerList;
    }

    public static Start() {
        try {
            let dbSources = SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources).reduce((prev, next) => { return prev.concat(next); });

            WorkSpawner.TEMPLATE_RoutineContainer = fs.readFileSync('./resources/RoutineContainerTemplate.txt', { encoding: "utf8" });
            WorkSpawner.TEMPLATE_Routine = fs.readFileSync('./resources/RoutineTemplate.txt', { encoding: "utf8" });
            WorkSpawner.TEMPLATE_TypescriptDefinitions = fs.readFileSync('./resources/TypeScriptDefinitionsContainer.d.ts', { encoding: "utf8" });

            WorkSpawner._workerList = [];

            //dbSources = [dbSources[3]]; //TEMP 

            //async.each(dbSources, (source) => {
            dbSources.forEach(source => {

                try {
                    let worker = new Worker();

                    worker.dbSourceKey = source.CacheKey;
                    worker.name = source.Name;
                    worker.description = `${source.dataSource}; ${source.initialCatalog} `;

                    console.log(`Spawning new worker for ${source.Name}`);
                    WorkSpawner._workerList.push(worker);

                    worker.run(source);
                } catch (e) {
                    ExceptionLogger.logException(e);
                    console.log(e.toString());
                }
            });

            // }, error => {
            //     SessionLog.error(error.toString());
            // });
        }
        catch (e) {
            SessionLog.exception(e);
            console.error(e);
        }

    }
}

class Worker {
    private isRunning: boolean = false;
    private maxRowDate: number = 0;
    private _status: string;

    private _id: string;
    private _dbSource: DatabaseSource;

    private _log: MemoryLog;

    public get id(): string { return this._id; }
    public get running(): boolean { return this.isRunning; }
    public dbSourceKey: string;
    public name: string;
    public description: string;

    public get status(): string { return this._status; }
    public set status(val: string) { this._status = val; }

    public get log(): MemoryLog { return this._log; }

    constructor() {
        this._id = shortid.generate();
        this._log = new MemoryLog(300);
    }

    public memDetail(): any {
        return {
            Name: this.name,
            // This: sizeof(this),
            Log: this._log.memDetail()
            //LastCon: this._lastCon != null? sizeof(this._lastCon): 0
        };
    }

    public resetMaxRowDate() {
        this.maxRowDate = 0;
        this._log.info("MaxRowDate reset to 0.");
    }

    public start() {
        if (this.isRunning) return;

        this.status = "Starting up...";
        this._log.info("Worker started by user.");

        this.run(this._dbSource);
    }

    public stop() {
        this.isRunning = false;
        this.status = "Stopped.";
        this._log.info("Worker stopped by user.");
    }

    private _lastCon: sql.ConnectionPool;
    public async run(dbSource: DatabaseSource) {
        this._dbSource = dbSource;
        this.isRunning = true;

        let lastSavedDate: Date = new Date();

        let sqlConfig = SqlConfigBuilder.build(dbSource);

        var cache = dbSource.cache;

        if (cache != null && cache.length > 0) {
            this.maxRowDate = Math.max(...cache.map(c => c.RowVer));
            SessionLog.info(`${dbSource.Name}\tMaxRowDate from cache = ${this.maxRowDate}`);
            this._log.info(`${dbSource.Name}\tMaxRowDate from cache = ${this.maxRowDate}`);
        }

        let connectionErrorCnt: number = 0;
        let con: sql.ConnectionPool;

        let last0Cnt: moment.Moment = null;

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

                    if (con) {
                        this._log.info("Reconnecting...");
                        con.removeAllListeners();
                        this._lastCon = null;
                    }

                    //console.log('\tConnecting to...', sqlConfig.server, sqlConfig.database);

                    con = <sql.ConnectionPool>await new sql.ConnectionPool(sqlConfig).connect().catch(err => {

                        this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - Failed to open connection to database: ` + err.toString();
                        SessionLog.error(`Failed to open conneciton to database. ${sqlConfig.server}->${sqlConfig.database}`);

                        if (err.message == null) err.message = "";

                        let config: any = {};
                        Object.assign(config, sqlConfig);

                        delete config.password;

                        err.message += "; debug:" + JSON.stringify(config);

                        SessionLog.exception(err);

                        this._log.error(`Failed to open conneciton to database. ${sqlConfig.server}->${sqlConfig.database}`);
                        this._log.exception(err);
                    });

                    this._lastCon = con;
                }

                if (!con) {
                    connectionErrorCnt++;

                    let waitMS = Math.min(3000 + (connectionErrorCnt * 3000), 300000/*Max 5mins between tries*/);

                    this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - Attempt: #${connectionErrorCnt + 1} (waiting for ${waitMS}ms). ` + this.status;

                    this._log.info(this.status);

                    await ThreadUtil.Sleep(waitMS);
                    continue;
                }

                connectionErrorCnt = 0;

                let routineCount = await OrmDAL.SprocGenGetRoutineListCnt(con, this.maxRowDate);
                let curRow: number = 0;

                if (routineCount > 0) {

                    last0Cnt = null;

                    SessionLog.info(`${dbSource.Name}\t${routineCount} change(s) found using row date ${this.maxRowDate}`);
                    this._log.info(`${dbSource.Name}\t${routineCount} change(s) found using row date ${this.maxRowDate}`);
                    this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - ${routineCount} change(s) found using rowdate ${this.maxRowDate}`;

                    await new Promise<any>(async (resolve, reject) => {

                        let genGetRoutineListStream = OrmDAL.SprocGenGetRoutineListStream(con, this.maxRowDate);

                        let stillProcessingCnt: number = 0;
                        let isDone: boolean = false;

                        // for every row
                        genGetRoutineListStream.on('row', async (row) => {

                            if (routineCount == 1) {
                                this._log.info(`(single change) ${dbSource.Name}\t[${row.SchemaName}].[${row.RoutineName}]`);
                            }

                            stillProcessingCnt++;

                            let newCachedRoutine = new CachedRoutine();

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
                                        let newParm = RoutineParameter.createFromJson(result.Routine.Parameter[e]);

                                        newCachedRoutine.Parameters.push(newParm);
                                    }
                                }
                            });

                            curRow++;
                            let perc = (curRow / routineCount) * 100.0;

                            this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - ${dbSource.Name} - Overall progress: (${perc.toFixed(2)}%. Currently processing [${row.SchemaName}].[${row.RoutineName}]`;//, schema, name, perc);

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
                                        let resultSets: any = await OrmDAL.RoutineGetFmtOnlyResults(con,
                                            newCachedRoutine.Schema,
                                            newCachedRoutine.Routine,
                                            newCachedRoutine.Parameters);

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
                            if (new Date().getTime() - lastSavedDate.getTime() >= 20000/*ms*/) {
                                lastSavedDate = new Date();

                                dbSource.saveCache();
                            }

                            if (this.maxRowDate == null || row.rowver > this.maxRowDate) {
                                this.maxRowDate = parseInt(row.rowver);
                            }

                            stillProcessingCnt--;

                        }); // "on row"

                        genGetRoutineListStream.on('error', (err) => {
                            // May be emitted multiple times
                            console.error(err);
                            reject(err);
                        });

                        genGetRoutineListStream.on('done', (affected) => {
                            isDone = true;

                            dbSource.saveCache();

                            genGetRoutineListStream.removeAllListeners();
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

                            await ThreadUtil.Sleep(200);
                        }


                    }); // await Promise...


                    // processing of found changes complete...
                    {
                        // call save for final changes 
                        dbSource.saveCache();
                        this.generateOutputFiles(dbSource);
                    }


                } // if (routineCount > 0) 
                else {
                    if (last0Cnt == null) last0Cnt = moment();

                    // only update status if we've been receiving 0 changes for a while
                    if (moment().diff(last0Cnt, 'seconds') > 30) {
                        this.status = `${moment().format("YYYY-MM-DD HH:mm:ss")} - no changes found`;
                    }

                    // handle the case where the output files no longer exist but we have also not seen any changes on the DB again
                    dbSource.JsFiles.forEach(jsFile => {
                        let path = dbSource.outputFilePath(jsFile);

                        if (!fs.existsSync(path)) {
                            JsFileGenerator.generateJsFile(dbSource, jsFile);

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
                if (e.number == 2812/*Could not find SPROC*/) {
                    dbSource.IsOrmInstalled = false; // something is missing, need to reinstall
                }

                SessionLog.error("reached catch handler ref: ab123");
                SessionLog.exception(e);
                console.log("or catch here?", e.toString());
            }
            finally {
                //if (con && con.connected) con.close();
            }

            await ThreadUtil.Sleep(SettingsInstance.Instance.Settings.DbSource_CheckForChangesInMilliseconds);
        }

        if (con && con.connected) {
            con.removeAllListeners();
            con.close();
        }

    }

    private generateOutputFiles(dbSource: DatabaseSource) {
        try {
            dbSource.JsFiles.forEach(jsFile => {
                JsFileGenerator.generateJsFile(dbSource, jsFile);

                //!this.IsRulesDirty = false;
                //!this.IsOutputFilesDirty = false;
                dbSource.LastUpdateDate = new Date();
            });
        }
        catch (ex) {
            SessionLog.exception(ex);
            console.error(ex);
        }
    }



}