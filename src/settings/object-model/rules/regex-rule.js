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
var RegexRule = (function (_super) {
    __extends(RegexRule, _super);
    function RegexRule(match) {
        var _this = _super.call(this) || this;
        _this.Match = match;
        _this.Type = base_rule_1.RuleType.Regex;
        return _this;
    }
    RegexRule.createFromJson = function (rawJson) {
        var ret = new RegexRule();
        ret.Match = rawJson.Match;
        return ret;
    };
    RegexRule.prototype.apply = function (routine) {
        //var reg = new RegExp(this.Match.Replace("\\", "\\\\"), RegexOptions.None);
        var reg = new RegExp(this.Match);
        return reg.test(routine.Routine);
    };
    Object.defineProperty(RegexRule.prototype, "RuleProcessOrder", {
        get: function () { return 2; },
        enumerable: true,
        configurable: true
    });
    RegexRule.prototype.toString = function () { return this.Match; };
    return RegexRule;
}(base_rule_1.BaseRule));
exports.RegexRule = RegexRule;
//# sourceMappingURL=regex-rule.js.map