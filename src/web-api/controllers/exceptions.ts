import { ApiResponse } from './../api-response'
import { SettingsInstance } from './../../settings/settings-instance'
import { route } from './../decorators'
import { ExceptionLogger } from "./../../util/exception-logger";
import { Request, Response } from "@types/express";

export class ExceptionsController {

    @route("/api/exception/:id")
    public static getException(req:Request, res:Response): ApiResponse {
        try {
            
            let id:string = req.params.id;
            let ex = ExceptionLogger.getException(id);

            if (ex == null)
            {
                //res.status(404).send(`An exception with id ${id} could not be found.`);
                return ApiResponse.ExclamationModal(`An exception with id "${id}" could not be found.`);
            }

            return ApiResponse.Payload(ex);
        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }

    }
}

