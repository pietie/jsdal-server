import { CachedRoutine } from './../cache/cached-routine'

import { SchemaRule, SpecificRule, RegexRule } from './'

export class BaseRule {

    public Name: string;
    public Guid: string;
    public RuleProcessOrder: number;
    public Type: number = -1; 

    public static createFromJson(rawJson: any): BaseRule {
        
        let ret: BaseRule = null;
        switch(rawJson.Type)
        {
            case RuleType.Schema: ret = SchemaRule.createFromJson(rawJson); break;
            case RuleType.Specific: ret = SpecificRule.createFromJson(rawJson); break;
            case RuleType.Regex: ret = RegexRule.createFromJson(rawJson); break;
            default: throw "Unsupported rule type: " + rawJson.Type;
        }

        ret.Guid = rawJson.Guid;

        return ret;
    }

    public apply(routine: CachedRoutine): boolean {
        throw "Not implemented";
    }

    public toString() {
        return this.Name;
    }
}

export enum RuleType {
    Schema = 0,
    Specific = 1,
    Regex = 2
} 