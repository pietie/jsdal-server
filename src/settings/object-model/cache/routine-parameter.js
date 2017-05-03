"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RoutineParameter {
    //[JsonIgnore]
    //public bool HasDefault { get { return !string.IsNullOrEmpty(this.DefaultValue); } }    
    static createFromJson(rawJson) {
        let parm = new RoutineParameter();
        parm.ParameterMode = rawJson.ParameterMode;
        parm.IsResult = rawJson.IsResult;
        parm.ParameterName = Array.isArray(rawJson.ParameterName) ? rawJson.ParameterName[0] : rawJson.ParameterName;
        parm.DataType = Array.isArray(rawJson.DataType) ? rawJson.DataType[0] : rawJson.DataType;
        parm.Length = rawJson.Length;
        //parm.DefaultValue = rawJson.DefaultValue;
        //parm.DefaultValueType = rawJson.DefaultValueType;
        return parm;
    }
}
exports.RoutineParameter = RoutineParameter;
class ResultsetMetadata {
}
exports.ResultsetMetadata = ResultsetMetadata;
//# sourceMappingURL=routine-parameter.js.map