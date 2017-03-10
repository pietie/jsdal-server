import { BaseRule, RuleType } from './base-rule'
import { CachedRoutine } from './../cache/cached-routine'

export class RegexRule extends BaseRule {
    public Match: string;

    constructor (match?:string)
    {
        super();
        this.Match = match;
        this.Type = RuleType.Regex;
    }

    public static createFromJson(rawJson: any): BaseRule {
        let ret = new RegexRule();

        ret.Match = rawJson.Match;

        return ret;
    }

    public apply(routine: CachedRoutine): boolean {
        //var reg = new RegExp(this.Match.Replace("\\", "\\\\"), RegexOptions.None);
        var reg = new RegExp(this.Match);

        return reg.test(routine.Routine);


    }

    public get RuleProcessOrder(): number { return 2; }
    public toString() { return this.Match; }
}
 