"use strict";
var ApiResponse = (function () {
    function ApiResponse() {
        this.ApiResponseVer = "1.0";
    }
    ApiResponse.Success = function () {
        var ret = new ApiResponse();
        ret.Type = ApiResponseType.Success;
        return ret;
    };
    ApiResponse.ExclamationModal = function (msg) {
        var ret = new ApiResponse();
        ret.Message = msg;
        ret.Type = ApiResponseType.ExclamationModal;
        return ret;
    };
    ApiResponse.InformationToast = function (msg, data) {
        if (data === void 0) { data = null; }
        var ret = new ApiResponse();
        ret.Message = msg;
        ret.Type = ApiResponseType.InfoMsg;
        ret.Data = data;
        return ret;
    };
    ApiResponse.Exception = function (ex) {
        var ret = new ApiResponse();
        ret.Message = ex.toString();
        ret.Type = ApiResponseType.Exception;
        return ret;
    };
    ApiResponse.Payload = function (data) {
        var ret = new ApiResponse();
        ret.Data = data;
        ret.Type = ApiResponseType.Success;
        return ret;
    };
    return ApiResponse;
}());
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
