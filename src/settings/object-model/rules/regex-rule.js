"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_rule_1 = require("./base-rule");
class RegexRule extends base_rule_1.BaseRule {
    constructor(match) {
        super();
        this.Match = match;
        this.Type = base_rule_1.RuleType.Regex;
    }
    static createFromJson(rawJson) {
        let ret = new RegexRule();
        ret.Match = rawJson.Match;
        return ret;
    }
    apply(routine) {
        //var reg = new RegExp(this.Match.Replace("\\", "\\\\"), RegexOptions.None);
        var reg = new RegExp(this.Match);
        return reg.test(routine.Routine);
    }
    get RuleProcessOrder() { return 2; }
    toString() { return this.Match; }
}
exports.RegexRule = RegexRule;
//# sourceMappingURL=regex-rule.js.map