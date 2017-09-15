import * as shortid from 'shortid'
import { RequestError } from "mssql";
import * as sizeof from 'object-sizeof';

export class ExceptionLogger {
    private static MAX_ENTRIES: number = 1000;

    private static exceptionList: ExceptionWrapper[] = [];

    public static memDetail(): any
    {
        return { Cnt: ExceptionLogger.exceptionList.length, MemBytes: sizeof(ExceptionLogger.exceptionList) } ;
    }

    public static get exceptions(): ExceptionWrapper[] {
        return ExceptionLogger.exceptionList;
    }

    public static getException(id: string) {
        return ExceptionLogger.exceptionList.find(e => e.id == id);
    }

    public static getTopN(n: number): ExceptionWrapper[] {
        if (n <= 0) return [];
        let ix = ExceptionLogger.exceptionList.length - n;
        if (ix < 0) ix = 0;
        return ExceptionLogger.exceptionList.slice(ix);
    }

    public static getTotalCnt(): number {
        if (!ExceptionLogger.exceptionList) return 0;
        return ExceptionLogger.exceptionList.length;
    }

    static logException(ex): string {
        if (ExceptionLogger.exceptionList.length >= ExceptionLogger.MAX_ENTRIES) {
            // cull from the front
            ExceptionLogger.exceptionList.splice(0, ExceptionLogger.exceptionList.length - ExceptionLogger.MAX_ENTRIES + 1);
        }

        let ew = new ExceptionWrapper(ex);
        ExceptionLogger.exceptionList.push(ew);

        return ew.id;
    }
}

export class ExceptionWrapper {
    public created: Date;
    public exceptionObject;
    public id: string;

    constructor(ex) {
        this.created = new Date();

        let msg = ex;

        if (ex instanceof RequestError) {
            let re: any = ex;

            msg = `Procedure ##${re.procName}##, Line ${re.lineNumber}, Message: ${re.message}, Error ${re.number}, Level ${re.class}, State ${re.state}`;
        }
        else if (typeof (ex) == "object" && typeof (ex.message) !== "undefined") {
            msg = ex.message;
        }

        this.exceptionObject = { message: msg, stack: ex.stack };
        this.id = shortid.generate();
    }

}