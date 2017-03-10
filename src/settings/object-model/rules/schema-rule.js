"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var base_rule_1 = require("./base-rule");
var cached_routine_1 = require("./../cache/cached-routine");
var SchemaRule = (function (_super) {
    __extends(SchemaRule, _super);
    function SchemaRule(name) {
        var _this = _super.call(this) || this;
        _this.Name = name;
        return _this;
    }
    SchemaRule.prototype.Apply = function (routine) {
        if (routine instanceof cached_routine_1.CachedRoutine) {
            console.log("CachedRoutine leg called");
            return routine.Schema.toLowerCase() == this.Name.toLowerCase();
        }
        else {
            console.log("<any> leg called");
            return routine.SchemaName.toLowerCase() == this.Name.toLowerCase();
        }
    };
    Object.defineProperty(SchemaRule.prototype, "RuleProcessOrder", {
        get: function () { return 1; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SchemaRule.prototype, "Type", {
        get: function () { return base_rule_1.RuleType.Schema; },
        enumerable: true,
        configurable: true
    });
    return SchemaRule;
}(base_rule_1.BaseRule));
exports.SchemaRule = SchemaRule;
//# sourceMappingURL=schema-rule.js.map