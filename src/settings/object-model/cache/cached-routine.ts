import { RoutineParameter, ResultsetMetadata } from './routine-parameter'
import { JsFile } from './../jsfile'
import { DatabaseSource, DefaultRuleMode } from './../database-source'
import { BaseRule } from './../rules'

export enum RoutineIncludeExcludeInstructionSource {
    Unknown = 0,
    DatabaseMetadata = 10,
    DbSourceLevel = 20,
    JsFileLevel = 30
}

export class RoutineIncludeExcludeInstruction {
    public Rule: BaseRule;
    public Included?: boolean;
    public Excluded?: boolean;
    public Reason: string;
    public Source?: RoutineIncludeExcludeInstructionSource
}

export class CachedRoutine {

    public Schema: string;
    public Routine: string;
    public Type: string; //e.g. Proc, UDF or Table-valued function
    public RowVer: number;
    public Parameters: RoutineParameter[];
    public ResultSetRowver: number;
    public ResultSetMetadata: ResultsetMetadata[];
    public ResultSetError: string;
    public jsDALMetadata: any;

    public IsDeleted: boolean;

    public get FullName(): string { return `[${this.Schema}].[${this.Routine}]`; }

    public RuleInstructions: { [id: string/*JsFile Guid*/]: RoutineIncludeExcludeInstruction }; // Dictionary<JsFile/*If null then DB-level*/, RoutineIncludeExcludeInstruction>;

    constructor() {
        this.RuleInstructions = {};
    }

    public static createFromJson(rawJson: any): CachedRoutine {
        let cachedRoutine = new CachedRoutine();

        cachedRoutine.Schema = rawJson.Schema;
        cachedRoutine.Routine = rawJson.Routine;
        cachedRoutine.Type = rawJson.Type;
        cachedRoutine.RowVer = rawJson.RowVer;

        cachedRoutine.ResultSetRowver = rawJson.ResultSetRowver;
        cachedRoutine.ResultSetError = rawJson.ResultSetError;
        cachedRoutine.IsDeleted = rawJson.IsDeleted;

        cachedRoutine.Parameters = rawJson.Parameters;

        cachedRoutine.jsDALMetadata = rawJson.jsDALMetadata;

        return cachedRoutine;
    }

    public equals(r: CachedRoutine | string, routineName?: string): boolean {
        if (r instanceof CachedRoutine) {

            return this.Schema.toLowerCase() == r.Schema.toLowerCase()
                && this.Routine.toLowerCase() == r.Routine.toLowerCase();
        }
        else
        {
            return this.Schema.toLowerCase() == r.toLowerCase()
            && this.Routine.toLowerCase() == routineName.toLowerCase();
        }
    }

    public applyRules(dbSource: DatabaseSource, jsFileContext: JsFile): RoutineIncludeExcludeInstruction {
        let instruction = new RoutineIncludeExcludeInstruction();

        // apply Metadata first
        if (this.jsDALMetadata && this.jsDALMetadata.jsDAL != null) {
            if (this.jsDALMetadata.jsDAL !== undefined) {
                if (this.jsDALMetadata.jsDAL.exclude) {
                    instruction.Source = RoutineIncludeExcludeInstructionSource.DatabaseMetadata;
                    instruction.Excluded = !!this.jsDALMetadata.jsDAL.exclude;
                    if (instruction.Excluded) instruction.Reason = "T-SQL metadata";
                }
                else if (!this.jsDALMetadata.jsDAL.exclude) {
                    instruction.Source = RoutineIncludeExcludeInstructionSource.DatabaseMetadata;
                    instruction.Included = this.jsDALMetadata.jsDAL.include;
                    if (instruction.Included) instruction.Reason = "T-SQL metadata";
                }
            }
        }

        if (instruction.Reason != null) return instruction;

        // apply DB source level
        dbSource.Rules.forEach(dbRule => {

            if (dbRule == null) return;

            if (dbRule.apply(this)) {
                if (dbSource.DefaultRuleMode == DefaultRuleMode.ExcludeAll) {
                    instruction.Included = true;
                    instruction.Reason = dbRule.toString();
                }
                else if (dbSource.DefaultRuleMode == DefaultRuleMode.IncludeAll) {
                    instruction.Excluded = true;
                    instruction.Reason = dbRule.toString();
                }
                else throw "Unsupported DefaultRuleMode: " + dbSource.DefaultRuleMode;

                instruction.Rule = dbRule;
                instruction.Source = RoutineIncludeExcludeInstructionSource.DbSourceLevel;

                return instruction;
            }
        });



        if (instruction.Rule != null) return instruction;

        // apply JSFile level
        if (jsFileContext != null) {

            jsFileContext.Rules.forEach(fileRule => {

                if (fileRule == null) return;

                if (fileRule.apply(this)) {
                    if (dbSource.DefaultRuleMode == DefaultRuleMode.ExcludeAll) {
                        instruction.Included = true;
                        instruction.Reason = fileRule.toString(); // TODO: Consider recording a more substantial reference to the rule
                    }
                    else if (dbSource.DefaultRuleMode == DefaultRuleMode.IncludeAll) {
                        instruction.Excluded = true;
                        instruction.Reason = fileRule.toString();
                    }
                    else throw "Unsupported DefaultRuleMode: " + dbSource.DefaultRuleMode;

                    instruction.Rule = fileRule;
                    instruction.Source = RoutineIncludeExcludeInstructionSource.JsFileLevel;

                    return instruction;
                }

            });

        }

        if (dbSource.DefaultRuleMode == DefaultRuleMode.ExcludeAll) instruction.Excluded = true;
        else instruction.Included = true;

        instruction.Rule = null;
        instruction.Source = RoutineIncludeExcludeInstructionSource.DbSourceLevel;
        instruction.Reason = "Default";
        return instruction;
    }
}