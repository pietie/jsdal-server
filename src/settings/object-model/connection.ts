import * as SqlConnectionStringBuilder from 'node-connection-string-builder';

export class Connection {
    public Name: string;
    public Guid: string;
    public ConnectionString: string;

    public Unsafe: boolean = false; // if set true it means the ConnectionString is not encrypted

    private _connectionStringBuilder: SqlConnectionStringBuilder;

    public get userID(): string {

        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.userID;
    }

    public get password(): string {

        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.password;
    }

    public get dataSource(): string {

        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.dataSource;

    }

    public get initialCatalog(): string {
        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.initialCatalog;

    }

    public get integratedSecurity(): boolean {
        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.integratedSecurity;
    }    

    public static createFromJson(rawJson: any): Connection {

        let connection = new Connection();

        connection.Name = rawJson.Name;
        connection.Guid = rawJson.Guid;
        connection.ConnectionString = rawJson.ConnectionString;
        connection.Unsafe = !!rawJson.Unsafe;

        return connection;
    }

    private _descryptedConnectionString: string;

    public get ConnectionStringDecrypted(): string {

        if (!this._descryptedConnectionString) {
            if (this.Unsafe) {
                this._descryptedConnectionString = this.ConnectionString;
            }
            else {
                this._descryptedConnectionString = "TODO: decrypt using key from config or somewhere...  ";
            }
        }

        return this._descryptedConnectionString;
    }

    public update(name: string, dataSource: string, catalog: string, username: string, password: string) {
        let connectionString: string = null;

        if (username && username.trim() != "") {
            connectionString = `Data Source=${dataSource};Initial Catalog=${catalog};Persist Security Info=False;User ID=${username};Password=${password}`;
        }
        else {
            // use windows auth
            connectionString = `Data Source=${dataSource};Initial Catalog=${catalog};Persist Security Info=False; Integrated Security=sspi`;
        }

        this.Name = name;

        this._descryptedConnectionString = null;
        this._connectionStringBuilder = null;

        // TODO: !!!
        //!var encryptedConnectionString = Encryption.AESThenHMAC.SimpleEncryptWithPassword(connectionString, ConnectionStringEncPassword);
        //!this.ConnectionString = encryptedConnectionString;

    }

}