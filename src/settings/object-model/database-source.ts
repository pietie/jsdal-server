import { JsFile } from './jsfile'
import { BaseRule, RuleType, SchemaRule, SpecificRule, RegexRule } from './rules'
import { Connection } from './connection'

import { CachedRoutine } from './cache/cached-routine'

import * as fs from 'fs'
import * as path from 'path'
import * as shelljs from 'shelljs'
import * as shortid from 'shortid'

import * as SqlConnectionStringBuilder from 'node-connection-string-builder';

import * as sql from 'mssql';
import { Request } from "@types/express";
import { SessionLog } from "./../../util/log";
import { SqlConfigBuilder } from "./../../util/sql-config-builder";

export enum DefaultRuleMode {
    IncludeAll = 0,
    ExcludeAll = 1
}

export class DatabaseSource {

    private _connectionStringBuilder: SqlConnectionStringBuilder;

    public Name: string;
    public CacheKey: string;
    public WhitelistedDomainsCsv: string;
    public WhitelistAllowAllPrivateIPs: boolean;
    public JsNamespace: string;
    public IsOrmInstalled: boolean;
    public DefaultRuleMode: number; // TODO: Enum type
    public LastUpdateDate: Date;
    public Plugins: string[];

    public JsFiles: JsFile[];
    public Rules: BaseRule[];


    public MetadataConnection: Connection;

    public ExecutionConnections: Connection[];


    private CachedRoutineList: CachedRoutine[];


    constructor() {
        this.JsFiles = [];
        this.Rules = [];
        this.ExecutionConnections = [];

        this.CachedRoutineList = [];
    }

