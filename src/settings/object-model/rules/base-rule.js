"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require("./");
class BaseRule {
    constructor() {
        this.Type = -1;
    }
    static createFromJson(rawJson) {
        let ret = null;
        switch (rawJson.Type) {
            case RuleType.Schema:
                ret = _1.SchemaRule.createFromJson(rawJson);
                break;
            case RuleType.Specific:
                ret = _1.SpecificRule.createFromJson(rawJson);
                break;
            case RuleType.Regex:
                ret = _1.RegexRule.createFromJson(rawJson);
                break;
            default: throw "Unsupported rule type: " + rawJson.Type;
        }
        ret.Guid = rawJson.Guid;
        return ret;
    }
    apply(routine) {
        throw "Not implemented";
    }
    toString() {
        return this.Name;
    }
}
exports.BaseRule = BaseRule;
var RuleType;
(function (RuleType) {
    RuleType[RuleType["Schema"] = 0] = "Schema";
    RuleType[RuleType["Specific"] = 1] = "Specific";
    RuleType[RuleType["Regex"] = 2] = "Regex";
})(RuleType = exports.RuleType || (exports.RuleType = {}));
//# sourceMappingURL=base-rule.js.map