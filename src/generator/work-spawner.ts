import { SessionLog, MemoryLog } from './../util/log'
import { ThreadUtil } from './../util/thread-util'
import { SettingsInstance } from './../settings/settings-instance'
import { DatabaseSource, JsFile } from './../settings/object-model'
import { CachedRoutine } from './../settings/object-model/cache/cached-routine'
import { RoutineParameter, ResultsetMetadata } from './../settings/object-model/cache/routine-parameter'
import { OrmDAL } from '../database/orm-dal'

import { JsFileGenerator } from './js-generator'

import * as async from 'async'
import * as sql from 'mssql';
import * as fs from 'fs';
import * as shortid from 'shortid';

import * as xml2js from 'xml2js'

export class WorkSpawner {
    private static _workerList: Worker[];

    public static TEMPLATE_RoutineContainer: string;
    public static TEMPLATE_Routine: string;
    public static TEMPLATE_TypescriptDefinitions: string;

    public static getWorker(name: string): Worker {
        return WorkSpawner._workerList.find(wl => wl.name == name);
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

            //dbSources = [dbSources[2]]; //TEMP 

            async.each(dbSources, (source) => {

                let worker = new Worker();

                worker.name = source.Name;
                worker.description = `${source.dataSource}; ${source.initialCatalog} `;

                console.log(`Spawning new worker for ${source.Name}`);
                WorkSpawner._workerList.push(worker);

                worker.run(source);
            }, error => {
                SessionLog.error(error.toString());
            });
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

    private _log: MemoryLog;

    public get id(): string { return this._id; }
    public get running(): boolean { return this.isRunning; }
    public name: string;
    public description: string;

    public get status(): string { return this._status; }
    public set status(val: string) { this._status = val; }

    public get log(): MemoryLog { return this._log; }

    constructor() {
        this._id = shortid.generate();
        this._log = new MemoryLog();
    }

    public stop() {
        this.isRunning = false;
    }

    public async run(dbSource: DatabaseSource) {
        this.isRunning = true;

        let lastSavedDate: Date = new Date();

        let sqlConfig: sql.config = {
            user: dbSource.userID,
            password: dbSource.password,
            server: dbSource.dataSource,
            database: dbSource.initialCatalog,
            connectionTimeout: 1000 * 60, //TODO:make configurable
            requestTimeout: 1000 * 60,//TODO:make configurable
            stream: false,
            options: {
                encrypt: true
            }
        }

        var cache = dbSource.cache;

        if (cache != null && cache.length > 0) {
            this.maxRowDate = Math.max(...cache.map(c => c.RowVer));
            SessionLog.info(`${dbSource.Name}\tMaxRowDate from cache = ${this.maxRowDate}`);
            this._log.info(`${dbSource.Name}\tMaxRowDate from cache = ${this.maxRowDate}`);
        }

        let connectionErrorCnt: number = 0;
        let con: sql.ConnectionPool;

        while (this.isRunning) {

            if (!dbSource.IsOrmInstalled) {
                // try again in 10 seconds
                this.status = `Waiting for ORM to be installed.`;
                setTimeout(() => this.run(dbSource), 10000);
                return;
            }


            try {

                // reconnect if necessary 
                if (!con || !con.connected) {
                    con = <sql.ConnectionPool>await new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                        this.status = "Failed to open connection to database: " + err.toString();
                        SessionLog.error("Failed to open conneciton to database.");
                        SessionLog.exception(err);

                        this._log.error("Failed to open conneciton to database.");
                        this._log.exception(err);

                        console.log("connection error", err);
                    });
                }

                if (!con) {
                    connectionErrorCnt++;

                    let waitMS = Math.min(3000 + (connectionErrorCnt * 3000), 300000/*Max 5mins between tries*/);

                    this.status = `Attempt: #${connectionErrorCnt + 1} (waiting for ${waitMS}ms). ` + this.status;

                    await ThreadUtil.Sleep(waitMS);
                    continue;
                }

                connectionErrorCnt = 0;

                let routineCount = await OrmDAL.SprocGenGetRoutineListCnt(con, this.maxRowDate);
                let curRow: number = 0;

                if (routineCount > 0) {
                    SessionLog.info(`${dbSource.Name}\t${routineCount} change(s) found using row date ${this.maxRowDate}`)
                    this.status = `${routineCount} change(s) found using rowdate ${this.maxRowDate}`;


                    await new Promise<any>(async (resolve, reject) => {

                        let genGetRoutineListStream = OrmDAL.SprocGenGetRoutineListStream(con, this.maxRowDate);

                        let stillProcessingCnt: number = 0;
                        let isDone: boolean = false;

                        // for every row
                        genGetRoutineListStream.on('row', async (row) => {

                            //if (routineCount < 2) {
                            //   SessionLog.info(`\t${dbSource.Name}\t[${row.SchemaName}].[${row.RoutineName}] changed.`)
                            //}

                            stillProcessingCnt++;

                            let newCachedRoutine = new CachedRoutine();

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
                                        let newParm = RoutineParameter.createFromJson(result.Routine.Parameter[e]);

                                        newCachedRoutine.Parameters.push(newParm);
                                    }
                                }
                            });

                            curRow++;
                            let perc = (curRow / routineCount) * 100.0;

                            this.status = `${dbSource.Name} - Overall progress: (${perc.toFixed(2)}%. Currently processing [${row.SchemaName}].[${row.RoutineName}]`;//, schema, name, perc);


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

                            } // !IsDeleted


                            dbSource.addToCache(row.rowver, newCachedRoutine);

                            // TODO: Make saving gap configurable?
                            if (new Date().getTime() - lastSavedDate.getTime() >= 20000/*ms*/) {
                                lastSavedDate = new Date();

                                dbSource.saveCache();
                            }

                            if (this.maxRowDate == null || row.rowver > this.maxRowDate) {
                                this.maxRowDate = row.rowver;
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
                /* TODO: !!
                                if (this.IsRulesDirty || this.IsOutputFilesDirty) {
                                    if (this.IsRulesDirty) Console.WriteLine("{0}\tRules changed", this.DatabaseSource.CacheKey);
                                    if (this.IsOutputFilesDirty) Console.WriteLine("{0}\tOutput files changed", this.DatabaseSource.CacheKey);
                
                                    GenerateOutputFiles();
                                }
                                */
            }
            catch (e) {
                SessionLog.error("reached catch handler ref: ab123");
                SessionLog.exception(e);
                console.log("or catch here?", e.toString());
            }

            await ThreadUtil.Sleep(SettingsInstance.Instance.Settings.DbSource_CheckForChangesInMilliseconds);
        }

        if (con && con.connected) {
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