    // customise JSON.stringify behaviour to make sure we don't serialise unwanted properties
    public toJSON() {
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

    public get userID(): string {

        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.userID;
    }

    public get password(): string {

        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.password;
    }

    public get dataSource(): string {

        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.dataSource;

    }

    public get initialCatalog(): string {
        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.initialCatalog;

    }

    public get integratedSecurity(): boolean {
        if (this._connectionStringBuilder == null) this._connectionStringBuilder = new SqlConnectionStringBuilder(this.MetadataConnection.ConnectionStringDecrypted);
        return this._connectionStringBuilder.integratedSecurity;
    }
    
    public get port(): number {
        return this.MetadataConnection.port;
    }
    
    public get instanceName(): string {
        return this.MetadataConnection.instanceName;
    }

    public static createFromJson(rawJson: any): DatabaseSource {
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

        dbSource.MetadataConnection = Connection.createFromJson(rawJson.MetadataConnection);

        for (let i = 0; i < rawJson.ExecutionConnections.length; i++) {
            dbSource.ExecutionConnections.push(Connection.createFromJson(rawJson.ExecutionConnections[i]));
        }

        for (let i = 0; i < rawJson.JsFiles.length; i++) {
            dbSource.JsFiles.push(JsFile.createFromJson(rawJson.JsFiles[i]));
        }

        for (let i = 0; i < rawJson.Rules.length; i++) {
            dbSource.Rules.push(BaseRule.createFromJson(rawJson.Rules[i]));
        }

        //console.log(dbSource);
        return dbSource;
    }

    public addToCache(maxRowDate: number, newCachedRoutine: CachedRoutine) {
        if (this.CacheKey == null) this.CacheKey = shortid.generate();

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

    public loadCache() {
        try {
            let cachePath: string = "./cache";

            if (!fs.existsSync(cachePath)) return;

            let cacheFilePath = path.join(cachePath, `${this.CacheKey}.json`);

            if (!fs.existsSync(cacheFilePath)) return;

            this.CachedRoutineList = [];

            let data = fs.readFileSync(cacheFilePath, { encoding: "utf8" });

            let allCacheEntries = JSON.parse(data);

            for (let i = 0; i < allCacheEntries.length; i++) {
                this.CachedRoutineList.push(CachedRoutine.createFromJson(allCacheEntries[i]));
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
            throw ex;// TODO: HANDLE!!!!
        }
    }

    public saveCache() {
        try {
            let cachePath: string = "./cache";

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

    public get cache(): CachedRoutine[] { return this.CachedRoutineList; }

    public addUpdateDatabaseConnection(isMetadataConnection: boolean, dbConnectionGuid: string, logicalName: string, dataSource: string
        , catalog: string, username: string, password: string, port: number, instanceName: string): { success: boolean, userError?: string } {

        if (isMetadataConnection) {
            if (this.MetadataConnection == null) this.MetadataConnection = new Connection();

            this.MetadataConnection.update(logicalName, dataSource, catalog, username, password, port, instanceName);
        }
        else {
            if (this.ExecutionConnections == null) this.ExecutionConnections = [];

            if (!dbConnectionGuid) {
                // add new
                let connection = new Connection();

                connection.update(logicalName, dataSource, catalog, username, password, port, instanceName);
                connection.Guid = shortid.generate(); // TODO: Needs to move into constructor of Connection or something like Connection.create(..).

                this.ExecutionConnections.push(connection);
            }
            else { // update

                let existing = this.ExecutionConnections.find(c => c.Guid == dbConnectionGuid);

                if (existing == null) {
                    return { success: false, userError: "The specified connection does not exist and cannot be updated." }
                }

                existing.update(logicalName, dataSource, catalog, username, password, port, instanceName);

            }
        }
        return { success: true };
    }

    public deleteDatabaseConnection(dbConnectionGuid: string): { success: boolean, userError?: string } {
        var existing = this.ExecutionConnections.find(c => c.Guid == dbConnectionGuid);

        if (existing == null) {
            return { success: false, userError: "The specified connection does not exist and cannot be updated." };
        }

        this.ExecutionConnections.splice(this.ExecutionConnections.indexOf(existing), 1);

        return { success: true };
    }

    public async checkForMissingOrmPreRequisitesOnDatabase(): Promise<string> {

        return new Promise<string>(async (resolve, reject) => {
            let sqlScript: string = fs.readFileSync("./resources/check-pre-requisites.sql", { encoding: "utf8" });

            let sqlConfig = SqlConfigBuilder.build(this.MetadataConnection);

            let con: sql.ConnectionPool = <sql.ConnectionPool>await new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                // TODO: Handle connection error
                console.log("connection error", err);
                reject(err);
            });

            let request = new sql.Request(con);

            request.output('err', sql.VarChar, null);

            let res = await request.query(sqlScript).catch(e => reject(e));


            con.close();

            resolve(request.parameters["err"].value);

        });
    }

    public async InstallOrm(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                let installSqlScript: string = fs.readFileSync("./resources/install-orm.sql", { encoding: "utf8" });;

                let sqlConfig = SqlConfigBuilder.build(this.MetadataConnection);

                let con: sql.ConnectionPool = <sql.ConnectionPool>await new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                    reject(err);
                });

                let request = new sql.Request(con);

                request.output('err', sql.VarChar, null);

                await request.query(installSqlScript).catch(e => reject(e));
                con.close();

                resolve(true);
            }
            catch (e) {
                reject(e);
            }
        });


    }

    public async  UnInstallOrm(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {

                var sqlConfig = {
                    user: this.MetadataConnection.userID,
                    password: this.MetadataConnection.password,
                    server: this.MetadataConnection.dataSource,
                    database: this.MetadataConnection.initialCatalog,
                    connectionTimeout: 1000 * 60, //TODO:make configurable
                    requestTimeout: 1000 * 60,//TODO:make configurable
                    stream: false, // You can enable streaming globally
                    options: {
                        encrypt: true
                    }
                };

                let con: sql.ConnectionPool = <sql.ConnectionPool>await new sql.ConnectionPool(sqlConfig).connect().catch(err => {
                    reject(err);
                });

                let request = new sql.Request(con);

                await request.execute("orm.Uninstall").catch(e => reject(e));

                con.close();

                resolve(true);


            }
            catch (e) {
                reject(e);
            }
        });


    }

    public clearCache() {

        try {
            let cachePath: string = "./cache";

            if (!fs.existsSync(cachePath)) return;

            let cacheFilePath = path.join(cachePath, `${this.CacheKey}.json`);

            if (!fs.existsSync(cacheFilePath)) return;

            this.CachedRoutineList = [];

            // delete cache file
            fs.unlinkSync(cacheFilePath);

            // TODO: Not sure about this
            //! GeneratorThreadDispatcher.ResetMaxRowDate(this);
            this.LastUpdateDate = new Date();
        }
        catch (ex) {
            //SessionLog.Exception(ex);
            throw ex;// TODO: HANDLE!!!!
        }

    }

    public updatePluginList(pluginList: any[]): { success: boolean, userError?: string } {
        this.Plugins = [];
        if (!pluginList) return;

        pluginList.forEach(p => {
            let included: boolean = p.Included;

            if (included) this.Plugins.push(p.Guid);
        });

        return { success: true };
    }

    public isPluginIncluded(guid: string): boolean {
        if (!this.Plugins) return false;

        return this.Plugins.find(g => g.toLowerCase() == guid.toLowerCase()) != null;
    }

    public addJsFile(name: string): { success: boolean, userError?: string } {
        if (this.JsFiles == null) this.JsFiles = [];

        var existing = this.JsFiles.find(f => f.Filename.toLowerCase() == name.toLowerCase());

        if (existing != null) {
            return { success: false, userError: `The output file '${name}' already exists against this data source.` };
        }

        let jsfile = new JsFile();

        jsfile.Filename = name;
        jsfile.Guid = shortid.generate();

        this.JsFiles.push(jsfile);

        return { success: true };
    }

    public addRule(ruleType: RuleType, txt: string): { success: boolean, userErrorMsg?: string } {
        let rule: BaseRule = null;

        switch (ruleType) // TODO: Check for duplicated rules?
        {
            case RuleType.Schema:
                rule = new SchemaRule(txt);
                break;
            case RuleType.Specific:
                {
                    var parts = txt.split('.');
                    var schema = "dbo";
                    var name = txt;

                    if (parts.length > 1) {
                        schema = parts[0];
                        name = parts[1];
                    }

                    rule = new SpecificRule(schema, name);
                }
                break;
            case RuleType.Regex:
                {
                    try {
                        var regexTest = new RegExp(txt);
                    }
                    catch (ex) {
                        return { success: false, userErrorMsg: "Invalid regex pattern: " + ex.toString() };
                    }
                }
                rule = new RegexRule(txt);
                break;
            default:
                throw `Unsupported rule type: ${ruleType}`;
        }

        rule.Guid = shortid.generate();

        this.Rules.push(rule);

        return { success: true };
    }

    public deleteRule(ruleGuid: string): { success: boolean, userErrorMsg?: string } {
        var existingRule = this.Rules.find(r =>/*r!=null &&*/ r.Guid == ruleGuid);

        if (existingRule == null) {
            return { success: false, userErrorMsg: "The specified rule was not found." };
        }

        this.Rules.splice(this.Rules.indexOf(existingRule), 1);

        return { success: true };
    }

    public applyDbLevelRules() {
        this.applyRules(JsFile.DBLevel);
    }

    public applyRules(jsFileContext: JsFile) {
        if (this.CachedRoutineList == null) return;

        this.CachedRoutineList.forEach(routine => {
            if (routine.RuleInstructions == null) return;
            //if (routine.RuleInstructions.length == 1 
            //&& routine.RuleInstructions.First().Key == null) continue; // PL: No idea why this happens but when no rules exist RuleInstructions contains a single KeyValue pair that are both null...this causes routine.RuleInstructions[jsFileContext] to hang 

            delete routine.RuleInstructions[jsFileContext.Guid];

            if (routine.IsDeleted) return;

            let instruction = routine.applyRules(this, jsFileContext);

            routine.RuleInstructions[jsFileContext.Guid] = instruction;

        });
    }

    public mayAccessDbSource(req: Request): { success: boolean, userErrorMsg?: string } {
        if (this.WhitelistedDomainsCsv == null) {
            return { success: false, userErrorMsg: "No access list exists." };
        }

        let referer = req.header("Referer");
        let host = req.hostname;
        let whitelistedIPs = this.WhitelistedDomainsCsv.split(',');

        let r: any = null;

        whitelistedIPs.forEach(en => {
            if (en.toLowerCase() == host.toLowerCase()) {
                r = { success: true };
                return;
            }
        });

        if (r) return r;

        return { success: false, userErrorMsg: `The host (${host}) is not allowed to access this resource.` };
    }

    public getSqlConnection(dbConnectionGuid: string): { user: string, password: string, server: string, database: string } {

        let decryptedConnection: Connection;

        if (!dbConnectionGuid) {
            decryptedConnection = this.MetadataConnection;
        }
        else {

            var dbConnection = this.ExecutionConnections.find(con => con.Guid == dbConnectionGuid);

            if (dbConnection != null) {
                decryptedConnection = dbConnection;
            }
            else {
                SessionLog.error(`The execution connection '${dbConnectionGuid}' not found in specified DB Source '${this.Name}' (${this.CacheKey}). Reverting to metadata connection.`);
                decryptedConnection = this.MetadataConnection;
            }
        }

        return {
            user: decryptedConnection.userID, password: decryptedConnection.password, server: decryptedConnection.dataSource, database: decryptedConnection.initialCatalog
        };
    }


    public get outputDir(): string {
        return path.resolve(`./generated/${this.CacheKey}`);
    }

    public outputFilePath(jsFile: JsFile): string {
        return path.join(this.outputDir, jsFile.Filename);
    }

    public outputTypeScriptTypingsFilePath(jsFile: JsFile): string {
        return path.join(this.outputDir, jsFile.Filename.substring(0, jsFile.Filename.lastIndexOf('.')) + ".d.ts");
    }

    public minifiedOutputFilePath(jsFile: JsFile): string {
        return path.join(this.outputDir, jsFile.Filename.substring(0, jsFile.Filename.length - 3) + ".min.js");
    }
}