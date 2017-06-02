import { ApiResponse } from './../api-response'
import { route } from './../decorators'
import * as os from 'os'
import { SessionLog } from "./../../util/log";
import { UserManagement } from "./../../util/user-management";
import { Request } from "@types/express";

export class MainController {

    @route('/api/main/issetupcomplete', { get: true }, true)
    public static isFirstTimeSetupComplete(): ApiResponse {
        return ApiResponse.Payload(UserManagement.adminUserExists);
    }

    @route('/api/main/1sttimesetup', { post: true }, true)
    public static performFirstTimeSetup(req: Request, res): ApiResponse {
        //return ApiResponse.Payload(UserManagement.adminUserExists);
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