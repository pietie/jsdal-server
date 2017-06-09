import * as SqlConnectionStringBuilder from 'node-connection-string-builder';
import * as crypto from 'crypto';
import * as keypair from 'keypair';
import * as fs from 'fs';
import * as path from 'path';

const KEY_FILEPATH: string = "./conn.key";

let algorithm = 'aes-256-ctr';
let connectionPrivateKey: string = null;

function encrypt(text) {
    var cipher = crypto.createCipher(algorithm, connectionPrivateKey)
    var crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text) {
    var decipher = crypto.createDecipher(algorithm, connectionPrivateKey)
    var dec = decipher.update(text, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return dec;
}

// setup the connection private key used for encryption/decryption if it does not already exist
if (!fs.existsSync(KEY_FILEPATH)) {
    try {// TODO: Replace console.log and console.error with Session Log
        console.log("Creating private key for Connections...");
        console.log("\t", path.resolve(KEY_FILEPATH));

        let newKey = keypair().private;

        fs.writeFileSync(KEY_FILEPATH, newKey, { encoding: "utf8" });

        console.log("...private key created.");
    }
    catch (e) {
        console.error(e);
    }
}
else {
    try {
        connectionPrivateKey = fs.readFileSync(KEY_FILEPATH, { encoding: "utf8" });
    }
    catch (e) {
        // TODO: Handle and log error
    }
}

export class Connection {
    public Name: string;
    public Guid: string;
    public ConnectionString: string;

    public port: number;
    public instanceName: string;

    public Unsafe: boolean = false; // if set true it means the ConnectionString is not encrypted

    private _connectionStringBuilder: SqlConnectionStringBuilder;

    public toJSON() {
        return {
            Name: this.Name,
            Guid: this.Guid,
            ConnectionString: this.ConnectionString,
            Unsafe: this.Unsafe,
            port: this.port,
            instanceName: this.instanceName
        };
    }

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
        connection.port = rawJson.port != null ? rawJson.port : 1433;
        connection.instanceName = rawJson.instanceName;

        return connection;
    }

    private _descryptedConnectionString: string;

    public get ConnectionStringDecrypted(): string {

        if (!this._descryptedConnectionString) {
            if (this.Unsafe) {
                this._descryptedConnectionString = this.ConnectionString;
            }
            else {
                this._descryptedConnectionString = decrypt(this.ConnectionString);
            }
        }

        return this._descryptedConnectionString;
    }

    public update(name: string, dataSource: string, catalog: string, username: string, password: string, port: number, instanceName: string) {
        let connectionString: string = null;

        this.port = port;
        this.instanceName = instanceName;

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

        this.ConnectionString = encrypt(connectionString);
    }

}