"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsfile_1 = require("./jsfile");
const rules_1 = require("./rules");
const connection_1 = require("./connection");
const cached_routine_1 = require("./cache/cached-routine");
const fs = require("fs");
const path = require("path");
const shelljs = require("shelljs");
const shortid = require("shortid");
const SqlConnectionStringBuilder = require("node-connection-string-builder");
const sql = require("mssql");
const log_1 = require("./../../util/log");
const sql_config_builder_1 = require("./../../util/sql-config-builder");
var DefaultRuleMode;
(function (DefaultRuleMode) {
    DefaultRuleMode[DefaultRuleMode["IncludeAll"] = 0] = "IncludeAll";
    DefaultRuleMode[DefaultRuleMode["ExcludeAll"] = 1] = "ExcludeAll";
})(DefaultRuleMode = exports.DefaultRuleMode || (exports.DefaultRuleMode = {}));
class DatabaseSource {
    constructor() {
        this.JsFiles = [];
        this.Rules = [];
        this.ExecutionConnections = [];
        this.CachedRoutineList = [];
    }
    // customise JSON.stringify behaviour to make sure we don't serialise unwanted properties
    toJSON() {
        return {
            Name: this.Name,
            CacheKey: this.CacheKey,
            MetadataConnection: this.MetadataConnection,
            ExecutionConnections: this.ExecutionConnections,
            WhitelistedDomainsCsv: this.WhitelistedDomainsCsv,
            WhitelistAllowAllPrivateIPs: this.WhitelistAllowAllPrivateIPs,
            JsFiles: this.JsFiles,
            IsOrmInstalled: this.IsOrmInstalled,
            DefaultRuleMode: this.DefaultRuleMode,
            LastUpdateDate: this.LastUpdateDate,
            Plugins: this.Plugins,
            Rules: this.Rules
        };
    }
    get userID() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.userID;
    }
    get password() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.password;
    }
    get dataSource() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.dataSource;
    }
    get initialCatalog() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.initialCatalog;
    }
    get integratedSecurity() {
        if (this._connectionStringBuilder == null)
            this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.integratedSecurity;
    }
    get port() {
        return this.MetadataConnection.port;
    }
    get instanceName() {
        return this.MetadataConnection.instanceName;
    }
    static createFromJson(rawJson) {
        let dbSource = new DatabaseSource();
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
        for (let i = 0; i < rawJson.ExecutionConnections.length; i++) {
            dbSource.ExecutionConnections.push(connection_1.Connection.createFromJson(rawJson.ExecutionConnections[i]));
        }
        for (let i = 0; i < rawJson.JsFiles.length; i++) {
            dbSource.JsFiles.push(jsfile_1.JsFile.createFromJson(rawJson.JsFiles[i]));
        }
        for (let i = 0; i < rawJson.Rules.length; i++) {
            dbSource.Rules.push(rules_1.BaseRule.createFromJson(rawJson.Rules[i]));
        }
        //console.log(dbSource);
        return dbSource;
    }
    addToCache(maxRowDate, newCachedRoutine) {
        if (this.CacheKey == null)
            this.CacheKey = shortid.generate();
        if (this.CachedRoutineList == null) {
            this.CachedRoutineList = [];
        }
        //        lock(CachedRoutineList)
        {
            // get those items that are existing and have been changed (Updated or Deleted)
            //!var changed = CachedRoutineList.Where(e => routineList.Count(chg => chg.Equals(e)) > 0).ToList();
            let changed = this.CachedRoutineList.filter(e => newCachedRoutine.equals(e));
            if (changed.length > 0) {
                // remove existing cached version as it will just be added again below
                let ix = this.CachedRoutineList.indexOf(changed[0]);
                this.CachedRoutineList.splice(ix, 1);
            }
            this.CachedRoutineList.push(newCachedRoutine);
        }
    }
    loadCache() {
        try {
            let cachePath = "./cache";
            if (!fs.existsSync(cachePath))
                return;
            let cacheFilePath = path.join(cachePath, `${this.CacheKey}.json`);
            if (!fs.existsSync(cacheFilePath))
                return;
            this.CachedRoutineList = [];
            let data = fs.readFileSync(cacheFilePath, { encoding: "utf8" });
            let allCacheEntries = JSON.parse(data);
            for (let i = 0; i < allCacheEntries.length; i++) {
                this.CachedRoutineList.push(cached_routine_1.CachedRoutine.createFromJson(allCacheEntries[i]));
            }
            /*
                        fs.readFile(cacheFilePath, { encoding: "utf8" }, (err, data) => {
                            if (!err) {
            
                                let allCacheEntries = JSON.parse(data);
            
                                for (let i = 0; i < allCacheEntries.length; i++) {
                                    this.CachedRoutineList.push(CachedRoutine.createFromJson(allCacheEntries[i]));
                                }
            
                            }
                            else {
                                // TODO: handle file read error
                                console.error("ERROR! Failed to read cache file", cacheFilePath);
                                console.log(err);
                            }
                        });
            
            */
        }
        catch (ex) {
            //SessionLog.Exception(ex);
            throw ex; // TODO: HANDLE!!!!
        }
    }
    saveCache() {
        try {
            let cachePath = "./cache";
            if (!fs.existsSync(cachePath)) {
                try {
                    shelljs.mkdir('-p', cachePath);
                }
                catch (e) {
                    // TODO: Log
                }
            }
            let cacheFilePath = path.join(cachePath, `${this.CacheKey}.json`);
            let json = JSON.stringify(this.CachedRoutineList);
            fs.writeFileSync(cacheFilePath, json, { encoding: "utf8" });
        }
        catch (ex) {
            throw ex; // TODO: handle
        }
    }
    get cache() { return this.CachedRoutineList; }
    addUpdateDatabaseConnection(isMetadataConnection, dbConnectionGuid, logicalName, dataSource, catalog, username, password, port, instanceName) {
        if (isMetadataConnection) {
            if (this.MetadataConnection == null)
                this.MetadataConnection = new connection_1.Connection();
            this.MetadataConnection.update(logicalName, dataSource, catalog, username, password, port, instanceName);
        }
        else {
            if (this.ExecutionConnections == null)
                this.ExecutionConnections = [];
            if (!dbConnectionGuid) {
                // add new
                let connection = new connection_1.Connection();
                connection.update(logicalName, dataSource, catalog, username, password, port, instanceName);
                connection.Guid = shortid.generate(); // TODO: Needs to move into constructor of Connection or something like Connection.create(..).
                this.ExecutionConnections.push(connection);
            }
            else {
                let existing = this.ExecutionConnections.find(c => c.Guid == dbConnectionGuid);
                if (existing == null) {
                    return { success: false, userError: "The specified connection does not exist and cannot be updated." };
                }
                existing.update(logicalName, dataSource, catalog, username, password, port, instanceName);
            }
        }
        return { success: true };
    }
    deleteDatabaseConnection(dbConnectionGuid) {
        var existing = this.ExecutionConnections.find(c => c.Guid == dbConnectionGuid);
        if (existing == null) {
            return { success: false, userError: "The specified connection does not exist and cannot be updated." };
        }
        this.ExecutionConnections.splice(this.ExecutionConnections.indexOf(existing), 1);
        return { success: true };
    }
    checkForMissingOrmPreRequisitesOnDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let sqlScript = fs.readFileSync("./resources/check-pre-requisites.sql", { encoding: "utf8" });
                let sqlConfig = sql_config_builder_1.SqlConfigBuilder.build(this.MetadataConnection);
                let con = yield new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                    // TODO: Handle connection error
                    console.log("connection error", err);
                    reject(err);
                });
                let request = new sql.Request(con);
                request.output('err', sql.VarChar, null);
                let res = yield request.query(sqlScript).catch(e => reject(e));
                con.close();
                resolve(request.parameters["err"].value);
            }));
        });
    }
    InstallOrm() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let installSqlScript = fs.readFileSync("./resources/install-orm.sql", { encoding: "utf8" });
                    ;
                    let sqlConfig = sql_config_builder_1.SqlConfigBuilder.build(this.MetadataConnection);
                    let con = yield new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                        reject(err);
                    });
                    let request = new sql.Request(con);
                    request.output('err', sql.VarChar, null);
                    yield request.query(installSqlScript).catch(e => reject(e));
                    con.close();
                    resolve(true);
                }
                catch (e) {
                    reject(e);
                }
            }));
        });
    }
    UnInstallOrm() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    var sqlConfig = {
                        user: this.MetadataConnection.userID,
                        password: this.MetadataConnection.password,
                        server: this.MetadataConnection.dataSource,
                        database: this.MetadataConnection.initialCatalog,
                        connectionTimeout: 1000 * 60,
                        requestTimeout: 1000 * 60,
                        stream: false,
                        options: {
                            encrypt: true
                        }
                    };
                    let con = yield new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                        reject(err);
                    });
                    let request = new sql.Request(con);
                    yield request.execute("orm.Uninstall").catch(e => reject(e));
                    con.close();
                    resolve(true);
                }
                catch (e) {
                    reject(e);
                }
            }));
        });
    }
    clearCache() {
        try {
            let cachePath = "./cache";
            if (!fs.existsSync(cachePath))
                return;
            let cacheFilePath = path.join(cachePath, `${this.CacheKey}.json`);
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
    }
    updatePluginList(pluginList) {
        this.Plugins = [];
        if (!pluginList)
            return;
        pluginList.forEach(p => {
            let included = p.Included;
            if (included)
                this.Plugins.push(p.Guid);
        });
        return { success: true };
    }
    isPluginIncluded(guid) {
        if (!this.Plugins)
            return false;
        return this.Plugins.find(g => g.toLowerCase() == guid.toLowerCase()) != null;
    }
    addJsFile(name) {
        if (this.JsFiles == null)
            this.JsFiles = [];
        var existing = this.JsFiles.find(f => f.Filename.toLowerCase() == name.toLowerCase());
        if (existing != null) {
            return { success: false, userError: `The output file '${name}' already exists against this data source.` };
        }
        let jsfile = new jsfile_1.JsFile();
        jsfile.Filename = name;
        jsfile.Guid = shortid.generate();
        this.JsFiles.push(jsfile);
        return { success: true };
    }
    addRule(ruleType, txt) {
        let rule = null;
        switch (ruleType) {
            case rules_1.RuleType.Schema:
                rule = new rules_1.SchemaRule(txt);
                break;
            case rules_1.RuleType.Specific:
                {
                    var parts = txt.split('.');
                    var schema = "dbo";
                    var name = txt;
                    if (parts.length > 1) {
                        schema = parts[0];
                        name = parts[1];
                    }
                    rule = new rules_1.SpecificRule(schema, name);
                }
                break;
            case rules_1.RuleType.Regex:
                {
                    try {
                        var regexTest = new RegExp(txt);
                    }
                    catch (ex) {
                        return { success: false, userErrorMsg: "Invalid regex pattern: " + ex.toString() };
                    }
                }
                rule = new rules_1.RegexRule(txt);
                break;
            default:
                throw `Unsupported rule type: ${ruleType}`;
        }
        rule.Guid = shortid.generate();
        this.Rules.push(rule);
        return { success: true };
    }
    deleteRule(ruleGuid) {
        var existingRule = this.Rules.find(r => r.Guid == ruleGuid);
        if (existingRule == null) {
            return { success: false, userErrorMsg: "The specified rule was not found." };
        }
        this.Rules.splice(this.Rules.indexOf(existingRule), 1);
        return { success: true };
    }
    applyDbLevelRules() {
        this.applyRules(jsfile_1.JsFile.DBLevel);
    }
    applyRules(jsFileContext) {
        if (this.CachedRoutineList == null)
            return;
        this.CachedRoutineList.forEach(routine => {
            if (routine.RuleInstructions == null)
                return;
            //if (routine.RuleInstructions.length == 1 
            //&& routine.RuleInstructions.First().Key == null) continue; // PL: No idea why this happens but when no rules exist RuleInstructions contains a single KeyValue pair that are both null...this causes routine.RuleInstructions[jsFileContext] to hang 
            delete routine.RuleInstructions[jsFileContext.Guid];
            if (routine.IsDeleted)
                return;
            let instruction = routine.applyRules(this, jsFileContext);
            routine.RuleInstructions[jsFileContext.Guid] = instruction;
        });
    }
    mayAccessDbSource(req) {
        if (this.WhitelistedDomainsCsv == null) {
            return { success: false, userErrorMsg: "No access list exists." };
        }
        let referer = req.header("Referer");
        let host = req.hostname;
        let whitelistedIPs = this.WhitelistedDomainsCsv.split(',');
        let r = null;
        whitelistedIPs.forEach(en => {
            if (en.toLowerCase() == host.toLowerCase()) {
                r = { success: true };
                return;
            }
        });
        if (r)
            return r;
        return { success: false, userErrorMsg: `The host (${host}) is not allowed to access this resource.` };
    }
    getSqlConnection(dbConnectionGuid) {
        let decryptedConnection;
        if (!dbConnectionGuid) {
            decryptedConnection = this.MetadataConnection;
        }
        else {
            var dbConnection = this.ExecutionConnections.find(con => con.Guid == dbConnectionGuid);
            if (dbConnection != null) {
                decryptedConnection = dbConnection;
            }
            else {
                log_1.SessionLog.error(`The execution connection '${dbConnectionGuid}' not found in specified DB Source '${this.Name}' (${this.CacheKey}). Reverting to metadata connection.`);
                decryptedConnection = this.MetadataConnection;
            }
        }
        return {
            user: decryptedConnection.userID, password: decryptedConnection.password, server: decryptedConnection.dataSource, database: decryptedConnection.initialCatalog
        };
    }
    get outputDir() {
        return path.resolve(`./generated/${this.CacheKey}`);
    }
    outputFilePath(jsFile) {
        return path.join(this.outputDir, jsFile.Filename);
    }
    outputTypeScriptTypingsFilePath(jsFile) {
        return path.join(this.outputDir, jsFile.Filename.substring(0, jsFile.Filename.lastIndexOf('.')) + ".d.ts");
    }
    minifiedOutputFilePath(jsFile) {
        return path.join(this.outputDir, jsFile.Filename.substring(0, jsFile.Filename.length - 3) + ".min.js");
    }
}
exports.DatabaseSource = DatabaseSource;
//# sourceMappingURL=database-source.js.map