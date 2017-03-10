import { SessionLog } from './../util/log'
import { ThreadUtil } from './../util/thread-util'
import { SettingsInstance } from './../settings/settings-instance'
import { DatabaseSource } from './../settings/object-model'
import { CachedRoutine } from './../settings/object-model/cache/cached-routine'
import { RoutineParameter } from './../settings/object-model/cache/routine-parameter'
import { OrmDAL } from '../database/orm-dal'

import * as async from 'async'
import * as sql from 'mssql';

import * as xml2js from 'xml2js'

export class WorkSpawner {
    private static _workerList: Worker[];

    public static Start() {
        try {
            let dbSources = SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources).reduce((prev, next) => { return prev.concat(next); });

            WorkSpawner._workerList = [];

            dbSources = [dbSources[0]]; //TEMP 

            async.each(dbSources, (source) => {

                let worker = new Worker();

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
    private maxRowDate: number = 994743824;
    private _status: string;

    public get status(): string { return this._status; }
    public set status(val: string) { this._status = val; }

    public stop() {
        this.isRunning = false;
    }

    public async run(dbSource: DatabaseSource) {
        this.isRunning = true;

        let lastSavedDate: Date = new Date();

        var sqlConfig = {
            user: dbSource.userID,
            password: dbSource.password,
            server: dbSource.dataSource,
            database: dbSource.initialCatalog,
            stream: false,
            options: {
                encrypt: true
            }
        }

let x:number = 0;
        while (this.isRunning) {

            if (!dbSource.IsOrmInstalled) {
                // try again in 2 seconds
                this.status = `Waiting for ORM to be installed.`;
                setTimeout(() => this.run(dbSource), 2000);
                return;
            }

            let con: sql.Connection = <sql.Connection>await new sql.Connection(sqlConfig).connect().catch(err => {
                // TODO: Handle connection error
                SessionLog.error(err.toString());
                console.log("connection error", err);
            });


            //SessionLog.info(`${dbSource.Name} connected successfully.`);

            try {
                let routineCount = await OrmDAL.SprocGenGetRoutineListCnt(con, this.maxRowDate);
                let curRow: number = 0;

                if (routineCount > 0) {
x++;
                    SessionLog.info(`${x}. ${dbSource.Name}\t${routineCount} change(s) found using row date ${this.maxRowDate}`)
                    this.status = `${routineCount} change(s) found using rowdate ${this.maxRowDate}`;

                    await new Promise<any>(async (resolve, reject) => {

                        let genGetRoutineListStream = OrmDAL.SprocGenGetRoutineListStream(con, this.maxRowDate);

                        let stillProcessingCnt: number = 0;
                        let isDone: boolean = false;

                        // for every row
                        genGetRoutineListStream.on('row', async (row) => {

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

                            console.log(this.status);

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
                                        let resultSets: any = await OrmDAL.RoutineGetFmtOnlyResults(con, newCachedRoutine.Schema, newCachedRoutine.Routine, newCachedRoutine.Parameters);

                                        if (resultSets) {
                                            newCachedRoutine.ResultSetMetadata = resultSets;
                                        }
                                        else {
                                            console.log("\t(no results) ", newCachedRoutine.Routine);
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

                            if (!this.maxRowDate || row.rowver > this.maxRowDate) {
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

                } // if (routineCount > 0) 

            }
            catch (e) {
                console.log("or catch here?", e.toString());
            }

            await ThreadUtil.Sleep(SettingsInstance.Instance.Settings.DbSource_CheckForChangesInMilliseconds);
        }

    }
}