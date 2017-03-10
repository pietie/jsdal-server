"use strict";
var RoutineParameter = (function () {
    function RoutineParameter() {
    }
    //[JsonIgnore]
    //public bool HasDefault { get { return !string.IsNullOrEmpty(this.DefaultValue); } }    
    RoutineParameter.createFromJson = function (rawJson) {
        var parm = new RoutineParameter();
        parm.ParameterMode = rawJson.ParameterMode;
        parm.IsResult = rawJson.IsResult;
        parm.ParameterName = Array.isArray(rawJson.ParameterName) ? rawJson.ParameterName[0] : rawJson.ParameterName;
        parm.DataType = Array.isArray(rawJson.DataType) ? rawJson.DataType[0] : rawJson.DataType;
        parm.Length = rawJson.Length;
        //parm.DefaultValue = rawJson.DefaultValue;
        //parm.DefaultValueType = rawJson.DefaultValueType;
        return parm;
    };
    return RoutineParameter;
}());
exports.RoutineParameter = RoutineParameter;
var ResultsetMetadata = (function () {
    function ResultsetMetadata() {
    }
    return ResultsetMetadata;
}());
exports.ResultsetMetadata = ResultsetMetadata;
//# sourceMappingURL=routine-parameter.js.map