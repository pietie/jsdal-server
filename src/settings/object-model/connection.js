"use strict";
var SqlConnectionStringBuilder = require("node-connection-string-builder");
var crypto = require("crypto");
var keypair = require("keypair");
var fs = require("fs");
var KEY_FILEPATH = "./conn.key";
var algorithm = 'aes-256-ctr';
var connectionPrivateKey = null;
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
        var newKey = keypair().private;
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
    }
}
var Connection = (function () {
    function Connection() {
        this.Unsafe = false; // if set true it means the ConnectionString is not encrypted
    }
    Connection.prototype.toJSON = function () {
        return {
            Name: this.Name,
            Guid: this.Guid,
            ConnectionString: this.ConnectionString,
            Unsafe: this.Unsafe
        };
    };
    Object.defineProperty(Connection.prototype, "userID", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
            return this._connectionStringBuilder.userID;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Connection.prototype, "password", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
            return this._connectionStringBuilder.password;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Connection.prototype, "dataSource", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
            return this._connectionStringBuilder.dataSource;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Connection.prototype, "initialCatalog", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
            return this._connectionStringBuilder.initialCatalog;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Connection.prototype, "integratedSecurity", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.ConnectionStringDecrypted);
            return this._connectionStringBuilder.integratedSecurity;
        },
        enumerable: true,
        configurable: true
    });
    Connection.createFromJson = function (rawJson) {
        var connection = new Connection();
        connection.Name = rawJson.Name;
        connection.Guid = rawJson.Guid;
        connection.ConnectionString = rawJson.ConnectionString;
        connection.Unsafe = !!rawJson.Unsafe;
        return connection;
    };
    Object.defineProperty(Connection.prototype, "ConnectionStringDecrypted", {
        get: function () {
            if (!this._descryptedConnectionString) {
                if (this.Unsafe) {
                    this._descryptedConnectionString = this.ConnectionString;
                }
                else {
                    this._descryptedConnectionString = decrypt(this.ConnectionString);
                }
            }
            return this._descryptedConnectionString;
        },
        enumerable: true,
        configurable: true
    });
    Connection.prototype.update = function (name, dataSource, catalog, username, password) {
        var connectionString = null;
        if (username && username.trim() != "") {
            connectionString = "Data Source=" + dataSource + ";Initial Catalog=" + catalog + ";Persist Security Info=False;User ID=" + username + ";Password=" + password;
        }
        else {
            // use windows auth
            connectionString = "Data Source=" + dataSource + ";Initial Catalog=" + catalog + ";Persist Security Info=False; Integrated Security=sspi";
        }
        this.Name = name;
        this._descryptedConnectionString = null;
        this._connectionStringBuilder = null;
        this.ConnectionString = encrypt(connectionString);
    };
    return Connection;
}());
exports.Connection = Connection;
//# sourceMappingURL=connection.js.map