import * as sql from 'mssql';

/*
  public class jsDALPlugin
    {
        public Dictionary<string, string> QueryString { get; private set; }

        public string Name { get; protected set; }
        public string Description { get; protected set; }

        private void InitPlugin(Dictionary<string, string> queryStringCollection)
        {
            this.QueryString = queryStringCollection;
        }

        public jsDALPlugin()
        {

        }

        public virtual void OnConnectionOpened(SqlConnection con) { }
    }
*/

export interface IJsDALPlugin {
    Name: string;
    Description: string;

    OnConnectionOpened(con: sql.Connection): Promise<void>;
}

class TestPlugin implements IJsDALPlugin {
    Name: string;
    Description: string;

    public OnConnectionOpened(con: sql.Connection): Promise<void> {
        return null;
    }

}