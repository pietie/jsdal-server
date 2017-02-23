"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var jsfile_1 = require("./jsfile");
var base_rule_1 = require("./base-rule");
var connection_1 = require("./connection");
var cached_routine_1 = require("./cache/cached-routine");
var fs = require("fs");
var path = require("path");
var shelljs = require("shelljs");
var shortid = require("shortid");
var SqlConnectionStringBuilder = require("node-connection-string-builder");
var sql = require("mssql");
var DatabaseSource = (function () {
    function DatabaseSource() {
        this.JsFiles = [];
        this.Rules = [];
        this.ExecutionConnections = [];
        this.CachedRoutineList = [];
    }
    Object.defineProperty(DatabaseSource.prototype, "userID", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
            return this._connectionStringBuilder.userID;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DatabaseSource.prototype, "password", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
            return this._connectionStringBuilder.password;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DatabaseSource.prototype, "dataSource", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
            return this._connectionStringBuilder.dataSource;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DatabaseSource.prototype, "initialCatalog", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
            return this._connectionStringBuilder.initialCatalog;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DatabaseSource.prototype, "integratedSecurity", {
        get: function () {
            if (this._connectionStringBuilder == null)
                this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
            return this._connectionStringBuilder.integratedSecurity;
        },
        enumerable: true,
        configurable: true
    });
    DatabaseSource.createFromJson = function (rawJson) {
        var dbSource = new DatabaseSource();
        dbSource.Name = rawJson.Name;
        dbSource.CacheKey = rawJson.CacheKey;
        dbSource.WhitelistedDomainsCsv = rawJson.WhitelistedDomainsCsv;
        dbSource.WhitelistAllowAllPrivateIPs = rawJson.WhitelistAllowAllPrivateIPs;
        dbSource.JsNamespace = rawJson.JsNamespace;
        dbSource.IsOrmInstalled = rawJson.IsOrmInstalled;
        dbSource.DefaultRuleMode = rawJson.DefaultRuleMode;
        dbSource.LastUpdateDate = rawJson.LastUpdateDate;
        dbSource.Plugins = rawJson.Plugins;
        dbSource.MetadataConnection = connection_1.Connection.createFromJson(rawJson.MetadataConnection);
        for (var i = 0; i < rawJson.ExecutionConnections.length; i++) {
            dbSource.ExecutionConnections.push(connection_1.Connection.createFromJson(rawJson.ExecutionConnections[i]));
        }
        for (var i = 0; i < rawJson.JsFiles.length; i++) {
            dbSource.JsFiles.push(jsfile_1.JsFile.createFromJson(rawJson.JsFiles[i]));
        }
        for (var i = 0; i < rawJson.Rules.length; i++) {
            dbSource.Rules.push(base_rule_1.BaseRule.createFromJson(rawJson.Rules[i]));
        }
        //console.log(dbSource);
        return dbSource;
    };
    DatabaseSource.prototype.addToCache = function (maxRowDate, newCachedRoutine) {
        if (this.CacheKey == null)
            this.CacheKey = shortid.generate();
        if (this.CachedRoutineList == null) {
            this.CachedRoutineList = [];
        }
        //        lock(CachedRoutineList)
        {
            // get those items that are existing and have been changed (Updated or Deleted)
            //!var changed = CachedRoutineList.Where(e => routineList.Count(chg => chg.Equals(e)) > 0).ToList();
            var changed = this.CachedRoutineList.filter(function (e) { return newCachedRoutine.equals(e); });
            if (changed.length > 0) {
                // remove existing cached version as it will just be added again below
                var ix = this.CachedRoutineList.indexOf(changed[0]);
                this.CachedRoutineList.splice(ix, 1);
            }
            else {
                console.log("NEW NEW NEW ROUTINE!!!?", newCachedRoutine);
            }
            this.CachedRoutineList.push(newCachedRoutine);
        }
    };
    DatabaseSource.prototype.loadCache = function () {
        var _this = this;
        try {
            var cachePath = "./test/cache";
            if (!fs.existsSync(cachePath))
                return;
            var cacheFilePath = path.join(cachePath, this.CacheKey + ".json");
            if (!fs.existsSync(cacheFilePath))
                return;
            this.CachedRoutineList = [];
            fs.readFile(cacheFilePath, { encoding: "utf8" }, function (err, data) {
                if (!err) {
                    var allCacheEntries = JSON.parse(data);
                    for (var i = 0; i < allCacheEntries.length; i++) {
                        _this.CachedRoutineList.push(cached_routine_1.CachedRoutine.createFromJson(allCacheEntries[i]));
                    }
                }
                else {
                }
            });
        }
        catch (ex) {
            //SessionLog.Exception(ex);
            throw ex; // TODO: HANDLE!!!!
        }
    };
    DatabaseSource.prototype.saveCache = function () {
        try {
            var cachePath = "./test/cache";
            if (!fs.existsSync(cachePath)) {
                try {
                    shelljs.mkdir('-p', cachePath);
                }
                catch (e) {
                }
            }
            var cacheFilePath = path.join(cachePath, this.CacheKey + ".json");
            var json = JSON.stringify(this.CachedRoutineList);
            fs.writeFileSync(cacheFilePath, json, { encoding: "utf8" });
        }
        catch (ex) {
            throw ex; // TODO: handle
        }
    };
    Object.defineProperty(DatabaseSource.prototype, "cache", {
        get: function () { return this.CachedRoutineList; },
        enumerable: true,
        configurable: true
    });
    DatabaseSource.prototype.addUpdateDatabaseConnection = function (isMetadataConnection, dbConnectionGuid, logicalName, dataSource, catalog, username, password) {
        if (isMetadataConnection) {
            if (this.MetadataConnection == null)
                this.MetadataConnection = new connection_1.Connection();
            this.MetadataConnection.update(logicalName, dataSource, catalog, username, password);
        }
        else {
            if (this.ExecutionConnections == null)
                this.ExecutionConnections = [];
            if (!dbConnectionGuid) {
                // add new
                var connection = new connection_1.Connection();
                connection.update(logicalName, dataSource, catalog, username, password);
                connection.Guid = shortid.generate(); // TODO: Needs to move into constructor of Connection or something like Connection.create(..).
                this.ExecutionConnections.push(connection);
            }
            else {
                var existing = this.ExecutionConnections.find(function (c) { return c.Guid == dbConnectionGuid; });
                if (existing == null) {
                    return { success: false, userError: "The specified connection does not exist and cannot be updated." };
                }
                existing.update(logicalName, dataSource, catalog, username, password);
            }
        }
        return { success: true };
    };
    DatabaseSource.prototype.deleteDatabaseConnection = function (dbConnectionGuid) {
        var existing = this.ExecutionConnections.find(function (c) { return c.Guid == dbConnectionGuid; });
        if (existing == null) {
            return { success: false, userError: "The specified connection does not exist and cannot be updated." };
        }
        this.ExecutionConnections.splice(this.ExecutionConnections.indexOf(existing), 1);
        return { success: true };
    };
    DatabaseSource.prototype.checkForMissingOrmPreRequisitesOnDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var sqlScript, sqlConfig, con, request, res;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    sqlScript = fs.readFileSync("./resources/check-pre-requisites.sql", { encoding: "utf8" });
                                    sqlConfig = {
                                        user: this.MetadataConnection.userID,
                                        password: this.MetadataConnection.password,
                                        server: this.MetadataConnection.dataSource,
                                        database: this.MetadataConnection.initialCatalog,
                                        stream: false,
                                        options: {
                                            encrypt: true
                                        }
                                    };
                                    return [4 /*yield*/, new sql.Connection(sqlConfig).connect().catch(function (err) {
                                            // TODO: Handle connection error
                                            console.log("connection error", err);
                                            reject(err);
                                        })];
                                case 1:
                                    con = _a.sent();
                                    request = new sql.Request(con);
                                    request.output('err', sql.VarChar, null);
                                    return [4 /*yield*/, request.query(sqlScript).catch(function (e) { return reject(e); })];
                                case 2:
                                    res = _a.sent();
                                    con.close();
                                    resolve(request.parameters["err"].value);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseSource.prototype.InstallOrm = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var installSqlScript, sqlConfig, con, request, e_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    installSqlScript = fs.readFileSync("./resources/install-orm.sql", { encoding: "utf8" });
                                    ;
                                    sqlConfig = {
                                        user: this.MetadataConnection.userID,
                                        password: this.MetadataConnection.password,
                                        server: this.MetadataConnection.dataSource,
                                        database: this.MetadataConnection.initialCatalog,
                                        stream: false,
                                        options: {
                                            encrypt: true
                                        }
                                    };
                                    return [4 /*yield*/, new sql.Connection(sqlConfig).connect().catch(function (err) {
                                            reject(err);
                                        })];
                                case 1:
                                    con = _a.sent();
                                    request = new sql.Request(con);
                                    request.output('err', sql.VarChar, null);
                                    return [4 /*yield*/, request.query(installSqlScript).catch(function (e) { return reject(e); })];
                                case 2:
                                    _a.sent();
                                    con.close();
                                    resolve(true);
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_1 = _a.sent();
                                    reject(e_1);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseSource.prototype.UnInstallOrm = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var sqlConfig, con, request, e_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    sqlConfig = {
                                        user: this.MetadataConnection.userID,
                                        password: this.MetadataConnection.password,
                                        server: this.MetadataConnection.dataSource,
                                        database: this.MetadataConnection.initialCatalog,
                                        stream: false,
                                        options: {
                                            encrypt: true
                                        }
                                    };
                                    return [4 /*yield*/, new sql.Connection(sqlConfig).connect().catch(function (err) {
                                            reject(err);
                                        })];
                                case 1:
                                    con = _a.sent();
                                    request = new sql.Request(con);
                                    return [4 /*yield*/, request.execute("orm.Uninstall").catch(function (e) { return reject(e); })];
                                case 2:
                                    _a.sent();
                                    con.close();
                                    resolve(true);
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_2 = _a.sent();
                                    reject(e_2);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseSource.prototype.clearCache = function () {
        try {
            var cachePath = "./test/cache";
            if (!fs.existsSync(cachePath))
                return;
            var cacheFilePath = path.join(cachePath, this.CacheKey + ".json");
            if (!fs.existsSync(cacheFilePath))
                return;
            this.CachedRoutineList = [];
            // delete cache file
            fs.unlinkSync(cacheFilePath);
            // TODO: Not sure about this
            //! GeneratorThreadDispatcher.ResetMaxRowDate(this);
            this.LastUpdateDate = new Date();
        }
        catch (ex) {
            //SessionLog.Exception(ex);
            throw ex; // TODO: HANDLE!!!!
        }
    };
    DatabaseSource.prototype.updatePluginList = function (pluginList) {
        var _this = this;
        this.Plugins = [];
        if (!pluginList)
            return;
        pluginList.forEach(function (p) {
            var included = p.Included;
            if (included)
                _this.Plugins.push(p);
        });
        return { success: true };
    };
    DatabaseSource.prototype.addJsFile = function (name) {
        if (this.JsFiles == null)
            this.JsFiles = [];
        var existing = this.JsFiles.find(function (f) { return f.Filename.toLowerCase() == name.toLowerCase(); });
        if (existing != null) {
            return { success: false, userError: "The output file '" + name + "' already exists against this data source." };
        }
        var jsfile = new jsfile_1.JsFile();
        jsfile.Filename = name;
        this.JsFiles.push(jsfile);
        return { success: true };
    };
    return DatabaseSource;
}());
exports.DatabaseSource = DatabaseSource;
