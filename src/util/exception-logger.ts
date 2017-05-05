import * as shortid from 'shortid'

export class ExceptionLogger {
    private static MAX_ENTRIES:number = 1000;

    private static exceptionList: ExceptionWrapper[] = [];

    public static get exceptions() : ExceptionWrapper[]
    {
        return ExceptionLogger.exceptionList;
    }

    public static getException(id:string)
    {
        return ExceptionLogger.exceptionList.find(e=>e.id == id);
    }

    static logException(ex) : string {
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
        this.exceptionObject = { message: ex.message, stack: ex.stack };
        this.id = shortid.generate();
    }

}