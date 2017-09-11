"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_response_1 = require("./../api-response");
const decorators_1 = require("./../decorators");
const log_1 = require("./../../util/log");
const user_management_1 = require("./../../util/user-management");
const exception_logger_1 = require("./../../util/exception-logger");
const work_spawner_1 = require("./../../generator/work-spawner");
class MainController {
    static getMemDetail(req, res) {
        try {
            let memDetail = {
                ExceptionLogger: exception_logger_1.ExceptionLogger.memDetail(),
                Workers: work_spawner_1.WorkSpawner.memDetail(),
                SessionLog: log_1.SessionLog.memDetail()
            };
            return api_response_1.ApiResponse.Payload(memDetail);
        }
        catch (e) {
            return api_response_1.ApiResponse.Exception(e);
        }
    }
    static isFirstTimeSetupComplete(req, res) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
        res.setHeader("Content-Type", "application/json");
        return api_response_1.ApiResponse.Payload(user_management_1.UserManagement.adminUserExists);
    }
    static performFirstTimeSetup(req, res) {
        if (req.body.adminUser) {
            user_management_1.UserManagement.addUser({ username: req.body.adminUser.username, password: req.body.adminUser.password, isAdmin: true });
            user_management_1.UserManagement.saveToFile();
        }
        return api_response_1.ApiResponse.Success();
    }
    static getStats() {
        let mu = process.memoryUsage();
        let now = new Date();
        let startDate = new Date(now.getTime() - (process.uptime() * 1000));
        return api_response_1.ApiResponse.Payload({
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
    static getSessionLog() {
        return api_response_1.ApiResponse.Payload(log_1.SessionLog.entries);
    }
}
__decorate([
    decorators_1.route('/api/main/memdetail', { get: true }, true, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], MainController, "getMemDetail", null);
__decorate([
    decorators_1.route('/api/main/issetupcomplete', { get: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], MainController, "isFirstTimeSetupComplete", null);
__decorate([
    decorators_1.route('/api/main/1sttimesetup', { post: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], MainController, "performFirstTimeSetup", null);
__decorate([
    decorators_1.route('/api/main/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", api_response_1.ApiResponse)
], MainController, "getStats", null);
__decorate([
    decorators_1.route('/api/main/sessionlog'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", api_response_1.ApiResponse)
], MainController, "getSessionLog", null);
exports.MainController = MainController;
//# sourceMappingURL=main.js.map