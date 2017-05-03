"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_rule_1 = require("./base-rule");
class SchemaRule extends base_rule_1.BaseRule {
    constructor(name) {
        super();
        this.Name = name;
        this.Type = base_rule_1.RuleType.Schema;
    }
    static createFromJson(rawJson) {
        let ret = new SchemaRule();
        ret.Name = rawJson.Name;
        return ret;
    }
    apply(routine) {
        return routine.Schema.toLowerCase() == this.Name.toLowerCase();
    }
    get RuleProcessOrder() { return 1; }
}
exports.SchemaRule = SchemaRule;
//# sourceMappingURL=schema-rule.js.map