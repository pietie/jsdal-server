"use strict";
var database_source_1 = require("./../database-source");
var RoutineIncludeExcludeInstructionSource;
(function (RoutineIncludeExcludeInstructionSource) {
    RoutineIncludeExcludeInstructionSource[RoutineIncludeExcludeInstructionSource["Unknown"] = 0] = "Unknown";
    RoutineIncludeExcludeInstructionSource[RoutineIncludeExcludeInstructionSource["DatabaseMetadata"] = 10] = "DatabaseMetadata";
    RoutineIncludeExcludeInstructionSource[RoutineIncludeExcludeInstructionSource["DbSourceLevel"] = 20] = "DbSourceLevel";
    RoutineIncludeExcludeInstructionSource[RoutineIncludeExcludeInstructionSource["JsFileLevel"] = 30] = "JsFileLevel";
})(RoutineIncludeExcludeInstructionSource = exports.RoutineIncludeExcludeInstructionSource || (exports.RoutineIncludeExcludeInstructionSource = {}));
var RoutineIncludeExcludeInstruction = (function () {
    function RoutineIncludeExcludeInstruction() {
    }
    return RoutineIncludeExcludeInstruction;
}());
exports.RoutineIncludeExcludeInstruction = RoutineIncludeExcludeInstruction;
var CachedRoutine = (function () {
    function CachedRoutine() {
        this.RuleInstructions = {};
    }
    Object.defineProperty(CachedRoutine.prototype, "FullName", {
        get: function () { return "[" + this.Schema + "].[" + this.Routine + "]"; },
        enumerable: true,
        configurable: true
    });
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
    CachedRoutine.prototype.applyRules = function (dbSource, jsFileContext) {
        var _this = this;
        var instruction = new RoutineIncludeExcludeInstruction();
        // apply Metadata first
        if (this.jsDALMetadata && this.jsDALMetadata.jsDAL != null) {
            if (this.jsDALMetadata.jsDAL !== undefined) {
                if (this.jsDALMetadata.jsDAL.exclude) {
                    instruction.Source = RoutineIncludeExcludeInstructionSource.DatabaseMetadata;
                    instruction.Excluded = !!this.jsDALMetadata.jsDAL.exclude;
                    if (instruction.Excluded)
                        instruction.Reason = "T-SQL metadata";
                }
                else if (!this.jsDALMetadata.jsDAL.exclude) {
                    instruction.Source = RoutineIncludeExcludeInstructionSource.DatabaseMetadata;
                    instruction.Included = this.jsDALMetadata.jsDAL.include;
                    if (instruction.Included)
                        instruction.Reason = "T-SQL metadata";
                }
            }
        }
        if (instruction.Reason != null)
            return instruction;
        // apply DB source level
        dbSource.Rules.forEach(function (dbRule) {
            if (dbRule.apply(_this)) {
                if (dbSource.DefaultRuleMode == database_source_1.DefaultRuleMode.ExcludeAll) {
                    instruction.Included = true;
                    instruction.Reason = dbRule.toString();
                }
                else if (dbSource.DefaultRuleMode == database_source_1.DefaultRuleMode.IncludeAll) {
                    instruction.Excluded = true;
                    instruction.Reason = dbRule.toString();
                }
                else
                    throw "Unsupported DefaultRuleMode: " + dbSource.DefaultRuleMode;
                instruction.Rule = dbRule;
                instruction.Source = RoutineIncludeExcludeInstructionSource.DbSourceLevel;
                return instruction;
            }
        });
        if (instruction.Rule != null)
            return instruction;
        // apply JSFile level
        if (jsFileContext != null) {
            jsFileContext.Rules.forEach(function (fileRule) {
                if (fileRule.apply(_this)) {
                    if (dbSource.DefaultRuleMode == database_source_1.DefaultRuleMode.ExcludeAll) {
                        instruction.Included = true;
                        instruction.Reason = fileRule.toString(); // TODO: Consider recording a more substantial reference to the rule
                    }
                    else if (dbSource.DefaultRuleMode == database_source_1.DefaultRuleMode.IncludeAll) {
                        instruction.Excluded = true;
                        instruction.Reason = fileRule.toString();
                    }
                    else
                        throw "Unsupported DefaultRuleMode: " + dbSource.DefaultRuleMode;
                    instruction.Rule = fileRule;
                    instruction.Source = RoutineIncludeExcludeInstructionSource.JsFileLevel;
                    return instruction;
                }
            });
        }
        if (dbSource.DefaultRuleMode == database_source_1.DefaultRuleMode.ExcludeAll)
            instruction.Excluded = true;
        else
            instruction.Included = true;
        instruction.Rule = null;
        instruction.Source = RoutineIncludeExcludeInstructionSource.DbSourceLevel;
        instruction.Reason = "Default";
        return instruction;
    };
    return CachedRoutine;
}());
exports.CachedRoutine = CachedRoutine;
//# sourceMappingURL=cached-routine.js.map