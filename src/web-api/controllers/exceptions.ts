import { ApiResponse } from './../api-response'
import { SettingsInstance } from './../../settings/settings-instance'
import { route } from './../decorators'
import { ExceptionLogger } from "./../../util/exception-logger";
import { Request, Response } from "@types/express";

export class ExceptionsController {

    @route("/api/exception/:id")
    public static getException(req: Request, res: Response): ApiResponse {
        try {

            let id: string = req.params.id;
            let ex = ExceptionLogger.getException(id);

            if (ex == null) {
                //res.status(404).send(`An exception with id ${id} could not be found.`);
                return ApiResponse.ExclamationModal(`An exception with id "${id}" could not be found.`);
            }

            return ApiResponse.Payload(ex);
        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }

    }

    @route("/api/exception/top/:n")
    public static getRecentExceptions(req: Request, res: Response): ApiResponse {
        try {
            let n: number = parseInt(req.params.n);

            if (n > 500) n = 500;

            //let ret = ExceptionLogger.getTopN(n).sort((a, b) => b.created >= a.created?1:0); // sort desc based on create date
            let ret = ExceptionLogger.getTopN(n).sort((a, b) => {
                if (a.created > b.created) return -1;
                if (b.created > a.created) return 1;
                return 0;

            }); // sort desc based on create date

            return ApiResponse.Payload(ret);
        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }

    }
}

