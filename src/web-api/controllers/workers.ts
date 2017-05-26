import { ApiResponse } from './../api-response'
import { SettingsInstance } from './../../settings/settings-instance'
import { route } from './../decorators'
import { Request, Response } from "@types/express";
import { WorkSpawner } from "./../../generator/work-spawner";
import { SessionLog } from "./../../util/log";

export class WorkersController {

    @route("/api/workers")
    public static getAllWokers(req: Request, res: Response): ApiResponse {
        try {
            let ret = WorkSpawner.workerList.map(wl=>{ return { id: wl.id, name: wl.name, desc: wl.description, status: wl.status, isRunning: wl.running }; });

            return ApiResponse.Payload(ret);
        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }

    }

    @route('/api/workers/:id')
    public static getWorkerLog(req: Request, res: Response) : ApiResponse
    {

        let workerName = req.params.id;

        return ApiResponse.Payload(SessionLog.entries);
    }
}

