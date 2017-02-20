"use strict";
var CachedRoutine = (function () {
    //[JsonIgnore]
    //public string FullName { get { return string.Format("[{0}].[{1}]", this.Schema, this.Routine); } }
    function CachedRoutine() {
    }
    CachedRoutine.createFromJson = function (rawJson) {
        var cachedRoutine = new CachedRoutine();
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
    };
    CachedRoutine.prototype.equals = function (r) {
        return this.Schema.toLowerCase() == r.Schema.toLowerCase()
            && this.Routine.toLowerCase() == r.Routine.toLowerCase();
    };
    return CachedRoutine;
}());
exports.CachedRoutine = CachedRoutine;
