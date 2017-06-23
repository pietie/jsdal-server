import * as chalk from 'chalk'



export class MemoryLog {

    private _maxEntries: number;

    public constructor(maxEntries: number = 1000) {
        this._maxEntries = maxEntries;
    }

    private _entries: LogEntry[] = [];

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

    public exception(ex: Error): LogEntry {
        var line = ex.name + ';' + ex.message + ';' + ex.stack;

        // if (args != null && args.Length > 0) {
        //     line = string.Join(";", args) + "; " + ex.ToString();
        // }

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
}

enum LogEntryType {
    Info = 10,
    Warning = 20,
    Error = 30,
    Exception = 40
}


export class SessionLog {
    static readonly MAX_ENTRIES: number = 2000;
    static _log:MemoryLog = new MemoryLog(SessionLog.MAX_ENTRIES);

    public static get entries() : LogEntry[] {
        return this._log.Entries;
    }

    public static info(info: string) {
        let line:string = chalk.gray(info);
        this._log.info(line);
      // console.log(line)

    }
    public static error(info: string) { this._log.error(info); }
    public static warning(info: string) { this._log.warning(info); }
    public static exception(ex: Error) { this._log.exception(ex); }
}