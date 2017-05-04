export class RoutineParameter {
    public ParameterMode: string;
    public IsResult: string;
    public ParameterName: string;
    public DataType: string;
    public Length: number;

    public DefaultValue: string;
    public DefaultValueType: string;

    //[JsonIgnore]
    //public bool HasDefault { get { return !string.IsNullOrEmpty(this.DefaultValue); } }    

    public static createFromJson(rawJson: any): RoutineParameter {

        let parm = new RoutineParameter();

        parm.ParameterMode = Array.isArray(rawJson.ParameterMode)? rawJson.ParameterMode[0] : rawJson.ParameterMode;
        parm.IsResult = Array.isArray(rawJson.IsResult)? rawJson.IsResult[0] : rawJson.IsResult;
        parm.ParameterName = Array.isArray(rawJson.ParameterName) ? rawJson.ParameterName[0] : rawJson.ParameterName;
        parm.DataType = Array.isArray(rawJson.DataType) ? rawJson.DataType[0] : rawJson.DataType;
        parm.Length = Array.isArray(rawJson.Length)? rawJson.Length[0] : rawJson.Length;


        //parm.DefaultValue = rawJson.DefaultValue;
        //parm.DefaultValueType = rawJson.DefaultValueType;
        return parm;
    }
}

export class ResultsetMetadata {
    public ColumnName: string;
    public DataType: string;
    public ColumnSize: number;
    public NumericalPrecision: number;
    public NumericalScale: number;
}