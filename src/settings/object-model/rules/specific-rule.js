"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var base_rule_1 = require("./base-rule");
var SpecificRule = (function (_super) {
    __extends(SpecificRule, _super);
    function SpecificRule(schema, routine) {
        var _this = _super.call(this) || this;
        if (schema && routine) {
            // remove quoted identifier ('[..]') if present
            if (schema[0] == '[' && schema[schema.length - 1] == ']')
                schema = schema.substring(1, schema.length - 1);
            if (routine[0] == '[' && routine[routine.length - 1] == ']')
                routine = routine.substring(1, routine.length - 1);
        }
        _this.Schema = schema;
        _this.Routine = routine;
        _this.Type = base_rule_1.RuleType.Specific;
        return _this;
    }
    SpecificRule.createFromJson = function (rawJson) {
        var ret = new SpecificRule();
        ret.Schema = rawJson.Schema;
        ret.Routine = rawJson.Routine;
        return ret;
    };
    SpecificRule.prototype.apply = function (routine) {
        return routine.Schema.toLowerCase() == this.Schema.toLowerCase()
            && routine.Routine.toLowerCase() == this.Routine.toLowerCase();
    };
    Object.defineProperty(SpecificRule.prototype, "RuleProcessOrder", {
        get: function () { return 0; },
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