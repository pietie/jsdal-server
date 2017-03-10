"use strict";
var rules_1 = require("./rules");
var shortid = require("shortid");
var JsFile = (function () {
    function JsFile(guid) {
        this.Rules = [];
        this.Guid = guid;
    }
    Object.defineProperty(JsFile, "DBLevel", {
        get: function () { return JsFile._dbLevel; },
        enumerable: true,
        configurable: true
    });
    JsFile.createFromJson = function (rawJson) {
        var jsfile = new JsFile();
        jsfile.Filename = rawJson.Filename;
        jsfile.Guid = rawJson.Guid;
        jsfile.Version = rawJson.Version;
        for (var i = 0; i < rawJson.Rules; i++) {
            jsfile.Rules.push(rules_1.BaseRule.createFromJson(rawJson.Rules[i]));
        }
        return jsfile;
    };
    JsFile.prototype.addRule = function (ruleType, txt) {
        var rule = null;
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
                throw "Unsupported rule type: " + ruleType;
        }
        rule.Guid = shortid.generate();
        this.Rules.push(rule);
        return { success: true };
    };
    JsFile.prototype.deleteRule = function (ruleGuid) {
        var existingRule = this.Rules.find(function (r) { return r.Guid == ruleGuid; });
        if (existingRule == null) {
            return { success: false, userErrorMsg: "The specified rule was not found." };
        }
        this.Rules.splice(this.Rules.indexOf(existingRule), 1);
        return { success: true };
    };
    return JsFile;
}());
JsFile._dbLevel = new JsFile("DbLevel");
exports.JsFile = JsFile;
//# sourceMappingURL=jsfile.js.map