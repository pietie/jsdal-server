import { ApiResponse } from './../api-response'
import { route } from './../decorators'
import * as os from 'os'
import { SessionLog } from "./../../util/log";
import { UserManagement } from "./../../util/user-management";
import { Request, Response } from "express";
import * as sizeof from 'object-sizeof';
import { ExceptionLogger } from "./../../util/exception-logger";
import { WorkSpawner } from "./../../generator/work-spawner";

export class MainController {

    @route('/api/main/memdetail', { get: true }, true, true)
    public static getMemDetail(req: Request, res: Response): ApiResponse {
        try {
            let memDetail =
                {
                    ExceptionLogger: ExceptionLogger.memDetail(),
                    Workers: WorkSpawner.memDetail(),
                    SessionLog: SessionLog.memDetail()
                }

            return ApiResponse.Payload(memDetail);
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }
    }


    @route('/api/main/issetupcomplete', { get: true }, true)
    public static isFirstTimeSetupComplete(req: Request, res: Response): ApiResponse {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
        res.setHeader("Content-Type", "application/json");

        return ApiResponse.Payload(UserManagement.adminUserExists);
    }

    @route('/api/main/1sttimesetup', { post: true }, true)
    public static performFirstTimeSetup(req: Request, res): ApiResponse {
        if (req.body.adminUser) {
            UserManagement.addUser({ username: req.body.adminUser.username, password: req.body.adminUser.password, isAdmin: true });
            UserManagement.saveToFile();
        }

        return ApiResponse.Success();
    }

    @route('/api/main/stats')
    public static getStats(): ApiResponse {
        let mu = process.memoryUsage();

        let now = new Date();
        let startDate = new Date(now.getTime() - (process.uptime() * 1000));

        return ApiResponse.Payload({
            WebServerStartDate: startDate,
            Performance: {
                Resident: mu.rss,
                HeapTotal: mu.heapTotal,
                HeapUsed: mu.heapUsed,
                WorkingSet: mu.rss // obsolete
            },
            TickCount: 0 // not supported on nodejs
        });
    }

    @route('/api/main/sessionlog')
    public static getSessionLog(): ApiResponse {
        return ApiResponse.Payload(SessionLog.entries);
    }

    /*
         [HttpGet]
            [Route("api/main/sessionlog")]
            public IEnumerable<LogEntry> GetSessionLog()
            {
                var ar = SessionLog.Entries.ToArray();
                return ar;
            }*/
}