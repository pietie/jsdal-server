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
class WorkersController {
    static getAllWokers(req, res) {
        try {
            let ret = work_spawner_1.WorkSpawner.workerList.map(wl => {
                return {
                    id: wl.id,
                    name: wl.name,
                    desc: wl.description,
                    status: wl.status,
                    lastProgress: wl.lastProgress,
                    lastProgressMoment: wl.lastProgressMoment,
                    lastConnectMoment: wl.lastConnectedMoment,
                    isRunning: wl.running
                };
            });
            return api_response_1.ApiResponse.Payload(ret);
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static getWorkerLog(req, res) {
        let workerName = req.params.id;
        let worker = work_spawner_1.WorkSpawner.getWorker(workerName);
        if (worker) {
            return api_response_1.ApiResponse.Payload(worker.log.Entries);
        }
        else {
            return api_response_1.ApiResponse.Payload(null);
        }
    }
    static startWorker(req, res) {
        try {
            let id = req.params.id;
            let worker = work_spawner_1.WorkSpawner.getWorkerById(id);
            if (worker) {
                worker.start();
                return api_response_1.ApiResponse.Success();
            }
            else {
                return api_response_1.ApiResponse.ExclamationModal(`Failed to find specified worker: ${id}`);
            }
        }
        catch (e) {
            return api_response_1.ApiResponse.Exception(e);
        }
    }
    static stopWorker(req, res) {
        try {
            let id = req.params.id;
            let worker = work_spawner_1.WorkSpawner.getWorkerById(id);
            if (worker) {
                worker.stop();
                return api_response_1.ApiResponse.Success();
            }
            else {
                return api_response_1.ApiResponse.ExclamationModal(`Failed to find specified worker: ${id}`);
            }
        }
        catch (e) {
            return api_response_1.ApiResponse.Exception(e);
        }
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
__decorate([
    decorators_1.route('/api/workers/:id/start', { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], WorkersController, "startWorker", null);
__decorate([
    decorators_1.route('/api/workers/:id/stop', { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], WorkersController, "stopWorker", null);
exports.WorkersController = WorkersController;
//# sourceMappingURL=workers.js.map