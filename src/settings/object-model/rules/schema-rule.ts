import { BaseRule, RuleType } from './base-rule'
import { CachedRoutine } from './../cache/cached-routine'

export class SchemaRule extends BaseRule {
    constructor(name?: string)
    {
        super();
        this.Name = name;        
    }
    
    public Apply(routine: CachedRoutine | any): boolean {
        if (routine instanceof CachedRoutine) {
            console.log("CachedRoutine leg called");
            return routine.Schema.toLowerCase() == this.Name.toLowerCase();
        }
        else {
            console.log("<any> leg called");
            return routine.SchemaName.toLowerCase() == this.Name.toLowerCase();
        }
    }
    public get RuleProcessOrder(): number { return 1; }
    public get Type(): RuleType { return RuleType.Schema; }
}