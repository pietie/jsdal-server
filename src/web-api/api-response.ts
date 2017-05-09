
import { SessionLog } from "./../util/log";
import { ExceptionLogger } from "./../util/exception-logger";

export class ApiResponse {

    constructor() {
        this.ApiResponseVer = "1.0";
    }

    public ApiResponseVer: string;

    public Message: string;
    public Title: string;
    public Type: ApiResponseType;

    public Data: any;

    public static Success(): ApiResponse {
        let ret = new ApiResponse();

        ret.Type = ApiResponseType.Success;

        return ret;
    }

    public static ExclamationModal(msg: string): ApiResponse {
        let ret = new ApiResponse();
        ret.Message = msg;
        ret.Type = ApiResponseType.ExclamationModal;
        return ret;
    }

    public static InformationToast(msg: string, data: any = null): ApiResponse {
        let ret = new ApiResponse();
        ret.Message = msg;
        ret.Type = ApiResponseType.InfoMsg;
        ret.Data = data;
        return ret;
    }

    public static Exception(ex: Error | any): ApiResponse {
        SessionLog.error(ex.toString());
        let id = ExceptionLogger.logException(ex);
        
        let ret = new ApiResponse();

        ret.Message = `Error ref: ${id}`;
        ret.Type = ApiResponseType.Exception;

        return ret;
    }

    public static Payload(data: any): ApiResponse {
        let ret = new ApiResponse();

        ret.Data = data;
        ret.Type = ApiResponseType.Success;

        return ret;
    }


}

export class ApiResponseScalar extends ApiResponse {
    constructor()
    {
        super();
    }
    public IsDate: boolean;

    public static PayloadScalar(data: Object, isDate: boolean): ApiResponseScalar {
        let ret = new ApiResponseScalar();
        ret.Data = data;
        ret.IsDate = isDate;
        return ret;
    }
}

export enum ApiResponseType {
    Unknown = 0,
    Success = 1,
    InfoMsg = 10,
    ExclamationModal = 20,
    Error = 30,
    Exception = 40
}
