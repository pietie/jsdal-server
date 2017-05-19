"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./../util/log");
const exception_logger_1 = require("./../util/exception-logger");
class ApiResponse {
    constructor() {
        this.ApiResponseVer = "1.0";
    }
    static Success() {
        let ret = new ApiResponse();
        ret.Type = ApiResponseType.Success;
        return ret;
    }
    static ExclamationModal(msg) {
        let ret = new ApiResponse();
        ret.Message = msg;
        ret.Type = ApiResponseType.ExclamationModal;
        return ret;
    }
    static InformationToast(msg, data = null) {
        let ret = new ApiResponse();
        ret.Message = msg;
        ret.Type = ApiResponseType.InfoMsg;
        ret.Data = data;
        return ret;
    }
    static Exception(ex, additionalInfo) {
        log_1.SessionLog.exception(ex);
        if (additionalInfo && additionalInfo != "") {
            if (typeof (ex) === "string") {
                ex = additionalInfo + ";" + ex;
            }
            else if (typeof (ex.message) !== "undefined") {
                ex.message = additionalInfo + ";" + ex.message;
            }
        }
        let id = exception_logger_1.ExceptionLogger.logException(ex);
        let ret = new ApiResponse();
        ret.Message = `Error ref: ${id}`;
        ret.Type = ApiResponseType.Exception;
        return ret;
    }
    static Payload(data) {
        let ret = new ApiResponse();
        ret.Data = data;
        ret.Type = ApiResponseType.Success;
        return ret;
    }
}
exports.ApiResponse = ApiResponse;
class ApiResponseScalar extends ApiResponse {
    constructor() {
        super();
    }
    static PayloadScalar(data, isDate) {
        let ret = new ApiResponseScalar();
        ret.Data = data;
        ret.IsDate = isDate;
        return ret;
    }
}
exports.ApiResponseScalar = ApiResponseScalar;
var ApiResponseType;
(function (ApiResponseType) {
    ApiResponseType[ApiResponseType["Unknown"] = 0] = "Unknown";
    ApiResponseType[ApiResponseType["Success"] = 1] = "Success";
    ApiResponseType[ApiResponseType["InfoMsg"] = 10] = "InfoMsg";
    ApiResponseType[ApiResponseType["ExclamationModal"] = 20] = "ExclamationModal";
    ApiResponseType[ApiResponseType["Error"] = 30] = "Error";
    ApiResponseType[ApiResponseType["Exception"] = 40] = "Exception";
})(ApiResponseType = exports.ApiResponseType || (exports.ApiResponseType = {}));
//# sourceMappingURL=api-response.js.map