import { BaseRule, RuleType, SpecificRule, SchemaRule, RegexRule } from './rules'
import * as shortid from 'shortid'

export class JsFile {
    public static _dbLevel: JsFile = new JsFile("DbLevel");
    public static get DBLevel(): JsFile { return JsFile._dbLevel }

 
    public Filename: string;
    public Guid: string;
    public Version: number;
    public Rules: BaseRule[];

    constructor(guid?: string) {
        this.Rules = [];
        this.Guid = guid;
        this.Version = 1;
    }
    
    public incrementVersion()
    {
        this.Version++;
    }

    public static createFromJson(rawJson: any): JsFile {
        let jsfile = new JsFile();

        jsfile.Filename = rawJson.Filename;
        jsfile.Guid = rawJson.Guid;
        jsfile.Version = parseInt(rawJson.Version);

        if (isNaN(jsfile.Version)) jsfile.Version = 1;

        for (let i = 0; i < rawJson.Rules; i++) {
            jsfile.Rules.push(BaseRule.createFromJson(rawJson.Rules[i]));
        }

        return jsfile;
    }

    public addRule(ruleType: RuleType, txt: string): { success: boolean, userErrorMsg?: string } {
        let rule: BaseRule = null;

        switch (ruleType) // TODO: Check for duplicated rules?
        {
            case RuleType.Schema:
                rule = new SchemaRule(txt);
                break;
            case RuleType.Specific:
                {
                    var parts = txt.split('.');
                    var schema = "dbo";
                    var name = txt;

                    if (parts.length > 1) {
                        schema = parts[0];
                        name = parts[1];
                    }

                    rule = new SpecificRule(schema, name);
                }
                break;
            case RuleType.Regex:
                {
                    try {
                        var regexTest = new RegExp(txt);
                    }
                    catch (ex) {
                        return {
                            success: false, userErrorMsg: "Invalid regex pattern: " + ex.toString()
                        }
                    }

                    rule = new RegexRule(txt);
                    break;
                }
            default:
                throw `Unsupported rule type: ${ruleType}`;
        }

        rule.Guid = shortid.generate();

        this.Rules.push(rule);

        return { success: true };
    }

    public deleteRule(ruleGuid: string): { success: boolean, userErrorMsg?: string } {
        var existingRule = this.Rules.find(r => r.Guid == ruleGuid);

        if (existingRule == null) {
            return { success: false, userErrorMsg: "The specified rule was not found." };
        }

        this.Rules.splice(this.Rules.indexOf(existingRule), 1);

        return { success: true };
    }

}