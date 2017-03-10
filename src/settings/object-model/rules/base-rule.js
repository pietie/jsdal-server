"use strict";
var _1 = require("./");
var BaseRule = (function () {
    function BaseRule() {
        this.Type = -1;
    }
    BaseRule.createFromJson = function (rawJson) {
        var ret = null;
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
    };
    BaseRule.prototype.apply = function (routine) {
        throw "Not implemented";
    };
    BaseRule.prototype.toString = function () {
        return this.Name;
    };
    return BaseRule;
}());
exports.BaseRule = BaseRule;
var RuleType;
(function (RuleType) {
    RuleType[RuleType["Schema"] = 0] = "Schema";
    RuleType[RuleType["Specific"] = 1] = "Specific";
    RuleType[RuleType["Regex"] = 2] = "Regex";
})(RuleType = exports.RuleType || (exports.RuleType = {}));
//# sourceMappingURL=base-rule.js.map