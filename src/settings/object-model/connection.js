"use strict";
var SqlConnectionStringBuilder = require("node-connection-string-builder");
var Connection = (function () {
    function Connection() {
        this.Unsafe = false; // if set true it means the ConnectionString is not encrypted
    }
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
                    this._descryptedConnectionString = "TODO: decrypt using key from config or somewhere...  ";
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
        // TODO: !!!
        //!var encryptedConnectionString = Encryption.AESThenHMAC.SimpleEncryptWithPassword(connectionString, ConnectionStringEncPassword);
        //!this.ConnectionString = encryptedConnectionString;
    };
    return Connection;
}());
exports.Connection = Connection;
