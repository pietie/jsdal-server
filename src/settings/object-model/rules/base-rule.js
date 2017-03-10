"use strict";
var BaseRule = (function () {
    function BaseRule() {
    }
    BaseRule.createFromJson = function (rawJson) {
        var rule = null;
        // TODO: IMPLEMENT - factory based on Type?!
        return rule;
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