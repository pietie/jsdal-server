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
const work_spawner_1 = require("./../../generator/work-spawner");
const log_1 = require("./../../util/log");
class WorkersController {
    static getAllWokers(req, res) {
        try {
            let ret = work_spawner_1.WorkSpawner.workerList.map(wl => { return { id: wl.id, name: wl.name, desc: wl.description, status: wl.status, isRunning: wl.running }; });
            return api_response_1.ApiResponse.Payload(ret);
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static getWorkerLog(req, res) {
        let workerName = req.params.id;
        return api_response_1.ApiResponse.Payload(log_1.SessionLog.entries);
    }
}
__decorate([
    decorators_1.route("/api/workers"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], WorkersController, "getAllWokers", null);
__decorate([
    decorators_1.route('/api/workers/:id'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], WorkersController, "getWorkerLog", null);
exports.WorkersController = WorkersController;
//# sourceMappingURL=workers.js.map