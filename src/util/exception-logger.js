"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shortid = require("shortid");
class ExceptionLogger {
    static get exceptions() {
        return ExceptionLogger.exceptionList;
    }
    static getException(id) {
        return ExceptionLogger.exceptionList.find(e => e.id == id);
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
        this.exceptionObject = { message: ex.message, stack: ex.stack };
        this.id = shortid.generate();
    }
}
exports.ExceptionWrapper = ExceptionWrapper;
//# sourceMappingURL=exception-logger.js.map