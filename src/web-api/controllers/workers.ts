import { ApiResponse } from './../api-response'
import { SettingsInstance } from './../../settings/settings-instance'
import { route } from './../decorators'
import { Request, Response } from "express";
import { WorkSpawner } from "./../../generator/work-spawner";
import { SessionLog } from "./../../util/log";

export class WorkersController {

    @route("/api/workers")
    public static getAllWokers(req: Request, res: Response): ApiResponse {
        try {
            let ret = WorkSpawner.workerList.map(wl => {
                return {
                    id: wl.id,
                    name: wl.name,
                    desc: wl.description,
                    status: wl.status,
                    lastProgress: wl.lastProgress,
                    lastProgressMoment: wl.lastProgressMoment,
                    isRunning: wl.running
                };
            });

            return ApiResponse.Payload(ret);
        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }

    }

    @route('/api/workers/:id')
    public static getWorkerLog(req: Request, res: Response): ApiResponse {
        let workerName = req.params.id;
        let worker = WorkSpawner.getWorker(workerName);

        if (worker) {
            return ApiResponse.Payload(worker.log.Entries);
        }
        else {
            return ApiResponse.Payload(null);
        }
    }

    @route('/api/workers/:id/start', { post: true })
    public static startWorker(req: Request, res: Response): ApiResponse {
        try {
            let id = req.params.id;
            let worker = WorkSpawner.getWorkerById(id);

            if (worker) {
                worker.start();
                return ApiResponse.Success();
            }
            else {
                return ApiResponse.ExclamationModal(`Failed to find specified worker: ${id}`);
            }
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }
    }

    @route('/api/workers/:id/stop', { post: true })
    public static stopWorker(req: Request, res: Response): ApiResponse {
        try {
            let id = req.params.id;
            let worker = WorkSpawner.getWorkerById(id);

            if (worker) {
                worker.stop();
                return ApiResponse.Success();
            }
            else {
                return ApiResponse.ExclamationModal(`Failed to find specified worker: ${id}`);
            }
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }

    }
}

