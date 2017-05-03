"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_rule_1 = require("./base-rule");
class SpecificRule extends base_rule_1.BaseRule {
    constructor(schema, routine) {
        super();
        if (schema && routine) {
            // remove quoted identifier ('[..]') if present
            if (schema[0] == '[' && schema[schema.length - 1] == ']')
                schema = schema.substring(1, schema.length - 1);
            if (routine[0] == '[' && routine[routine.length - 1] == ']')
                routine = routine.substring(1, routine.length - 1);
        }
        this.Schema = schema;
        this.Routine = routine;
        this.Type = base_rule_1.RuleType.Specific;
    }
    static createFromJson(rawJson) {
        let ret = new SpecificRule();
        ret.Schema = rawJson.Schema;
        ret.Routine = rawJson.Routine;
        return ret;
    }
    apply(routine) {
        return routine.Schema.toLowerCase() == this.Schema.toLowerCase()
            && routine.Routine.toLowerCase() == this.Routine.toLowerCase();
    }
    get RuleProcessOrder() { return 0; }
    toString() {
        return `[${this.Schema}].[${this.Routine}]`;
    }
}
exports.SpecificRule = SpecificRule;
//# sourceMappingURL=specific-rule.js.map