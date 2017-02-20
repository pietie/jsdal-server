import { BaseRule } from './base-rule'

export class JsFile {
    public Filename: string;
    public Guid: string;
    public Version: number;
    public Rules: BaseRule[];

    constructor()
    {
        this.Rules = [];
    }   

    public static createFromJson(rawJson: any): JsFile {
        let jsfile = new JsFile();

        jsfile.Filename = rawJson.Filename;
        jsfile.Guid = rawJson.Guid;
        jsfile.Version = rawJson.Version;

        for (let i = 0; i < rawJson.Rules;i++)
        {
            jsfile.Rules.push(BaseRule.createFromJson(rawJson.Rules[i]));
        }

        return jsfile;
    }
}