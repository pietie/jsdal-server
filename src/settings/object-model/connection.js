"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SqlConnectionStringBuilder = require("node-connection-string-builder");
const crypto = require("crypto");
const keypair = require("keypair");
const fs = require("fs");
const KEY_FILEPATH = "./conn.key";
let algorithm = 'aes-256-ctr';
let connectionPrivateKey = null;
function encrypt(text) {
    var cipher = crypto.createCipher(algorithm, connectionPrivateKey);
    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}
function decrypt(text) {
    var decipher = crypto.createDecipher(algorithm, connectionPrivateKey);
    var dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}
// setup the connection private key used for encryption/decryption if it does not already exist
if (!fs.existsSync(KEY_FILEPATH)) {
    try {
        console.log("Creating private key for Connections...");
        let newKey = keypair().private;
        fs.writeFileSync(KEY_FILEPATH, newKey, { encoding: "utf8" });
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
class Connection {
    constructor() {
        this.Unsafe = false; // if set true it means the ConnectionString is not encrypted
    }
    toJSON() {
        return {
            Name: this.Name,
            Guid: this.Guid,
            ConnectionString: this.ConnectionString,
            Unsafe: this.Unsafe
        };
    }
    get userID() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.userID;
    }
    get password() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.password;
    }
    get dataSource() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.dataSource;
    }
    get initialCatalog() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.initialCatalog;
    }
    get integratedSecurity() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
        return this._connectionStringBuilder.integratedSecurity;
    }
    static createFromJson(rawJson) {
        let connection = new Connection();
        connection.Name = rawJson.Name;
        connection.Guid = rawJson.Guid;
        connection.ConnectionString = rawJson.ConnectionString;
        connection.Unsafe = !!rawJson.Unsafe;
        return connection;
    }
    get ConnectionStringDecrypted() {
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
    update(name, dataSource, catalog, username, password) {
        let connectionString = null;
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
exports.Connection = Connection;
//# sourceMappingURL=connection.js.map