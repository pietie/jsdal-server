import * as edge from 'edge-js';

let parseRoutine = edge.func(`

    #r "./refs/Microsoft.SqlServer.TransactSql.ScriptDom.dll"

    using System;
    using System.IO;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using Microsoft.SqlServer.TransactSql.ScriptDom;
    
    public class Startup
    {
        public async Task<object> Invoke(string routineDefinition)
        {
            try
            {
                var parser = new Microsoft.SqlServer.TransactSql.ScriptDom.TSql130Parser(true);
                IList<Microsoft.SqlServer.TransactSql.ScriptDom.ParseError> parseErrors;
                var visitor = new TsqlParserVisitor();

                using (var sr = new StringReader(routineDefinition))
                {
                    var fragment = parser.Parse(sr, out parseErrors);
                    fragment.Accept(visitor);
                }
                
                
                return new { Parameters = visitor.Parameters };
            }
            catch (Exception)
            {  
                return null;
            }
        }
    }

    public class TsqlParserVisitor : TSqlFragmentVisitor
    {
        public List<RoutineParsedParameter> Parameters { get; private set; }
        
		public TsqlParserVisitor()
		{
			this.Parameters = new List<RoutineParsedParameter>();
		}

		public override void Visit(ProcedureParameter node)
		{
			base.Visit(node);

			var valNode = node.Value as Literal;
			string defVal = null;
			LiteralType? defValType = null;
			
			if (valNode != null)
			{
				defVal = valNode.Value;
				defValType = valNode.LiteralType;
			}
			
			var parm = new RoutineParsedParameter {
				VariableName = node.VariableName.Value,
				SqlDataType = node.DataType.Name.BaseIdentifier.Value,
				DefaultValue = defVal,
				DefaultValueType = defValType

			};

			this.Parameters.Add(parm);
		}
    }

    public class RoutineParsedParameter
    {
        public string SqlDataType { get; set; }
        public string VariableName { get; set; }
        public string DefaultValue { get; set; }
        public Microsoft.SqlServer.TransactSql.ScriptDom.LiteralType? DefaultValueType { get; set; }
        public bool HasDefault { get { return !string.IsNullOrEmpty(this.DefaultValue); } }
    }    
`);

export class RoutineParser {
    //{SqlDataType: "DATETIME", VariableName: "@dateAndTime", DefaultValue: "null", DefaultValueType: "Null", HasDefault: true}
    public static parse(routineDefinition: string): Promise<{ Parameters: { SqlDataType: string, VariableName: string, DefaultValue: string, DefaultValueType: string, HasDefault: boolean }[]}> {
        return new Promise((resolve, reject) => {
            parseRoutine(routineDefinition, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
}

export class RoutineParseResult {
    constructor() {
        //this.Parameters = new List<RoutineParsedParameter>();
    }

    public jsDALMetadata: jsDALWrapper;
    //!  public Parameters: RoutineParsedParameter[];

}

export class jsDALWrapper {
    public jsDAL: jsDAL;
}

export class jsDAL {
    public include?: boolean;
    public exclude?: boolean;
    public cache?: jsDALCache;
}

export class jsDALCache {
    public hours?: number;
    public key: string;
}