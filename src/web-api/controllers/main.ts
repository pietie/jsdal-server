import { ApiResponse } from './../api-response'
import { route } from  './../decorators'
import * as os from 'os'

export class MainController {
    @route('/api/main/stats')
    public static getStats() : ApiResponse {
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
    public static getSessionLog() : ApiResponse
    {
        return ApiResponse.Payload([{ todo: 123}]);
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