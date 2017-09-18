"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./../util/log");
const settings_instance_1 = require("./../settings/settings-instance");
const fs = require("fs");
const moment = require("moment");
const exception_logger_1 = require("./../util/exception-logger");
const worker_1 = require("./worker");
class WorkSpawner {
    static memDetail() {
        return {
            Cnt: WorkSpawner._workerList.length,
            //TotalMemBytes: sizeof(WorkSpawner._workerList), 
            Workers: WorkSpawner._workerList.map(w => w.memDetail())
        };
    }
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
    static Stop() {
        clearTimeout(WorkSpawner.monitorTimer);
        WorkSpawner.monitorTimer = null;
    }
    static Start() {
        try {
            let dbSources = settings_instance_1.SettingsInstance.Instance.ProjectList
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
                    let worker = new worker_1.Worker();
                    worker.dbSourceKey = source.CacheKey;
                    worker.name = source.Name;
                    worker.description = `${source.dataSource}; ${source.initialCatalog} `;
                    console.log(`Spawning new worker for ${source.Name}`);
                    WorkSpawner._workerList.push(worker);
                    worker.run(source).catch(err => {
                        console.log("Havent caught this one yet!!!!");
                        console.error(err);
                        log_1.SessionLog.exception(err);
                    });
                }
                catch (e) {
                    exception_logger_1.ExceptionLogger.logException(e);
                    console.log(e.toString());
                }
            });
            WorkSpawner.monitor();
            // }, error => {
            //     SessionLog.error(error.toString());
            // });
        }
        catch (e) {
            log_1.SessionLog.exception(e);
            console.error(e);
        }
    } // Start
    static monitor() {
        // look for any zombie workers
        // restart them if necessary
        if (this._workerList) {
            let zombieWorkers = this._workerList.filter(wl => !wl.isForcedStopped && moment().diff(wl.lastConnectedMoment, 'seconds') > 180);
            if (zombieWorkers && zombieWorkers.length > 0) {
                zombieWorkers.forEach(zombie => {
                    let replacementWorker = new worker_1.Worker();
                    let oldId = zombie.id;
                    zombie.copyInto(replacementWorker);
                    zombie.dispose();
                    replacementWorker.recordReplacement(oldId);
                    let ix = WorkSpawner._workerList.indexOf(zombie);
                    WorkSpawner._workerList.splice(ix, 1, replacementWorker);
                    replacementWorker.run(replacementWorker.dbSource).catch(err => {
                        console.log("Havent caught this one yet!!!!");
                        console.error(err);
                        log_1.SessionLog.exception(err);
                    });
                });
            }
        }
        WorkSpawner.monitorTimer = setTimeout(() => this.monitor(), 3000);
    }
}
exports.WorkSpawner = WorkSpawner;
//# sourceMappingURL=work-spawner.js.map