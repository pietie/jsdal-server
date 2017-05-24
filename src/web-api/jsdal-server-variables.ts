import { Request } from "@types/express";

export class jsDALServerVariables {
    private static readonly PREFIX_MARKER: string = "$jsDAL$";

    public static parse(request: Request, val: string): string {
        if (val == null) return val;
        if (!val.toLowerCase().startsWith(jsDALServerVariables.PREFIX_MARKER.toLowerCase())) return val;

        // remove the prefix
        val = val.substring(jsDALServerVariables.PREFIX_MARKER.length + 1);

        if (val == "RemoteClient.IP") {
            var remoteIP = request.ip;

            return remoteIP;
        }
        else {
            throw new Error(`The server variable name '${val}' does not exist`);
        }


    }



}