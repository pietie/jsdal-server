"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var base_rule_1 = require("./base-rule");
var SpecificRule = (function (_super) {
    __extends(SpecificRule, _super);
    function SpecificRule(schema, routine) {
        var _this = _super.call(this) || this;
        if (schema && routine) {
            // remove quoted identifier ('[..]') if present
            console.log("\tBEFORE: ", schema, routine);
            if (schema[0] == '[' && schema[schema.length - 1] == ']')
                schema = schema.substring(1, schema.length - 2);
            if (routine[0] == '[' && routine[routine.length - 1] == ']')
                routine = routine.substring(1, routine.length - 2);
            console.log("\tAFTER: ", schema, routine);
        }
        _this.Schema = schema;
        _this.Routine = routine;
        return _this;
    }
    SpecificRule.prototype.Apply = function (routine) {
        return routine.Schema.toLowerCase() == this.Schema.toLowerCase()
            && routine.Routine.toLowerCase() == this.Routine.toLowerCase();
    };
    Object.defineProperty(SpecificRule.prototype, "RuleProcessOrder", {
        get: function () { return 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SpecificRule.prototype, "Type", {
        get: function () { return base_rule_1.RuleType.Specific; },
        enumerable: true,
        configurable: true
    });
    SpecificRule.prototype.toString = function () {
        return "[" + this.Schema + "].[" + this.Routine + "]";
    };
    return SpecificRule;
}(base_rule_1.BaseRule));
exports.SpecificRule = SpecificRule;
//# sourceMappingURL=specific-rule.js.map