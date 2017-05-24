"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class jsDALServerVariables {
    static parse(request, val) {
        if (val == null)
            return val;
        if (!val.toLowerCase().startsWith(jsDALServerVariables.PREFIX_MARKER.toLowerCase()))
            return val;
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
jsDALServerVariables.PREFIX_MARKER = "$jsDAL$";
exports.jsDALServerVariables = jsDALServerVariables;
//# sourceMappingURL=jsdal-server-variables.js.map