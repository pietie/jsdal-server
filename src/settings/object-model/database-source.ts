import { JsFile } from './jsfile'
import { BaseRule } from './base-rule'
import { Connection } from './connection'

import { CachedRoutine } from './cache/cached-routine'

import * as fs from 'fs'
import * as path from 'path'
import * as shelljs from 'shelljs'
import * as shortid from 'shortid'

import * as SqlConnectionStringBuilder from 'node-connection-string-builder';

import * as sql from 'mssql';

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


    // TODO: Make sure this is not serialized when saving!
    private CachedRoutineList: CachedRoutine[];
    

    constructor() {
        this.JsFiles = [];
        this.Rules = [];
        this.ExecutionConnections = [];

        this.CachedRoutineList = [];
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
            else {
                console.log("NEW NEW NEW ROUTINE!!!?", newCachedRoutine);
            }

            this.CachedRoutineList.push(newCachedRoutine);
        }
    }

    public loadCache() {
        try {
            let cachePath: string = "./test/cache";

            if (!fs.existsSync(cachePath)) return;

            let cacheFilePath = path.join(cachePath, `${this.CacheKey}.json`);

            if (!fs.existsSync(cacheFilePath)) return;

            this.CachedRoutineList = [];

            fs.readFile(cacheFilePath, { encoding: "utf8" }, (err, data) => {
                if (!err) {

                    let allCacheEntries = JSON.parse(data);

                    for (let i = 0; i < allCacheEntries.length; i++) {
                        this.CachedRoutineList.push(CachedRoutine.createFromJson(allCacheEntries[i]));
                    }

                }
                else {
                    // TODO: handle file read error
                }
            });


        }
        catch (ex) {
            //SessionLog.Exception(ex);
            throw ex;// TODO: HANDLE!!!!
        }
    }

    public saveCache() {
        try {
            let cachePath: string = "./test/cache";

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
        , catalog: string, username: string, password: string): { success: boolean, userError?: string } {

        if (isMetadataConnection) {
            if (this.MetadataConnection == null) this.MetadataConnection = new Connection();

            this.MetadataConnection.update(logicalName, dataSource, catalog, username, password);
        }
        else {
            if (this.ExecutionConnections == null) this.ExecutionConnections = [];

            if (!dbConnectionGuid) {
                // add new
                let connection = new Connection();
                
                connection.update(logicalName, dataSource, catalog, username, password);
                connection.Guid = shortid.generate(); // TODO: Needs to move into constructor of Connection or something like Connection.create(..).

                this.ExecutionConnections.push(connection);
            }
            else { // update

                let existing = this.ExecutionConnections.find(c => c.Guid == dbConnectionGuid);

                if (existing == null) {
                    return { success: false, userError: "The specified connection does not exist and cannot be updated." }
                }

                existing.update(logicalName, dataSource, catalog, username, password);

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

            var sqlConfig = {
                user: this.MetadataConnection.userID,
                password: this.MetadataConnection.password,
                server: this.MetadataConnection.dataSource,
                database: this.MetadataConnection.initialCatalog,
                stream: false, // You can enable streaming globally
                options: {
                    encrypt: true
                }
            };

            let con: sql.Connection = <sql.Connection>await new sql.Connection(sqlConfig).connect().catch(err => {
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

                var sqlConfig = {
                    user: this.MetadataConnection.userID,
                    password: this.MetadataConnection.password,
                    server: this.MetadataConnection.dataSource,
                    database: this.MetadataConnection.initialCatalog,
                    stream: false, // You can enable streaming globally
                    options: {
                        encrypt: true
                    }
                };

                let con: sql.Connection = <sql.Connection>await new sql.Connection(sqlConfig).connect().catch(err => {
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
                    stream: false, // You can enable streaming globally
                    options: {
                        encrypt: true
                    }
                };

                let con: sql.Connection = <sql.Connection>await new sql.Connection(sqlConfig).connect().catch(err => {
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
            let cachePath: string = "./test/cache";

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
        
        pluginList.forEach(p=>
        {
            let included:boolean = p.Included;

            if (included) this.Plugins.push(p);
        });

        return { success: true };
    }

    public addJsFile(name: string): { success: boolean, userError?: string } {
        if (this.JsFiles == null) this.JsFiles = [];

        var existing = this.JsFiles.find(f => f.Filename.toLowerCase() == name.toLowerCase());

        if (existing != null) {
            return { success: false, userError: `The output file '${name}' already exists against this data source.` };
        }

        let jsfile = new JsFile();

        jsfile.Filename = name;

        this.JsFiles.push(jsfile);

        return { success: true };
    }
}