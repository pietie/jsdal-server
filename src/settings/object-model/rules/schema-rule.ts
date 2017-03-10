import { BaseRule, RuleType } from './base-rule'
import { CachedRoutine } from './../cache/cached-routine'

export class SchemaRule extends BaseRule {
    constructor(name?: string) {
        super();
        this.Name = name;
        this.Type = RuleType.Schema;
    }

    public static createFromJson(rawJson: any): BaseRule {
        let ret = new SchemaRule();

        ret.Name = rawJson.Name;

        return ret;
    }

    public apply(routine: CachedRoutine | any): boolean {
        return routine.Schema.toLowerCase() == this.Name.toLowerCase();
    }
    public get RuleProcessOrder(): number { return 1; }
}