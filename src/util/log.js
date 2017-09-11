"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const sizeof = require("object-sizeof");
class MemoryLog {
    constructor(maxEntries = 1000) {
        this._entries = [];
        this._maxEntries = maxEntries;
    }
    get count() { return this._entries.length; }
    memDetail() {
        return { Cnt: this._entries.length, MemBytes: sizeof(this) };
    }
    addEntry(type, entry) {
        //lock(_entries)
        {
            // cull from the front
            if (this._entries.length >= this._maxEntries) {
                this._entries.splice(0, this._entries.length - this._maxEntries + 1);
            }
            var newEntry = new LogEntry();
            newEntry.Type = type;
            newEntry.Message = entry;
            this._entries.push(newEntry);
            return newEntry;
        }
    }
    info(info) {
        return this.addEntry(LogEntryType.Info, info);
    }
    warning(info) {
        return this.addEntry(LogEntryType.Warning, info);
    }
    error(info) {
        return this.addEntry(LogEntryType.Error, info);
    }
    exception(ex) {
        var line = ex.name + ';' + ex.message + ';' + ex.stack;
        // if (args != null && args.Length > 0) {
        //     line = string.Join(";", args) + "; " + ex.ToString();
        // }
        return this.addEntry(LogEntryType.Exception, line);
    }
    get Entries() { return this._entries; }
}
exports.MemoryLog = MemoryLog;
class LogEntry {
    constructor() {
        this.CreateDate = new Date();
    }
    Append(msg, reportTime = true) {
        if (msg == null)
            return;
        if (this.Message == null)
            this.Message = "";
        var durationMS = "";
        if (reportTime) {
            var startDate = this.LastAppend ? this.LastAppend : this.CreateDate;
            this.LastAppend = new Date();
            //!?durationMS = " (" + (int)this.LastAppend.Value.Subtract(startDate).TotalMilliseconds + "ms)";
        }
        this.Message += durationMS + "; " + msg;
    }
}
var LogEntryType;
(function (LogEntryType) {
    LogEntryType[LogEntryType["Info"] = 10] = "Info";
    LogEntryType[LogEntryType["Warning"] = 20] = "Warning";
    LogEntryType[LogEntryType["Error"] = 30] = "Error";
    LogEntryType[LogEntryType["Exception"] = 40] = "Exception";
})(LogEntryType || (LogEntryType = {}));
class SessionLog {
    static memDetail() {
        return SessionLog._log.memDetail();
    }
    static get entries() {
        return this._log.Entries;
    }
    static info(info) {
        let line = chalk.gray(info);
        this._log.info(line);
        // console.log(line)
    }
    static error(info) { this._log.error(info); }
    static warning(info) { this._log.warning(info); }
    static exception(ex) { this._log.exception(ex); }
}
SessionLog.MAX_ENTRIES = 2000;
SessionLog._log = new MemoryLog(SessionLog.MAX_ENTRIES);
exports.SessionLog = SessionLog;
//# sourceMappingURL=log.js.map