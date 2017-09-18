import { DatabaseSource, JsFile } from './../settings/object-model';
import { SessionLog, MemoryLog } from './../util/log';
import { SettingsInstance } from './../settings/settings-instance';

import * as fs from 'fs';
import * as sizeof from 'object-sizeof';
import * as moment from 'moment';

import { ExceptionLogger } from "./../util/exception-logger";

import { Worker } from './worker';

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

    public static Stop() {
        clearTimeout(WorkSpawner.monitorTimer);
        WorkSpawner.monitorTimer = null;
    }

    public static Start() {
        try {
            let dbSources = SettingsInstance.Instance.ProjectList
                .map(p => p.DatabaseSources)
                .reduce((prev, next) => { return prev.concat(next); });

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

                    worker.run(source).catch(err => {
                        console.log("Havent caught this one yet!!!!");
                        console.error(err);
                        SessionLog.exception(err);

                    });
                } catch (e) {
                    ExceptionLogger.logException(e);
                    console.log(e.toString());
                }
            });

            WorkSpawner.monitor();

            // }, error => {
            //     SessionLog.error(error.toString());
            // });
        }
        catch (e) {
            SessionLog.exception(e);
            console.error(e);
        }

    } // Start

    private static monitorTimer: NodeJS.Timer;
    private static monitor() {

        // look for any zombie workers
        // restart them if necessary
        if (this._workerList) {

            let zombieWorkers = this._workerList.filter(wl => !wl.isForcedStopped && moment().diff(wl.lastConnectedMoment, 'seconds') > 180);

            if (zombieWorkers && zombieWorkers.length > 0) {

                zombieWorkers.forEach(zombie => {
                    let replacementWorker = new Worker();

                    let oldId:string = zombie.id;

                    zombie.copyInto(replacementWorker);
                    zombie.dispose();

                    replacementWorker.recordReplacement(oldId);

                    let ix = WorkSpawner._workerList.indexOf(zombie);
                    
                    WorkSpawner._workerList.splice(ix, 1, replacementWorker);

                    replacementWorker.run(replacementWorker.dbSource).catch(err => {
                        console.log("Havent caught this one yet!!!!");
                        console.error(err);
                        SessionLog.exception(err);

                    });
                });
            }

        }


        WorkSpawner.monitorTimer = setTimeout(() => this.monitor(), 3000);
    }
}

