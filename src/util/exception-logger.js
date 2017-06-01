"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shortid = require("shortid");
const mssql_1 = require("mssql");
class ExceptionLogger {
    static get exceptions() {
        return ExceptionLogger.exceptionList;
    }
    static getException(id) {
        return ExceptionLogger.exceptionList.find(e => e.id == id);
    }
    static getTopN(n) {
        if (n <= 0)
            return [];
        let ix = ExceptionLogger.exceptionList.length - n;
        if (ix < 0)
            ix = 0;
        return ExceptionLogger.exceptionList.slice(ix);
    }
    static logException(ex) {
        if (ExceptionLogger.exceptionList.length >= ExceptionLogger.MAX_ENTRIES) {
            // cull from the front
            ExceptionLogger.exceptionList.splice(0, ExceptionLogger.exceptionList.length - ExceptionLogger.MAX_ENTRIES + 1);
        }
        let ew = new ExceptionWrapper(ex);
        ExceptionLogger.exceptionList.push(ew);
        return ew.id;
    }
}
ExceptionLogger.MAX_ENTRIES = 1000;
ExceptionLogger.exceptionList = [];
exports.ExceptionLogger = ExceptionLogger;
class ExceptionWrapper {
    constructor(ex) {
        this.created = new Date();
        let msg = ex;
        if (ex instanceof mssql_1.RequestError) {
            let re = ex;
            msg = `Procedure ##${re.procName}##, Line ${re.lineNumber}, Message: ${re.message}, Error ${re.number}, Level ${re.class}, State ${re.state}`;
        }
        else if (typeof (ex) == "object" && typeof (ex.message) !== "undefined") {
            msg = ex.message;
        }
        this.exceptionObject = { message: msg, stack: ex.stack };
        this.id = shortid.generate();
    }
}
exports.ExceptionWrapper = ExceptionWrapper;
//# sourceMappingURL=exception-logger.js.map