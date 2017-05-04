"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shortid = require("shortid");
class ExceptionLogger {
    constructor() {
        this.exceptionList = [];
    }
    get exceptions() {
        return this.exceptionList;
    }
    logException(ex) {
        if (this.exceptionList.length >= ExceptionLogger.MAX_ENTRIES) {
            // cull from the front
            this.exceptionList.splice(0, this.exceptionList.length - ExceptionLogger.MAX_ENTRIES + 1);
        }
        let ew = new ExceptionWrapper(ex);
        this.exceptionList.push(ew);
    }
}
ExceptionLogger.MAX_ENTRIES = 1000;
exports.ExceptionLogger = ExceptionLogger;
class ExceptionWrapper {
    constructor(ex) {
        this.created = new Date();
        this.exceptionObject = ex;
        this.id = shortid.generate();
    }
}
exports.ExceptionWrapper = ExceptionWrapper;
//# sourceMappingURL=exception-logger.js.map