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
const exception_logger_1 = require("./../../util/exception-logger");
class ExceptionsController {
    static getException(req, res) {
        try {
            let id = req.params.id;
            let ex = exception_logger_1.ExceptionLogger.getException(id);
            if (ex == null) {
                //res.status(404).send(`An exception with id ${id} could not be found.`);
                return api_response_1.ApiResponse.ExclamationModal(`An exception with id "${id}" could not be found.`);
            }
            return api_response_1.ApiResponse.Payload(ex);
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static getRecentExceptions(req, res) {
        try {
            let n = parseInt(req.params.n);
            if (n > 500)
                n = 500;
            //let ret = ExceptionLogger.getTopN(n).sort((a, b) => b.created >= a.created?1:0); // sort desc based on create date
            let ret = exception_logger_1.ExceptionLogger.getTopN(n).sort((a, b) => {
                if (a.created > b.created)
                    return -1;
                if (b.created > a.created)
                    return 1;
                return 0;
            }); // sort desc based on create date
            return api_response_1.ApiResponse.Payload({
                Results: ret,
                TotalExceptionCnt: exception_logger_1.ExceptionLogger.getTotalCnt()
            });
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
}
__decorate([
    decorators_1.route("/api/exception/:id"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], ExceptionsController, "getException", null);
__decorate([
    decorators_1.route("/api/exception/top/:n"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], ExceptionsController, "getRecentExceptions", null);
exports.ExceptionsController = ExceptionsController;
//# sourceMappingURL=exceptions.js.map