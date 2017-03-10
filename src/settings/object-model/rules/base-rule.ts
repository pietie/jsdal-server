import { CachedRoutine } from './../cache/cached-routine'

export class BaseRule {

    public Name: string;
    public Guid: string;
    public RuleProcessOrder: number;
    public Type: number; // TODO: Enum...

    public static createFromJson(rawJson: any): BaseRule {

        let rule: BaseRule = null;

        // TODO: IMPLEMENT - factory based on Type?!


        return rule;
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