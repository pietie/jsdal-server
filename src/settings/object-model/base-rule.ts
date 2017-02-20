export class BaseRule {

    public Name: string;
    public Guid: string;
    public RuleProcessOrder: number;
    public Type: number; // TODO: Enum...

    public static createFromJson(rawJson: any): BaseRule {

        let rule:BaseRule = null;

        // TODO: IMPLEMENT - factory based on Type?!


        return rule;
    }
}