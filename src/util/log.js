"use strict";
var chalk = require("chalk");
var MemoryLog = (function () {
    function MemoryLog(maxEntries) {
        if (maxEntries === void 0) { maxEntries = 1000; }
        this._entries = [];
        this._maxEntries = maxEntries;
    }
    MemoryLog.prototype.addEntry = function (type, entry) {
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
    };
    MemoryLog.prototype.info = function (info) {
        return this.addEntry(LogEntryType.Info, info);
    };
    MemoryLog.prototype.warning = function (info) {
        return this.addEntry(LogEntryType.Warning, info);
    };
    MemoryLog.prototype.error = function (info) {
        return this.addEntry(LogEntryType.Error, info);
    };
    MemoryLog.prototype.exception = function (ex) {
        var line = ex.name + ';' + ex.message + ';' + ex.stack;
        // if (args != null && args.Length > 0) {
        //     line = string.Join(";", args) + "; " + ex.ToString();
        // }
        return this.addEntry(LogEntryType.Exception, line);
    };
    Object.defineProperty(MemoryLog.prototype, "Entries", {
        get: function () { return this._entries; },
        enumerable: true,
        configurable: true
    });
    return MemoryLog;
}());
var LogEntry = (function () {
    function LogEntry() {
        this._createDate = new Date();
    }
    Object.defineProperty(LogEntry.prototype, "CreateDate", {
        get: function () {
            return this._createDate;
        },
        enumerable: true,
        configurable: true
    });
    LogEntry.prototype.Append = function (msg, reportTime) {
        if (reportTime === void 0) { reportTime = true; }
        if (msg == null)
            return;
        if (this.Message == null)
            this.Message = "";
        var durationMS = "";
        if (reportTime) {
            var startDate = this.LastAppend ? this.LastAppend : this.CreateDate;
            this.LastAppend = new Date();
        }
        this.Message += durationMS + "; " + msg;
    };
    return LogEntry;
}());
var LogEntryType;
(function (LogEntryType) {
    LogEntryType[LogEntryType["Info"] = 10] = "Info";
    LogEntryType[LogEntryType["Warning"] = 20] = "Warning";
    LogEntryType[LogEntryType["Error"] = 30] = "Error";
    LogEntryType[LogEntryType["Exception"] = 40] = "Exception";
})(LogEntryType || (LogEntryType = {}));
var SessionLog = (function () {
    function SessionLog() {
    }
    SessionLog.info = function (info) {
        var line = chalk.gray(info);
        this._log.info(line);
        console.log(line);
    };
    SessionLog.error = function (info) { this._log.error(info); };
    SessionLog.warning = function (info) { this._log.warning(info); };
    SessionLog.exception = function (ex) { this._log.exception(ex); };
    return SessionLog;
}());
SessionLog.MAX_ENTRIES = 2000;
SessionLog._log = new MemoryLog(SessionLog.MAX_ENTRIES);
exports.SessionLog = SessionLog;
