import * as chalk from 'chalk'
import * as sizeof from 'object-sizeof';

export class MemoryLog {

    private _maxEntries: number;

    public constructor(maxEntries: number = 1000) {
        this._maxEntries = maxEntries;
    }

    public get count(): number { return this._entries.length; }

    public memDetail(): any {
        return { Cnt: this._entries.length, MemBytes: sizeof(this) };
    }

    private _entries: LogEntry[] = [];

    public copyFrom(src:MemoryLog)
    {
        if (!src) return;
        if (!this._entries) this._entries = [];

        this._entries.push(...src.Entries.map(e=>e.clone()));
    }

    private addEntry(type: LogEntryType, entry: string): LogEntry {
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

    public info(info: string): LogEntry {
        return this.addEntry(LogEntryType.Info, info);
    }

    public warning(info: string): LogEntry {
        return this.addEntry(LogEntryType.Warning, info);
    }

    public error(info: string): LogEntry {
        return this.addEntry(LogEntryType.Error, info);
    }

    public exception(ex: Error|any): LogEntry {
        var line = ex.name + ';' + ex.message + ';' + ex.stack;
        
        if (ex.originalError) line = "originalError: " + ex.originalError + ";" + line;
        if (ex.precedingErrors) line = "precedingErrors: " + ex.precedingErrors + ";" + line;

        return this.addEntry(LogEntryType.Exception, line);
    }


    public get Entries(): LogEntry[] { return this._entries; }
}

class LogEntry {

    CreateDate: Date;

    constructor() {
        this.CreateDate = new Date();
    }


    // public get CreateDate(): Date {
    //     return this._createDate;
    // }

    public Message: string;
    public Type: LogEntryType;

    private LastAppend: Date;

    public Append(msg: string, reportTime: boolean = true) {
        if (msg == null) return;
        if (this.Message == null) this.Message = "";
        var durationMS = "";

        if (reportTime) {
            var startDate = this.LastAppend ? this.LastAppend : this.CreateDate;

            this.LastAppend = new Date();

            //!?durationMS = " (" + (int)this.LastAppend.Value.Subtract(startDate).TotalMilliseconds + "ms)";
        }

        this.Message += durationMS + "; " + msg;
    }

    public clone(): LogEntry {
        let le = new LogEntry();
        le.Message = this.Message;
        le.Type = this.Type;
        le.CreateDate = this.CreateDate;
        le.LastAppend = this.LastAppend;
        return le;
    }
}

enum LogEntryType {
    Info = 10,
    Warning = 20,
    Error = 30,
    Exception = 40
}


export class SessionLog {
    static readonly MAX_ENTRIES: number = 2000;
    static _log: MemoryLog = new MemoryLog(SessionLog.MAX_ENTRIES);

    public static memDetail(): any {
        return SessionLog._log.memDetail();
    }


    public static get entries(): LogEntry[] {
        return this._log.Entries;
    }

    public static info(info: string) {
        let line: string = chalk.gray(info);
        this._log.info(line);
        // console.log(line)

    }
    public static error(info: string) { this._log.error(info); }
    public static warning(info: string) { this._log.warning(info); }
    public static exception(ex: Error) { this._log.exception(ex); }
}