import { BaseRule, RuleType } from './base-rule'
import { CachedRoutine } from './../cache/cached-routine'

export class RegexRule extends BaseRule {
    public Match: string;

    constructor (match?:string)
    {
        super();
        this.Match = match;
    }

    public Apply(routine: CachedRoutine): boolean {
        //var reg = new RegExp(this.Match.Replace("\\", "\\\\"), RegexOptions.None);
        var reg = new RegExp(this.Match);

        return reg.test(routine.Routine);


    }

    public get RuleProcessOrder(): number { return 2; }
    public get Type(): RuleType { return RuleType.Regex; }
    public toString() { return this.Match; }
}
 