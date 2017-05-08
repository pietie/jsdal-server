"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RoutineParameter {
    //[JsonIgnore]
    //public bool HasDefault { get { return !string.IsNullOrEmpty(this.DefaultValue); } }    
    static createFromJson(rawJson) {
        let parm = new RoutineParameter();
        parm.ParameterMode = Array.isArray(rawJson.ParameterMode) ? rawJson.ParameterMode[0] : rawJson.ParameterMode;
        parm.IsResult = Array.isArray(rawJson.IsResult) ? rawJson.IsResult[0] : rawJson.IsResult;
        parm.ParameterName = Array.isArray(rawJson.ParameterName) ? rawJson.ParameterName[0] : rawJson.ParameterName;
        parm.DataType = Array.isArray(rawJson.DataType) ? rawJson.DataType[0] : rawJson.DataType;
        parm.Length = Array.isArray(rawJson.Length) ? rawJson.Length[0] : rawJson.Length;
        //parm.DefaultValue = rawJson.DefaultValue;
        //parm.DefaultValueType = rawJson.DefaultValueType;
        return parm;
    }
    static getDataTypeForTypeScript(dataType) {
        var elems = dataType.toLowerCase().split('.'); // types like geography could come through as sys.CATALOG.geography
        var dt = elems[elems.length - 1];
        switch (dt) {
            case "table type":
                return "Object";
            case "time":
                return "Date";
            case "date":
                return "Date";
            case "datetime":
                return "Date";
            case "smalldatetime":
                return "Date";
            case "int":
                return "number";
            case "smallint":
                return "number";
            case "bigint":
                return "number";
            case "bit":
                return "boolean";
            case "nvarchar":
                return "string";
            case "varchar":
                return "string";
            case "text":
                return "string";
            case "ntext":
                return "string";
            case "varbinary":
                return "Blob"; // TODO: Not sure about this one...worst case, make it a string
            case "decimal":
                return "number";
            case "uniqueidentifier":
                return "string";
            case "money":
                return "number";
            case "char":
                return "string";
            case "nchar":
                return "string";
            case "xml":
                return "string";
            case "float":
                return "number";
            case "image":
                return "Blob"; // TODO: Not sure about this one...worst case, make it a string
            case "tinyint":
                return "number";
            case "geography":
                return "string";
            case "sql_variant":
                return "string";
            case "timestamp":
                return "string";
            case "binary":
                return "Blob"; // TODO: Not sure about this one...worst case, make it a string                
            default:
                throw new Error("getDataTypeForTypeScript::Unsupported data type: " + dataType);
        }
    }
    static getDataTypeForJavaScriptComment(dataType) {
        var elems = dataType.toLowerCase().split('.'); // types like geography could come through as sys.CATALOG.geography
        var dt = elems[elems.length - 1];
        switch (dt) {
            case "table type":
                return "TableType";
            case "time":
                return "Date";
            case "date":
                return "DateTime";
            case "datetime":
                return "DateTime";
            case "smalldatetime":
                return "DateTime";
            case "int":
                return "int";
            case "smallint":
                return "int";
            case "bigint":
                return "long";
            case "bit":
                return "bool";
            case "nvarchar":
                return "string";
            case "varchar":
                return "string";
            case "text":
                return "string";
            case "ntext":
                return "string";
            case "varbinary":
                return "varbinary";
            case "decimal":
                return "float";
            case "uniqueidentifier":
                return "Guid";
            case "money":
                return "float";
            case "char":
                return "string";
            case "nchar":
                return "string";
            case "xml":
                return "XmlString";
            case "float":
                return "float";
            case "image":
                return "byteArray";
            case "tinyint":
                return "int";
            case "geography":
                return "geography";
            case "sql_variant":
                return "string";
            case "timestamp":
                return "string";
            default:
                throw new Error("getDataTypeForJavaScriptComment::Unsupported data type: " + dataType);
        }
    }
}
exports.RoutineParameter = RoutineParameter;
class ResultsetMetadata {
}
exports.ResultsetMetadata = ResultsetMetadata;
//# sourceMappingURL=routine-parameter.js.map