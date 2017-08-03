"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rules_1 = require("./rules");
const shortid = require("shortid");
class JsFile {
    constructor(guid) {
        this.Rules = [];
        this.Guid = guid;
        this.Version = 1;
    }
    static get DBLevel() { return JsFile._dbLevel; }
    incrementVersion() {
        this.Version++;
    }
    static createFromJson(rawJson) {
        let jsfile = new JsFile();
        jsfile.Filename = rawJson.Filename;
        jsfile.Guid = rawJson.Guid;
        jsfile.Version = parseInt(rawJson.Version);
        if (isNaN(jsfile.Version))
            jsfile.Version = 1;
        for (let i = 0; i < rawJson.Rules.length; i++) {
            jsfile.Rules.push(rules_1.BaseRule.createFromJson(rawJson.Rules[i]));
        }
        return jsfile;
    }
    addRule(ruleType, txt) {
        let rule = null;
        switch (ruleType) {
            case rules_1.RuleType.Schema:
                rule = new rules_1.SchemaRule(txt);
                break;
            case rules_1.RuleType.Specific:
                {
                    var parts = txt.split('.');
                    var schema = "dbo";
                    var name = txt;
                    if (parts.length > 1) {
                        schema = parts[0];
                        name = parts[1];
                    }
                    rule = new rules_1.SpecificRule(schema, name);
                }
                break;
            case rules_1.RuleType.Regex:
                {
                    try {
                        var regexTest = new RegExp(txt);
                    }
                    catch (ex) {
                        return {
                            success: false, userErrorMsg: "Invalid regex pattern: " + ex.toString()
                        };
                    }
                    rule = new rules_1.RegexRule(txt);
                    break;
                }
            default:
                throw `Unsupported rule type: ${ruleType}`;
        }
        rule.Guid = shortid.generate();
        this.Rules.push(rule);
        return { success: true };
    }
    deleteRule(ruleGuid) {
        var existingRule = this.Rules.find(r => r.Guid == ruleGuid);
        if (existingRule == null) {
            return { success: false, userErrorMsg: "The specified rule was not found." };
        }
        this.Rules.splice(this.Rules.indexOf(existingRule), 1);
        return { success: true };
    }
}
JsFile._dbLevel = new JsFile("DbLevel");
exports.JsFile = JsFile;
//# sourceMappingURL=jsfile.js.map