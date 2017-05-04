import * as shortid from 'shortid'

export class ExceptionLogger {
    private static MAX_ENTRIES:number = 1000;

    private exceptionList: ExceptionWrapper[] = [];

    public get exceptions() : ExceptionWrapper[]
    {
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

export class ExceptionWrapper {
    public created: Date;
    public exceptionObject;
    public id: string;

    constructor(ex) {
        this.created = new Date();
        this.exceptionObject = ex;
        this.id = shortid.generate();
    }

}