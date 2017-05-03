"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    static Exception(ex) {
        let ret = new ApiResponse();
        ret.Message = ex.toString();
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