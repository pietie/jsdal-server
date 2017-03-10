import { BaseRule, RuleType } from './base-rule'
import { CachedRoutine } from './../cache/cached-routine'

export class SpecificRule extends BaseRule {

    public Schema: string;
    public Routine: string;

    constructor(schema?: string, routine?: string) {
        super();

        if (schema && routine) {
            // remove quoted identifier ('[..]') if present
            console.log("\tBEFORE: ", schema, routine);
            if (schema[0] == '[' && schema[schema.length - 1] == ']') schema = schema.substring(1, schema.length - 2);
            if (routine[0] == '[' && routine[routine.length - 1] == ']') routine = routine.substring(1, routine.length - 2);
            console.log("\tAFTER: ", schema, routine);
        }

        this.Schema = schema;
        this.Routine = routine;
        this.Type = RuleType.Specific;
    }

    public static createFromJson(rawJson: any): BaseRule {
        let ret = new SpecificRule();

        ret.Schema = rawJson.Schema;
        ret.Routine = rawJson.Routine;

        return ret;
    }

    public apply(routine: CachedRoutine): boolean {
        return routine.Schema.toLowerCase() == this.Schema.toLowerCase()
            && routine.Routine.toLowerCase() == this.Routine.toLowerCase()
            ;
    }
    public get RuleProcessOrder(): number { return 0; }

    public toString() {
        return `[${this.Schema}].[${this.Routine}]`;
    }
}
