import { RoutineParameter, ResultsetMetadata } from './routine-parameter'

export class CachedRoutine {

    public Schema: string;
    public Routine: string;
    public Type: string; //e.g. Proc, UDF or Table-valued function
    public RowVer: number;
    public Parameters: RoutineParameter[];
    public ResultSetRowver: number;
    public ResultSetMetadata: Array<ResultsetMetadata>;
    public ResultSetError: string;
    public RoutineParsingRowver: number;
    public jsDALMetadata: any;

    public IsDeleted: boolean;

    //[JsonIgnore]
    //public string FullName { get { return string.Format("[{0}].[{1}]", this.Schema, this.Routine); } }

    constructor() {

    }

    public static createFromJson(rawJson: any): CachedRoutine {
        let cachedRoutine = new CachedRoutine();

        cachedRoutine.Schema = rawJson.Schema;
        cachedRoutine.Routine = rawJson.Routine;
        cachedRoutine.Type = rawJson.Type;
        cachedRoutine.RowVer = rawJson.RowVer;

        cachedRoutine.ResultSetRowver = rawJson.ResultSetRowver;
        cachedRoutine.ResultSetError = rawJson.ResultSetError;
        cachedRoutine.RoutineParsingRowver = rawJson.RoutineParsingRowver;
        cachedRoutine.IsDeleted = rawJson.IsDeleted;

        cachedRoutine.Parameters = rawJson.Parameters;

        return cachedRoutine;
    }

    public equals(r:CachedRoutine) : boolean
    {
        return this.Schema.toLowerCase() == r.Schema.toLowerCase()
         && this.Routine.toLowerCase() == r.Routine.toLowerCase();
    }
}