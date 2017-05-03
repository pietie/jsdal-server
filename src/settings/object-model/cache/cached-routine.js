"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_source_1 = require("./../database-source");
var RoutineIncludeExcludeInstructionSource;
(function (RoutineIncludeExcludeInstructionSource) {
    RoutineIncludeExcludeInstructionSource[RoutineIncludeExcludeInstructionSource["Unknown"] = 0] = "Unknown";
    RoutineIncludeExcludeInstructionSource[RoutineIncludeExcludeInstructionSource["DatabaseMetadata"] = 10] = "DatabaseMetadata";
    RoutineIncludeExcludeInstructionSource[RoutineIncludeExcludeInstructionSource["DbSourceLevel"] = 20] = "DbSourceLevel";
    RoutineIncludeExcludeInstructionSource[RoutineIncludeExcludeInstructionSource["JsFileLevel"] = 30] = "JsFileLevel";
})(RoutineIncludeExcludeInstructionSource = exports.RoutineIncludeExcludeInstructionSource || (exports.RoutineIncludeExcludeInstructionSource = {}));
class RoutineIncludeExcludeInstruction {
}
exports.RoutineIncludeExcludeInstruction = RoutineIncludeExcludeInstruction;
class CachedRoutine {
    get FullName() { return `[${this.Schema}].[${this.Routine}]`; }
    constructor() {
        this.RuleInstructions = {};
    }
    static createFromJson(rawJson) {
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
    equals(r, routineName) {
        if (r instanceof CachedRoutine) {
            return this.Schema.toLowerCase() == r.Schema.toLowerCase()
                && this.Routine.toLowerCase() == r.Routine.toLowerCase();
        }
        else {
            return this.Schema.toLowerCase() == r.toLowerCase()
                && this.Routine.toLowerCase() == routineName.toLowerCase();
        }
    }
    applyRules(dbSource, jsFileContext) {
        let instruction = new RoutineIncludeExcludeInstruction();
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
        dbSource.Rules.forEach(dbRule => {
            if (dbRule == null)
                return;
            if (dbRule.apply(this)) {
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
            jsFileContext.Rules.forEach(fileRule => {
                if (fileRule == null)
                    return;
                if (fileRule.apply(this)) {
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
    }
}
exports.CachedRoutine = CachedRoutine;
//# sourceMappingURL=cached-routine.js.map