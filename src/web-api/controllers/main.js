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
var api_response_1 = require("./../api-response");
var decorators_1 = require("./../decorators");
var MainController = (function () {
    function MainController() {
    }
    MainController.getStats = function () {
        var mu = process.memoryUsage();
        var now = new Date();
        var startDate = new Date(now.getTime() - (process.uptime() * 1000));
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
    };
    MainController.getSessionLog = function () {
        return api_response_1.ApiResponse.Payload([{ todo: 123 }]);
    };
    return MainController;
}());
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
