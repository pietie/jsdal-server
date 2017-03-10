"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var base_rule_1 = require("./base-rule");
var SchemaRule = (function (_super) {
    __extends(SchemaRule, _super);
    function SchemaRule(name) {
        var _this = _super.call(this) || this;
        _this.Name = name;
        _this.Type = base_rule_1.RuleType.Schema;
        return _this;
    }
    SchemaRule.createFromJson = function (rawJson) {
        var ret = new SchemaRule();
        ret.Name = rawJson.Name;
        return ret;
    };
    SchemaRule.prototype.apply = function (routine) {
        return routine.Schema.toLowerCase() == this.Name.toLowerCase();
    };
    Object.defineProperty(SchemaRule.prototype, "RuleProcessOrder", {
        get: function () { return 1; },
        enumerable: true,
        configurable: true
    });
    return SchemaRule;
}(base_rule_1.BaseRule));
exports.SchemaRule = SchemaRule;
//# sourceMappingURL=schema-rule.js.map