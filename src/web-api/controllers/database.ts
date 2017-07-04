import { ApiResponse } from './../api-response'
import { SettingsInstance } from './../../settings/settings-instance'
import { route } from './../decorators'
import { ExceptionLogger } from "./../../util/exception-logger";
import { WorkSpawner } from "./../../generator/work-spawner";

export class DatabaseController {

    // get list of DB Sources for a specific Project
    @route("/api/database")
    public static Get(req): ApiResponse {
        try {
            let projectName: string = req.query.project;
            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            if (proj.DatabaseSources == null) proj.DatabaseSources = [];

            return ApiResponse.Payload(proj.DatabaseSources.map(dbs => {
                return {
                    Name: dbs.Name,
                    Guid: dbs.CacheKey,
                    InitialCatalog: dbs.initialCatalog,
                    DataSource: dbs.dataSource,
                    IsOrmInstalled: dbs.IsOrmInstalled,
                    JsNamespace: dbs.JsNamespace,
                    DefaultRuleMode: dbs.DefaultRuleMode,
                    UserID: dbs.userID,
                    IntegratedSecurity: dbs.integratedSecurity,
                    port: dbs.port,
                    instanceName: dbs.instanceName
                }
            }).sort((a, b) => a.Name.localeCompare(b.Name))
            );
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }

    }

    @route("/api/dbs/:project/:dbSource")
    public static GetSingle(req): ApiResponse {
        try {
            let projectName: string = req.params.project;
            let dbSourceName: string = req.params.dbSource;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var dbSource = proj.getDatabaseSource(dbSourceName);

            if (dbSource == null) {
                return ApiResponse.ExclamationModal(`The database source entry '${dbSourceName}' does not exist.`);
            }

            return ApiResponse.Payload({
                Name: dbSource.Name,
                Guid: dbSource.CacheKey,
                InitialCatalog: dbSource.initialCatalog,
                DataSource: dbSource.dataSource,
                IsOrmInstalled: dbSource.IsOrmInstalled,
                // JsNamespace: dbSource.JsNamespace,
                DefaultRuleMode: dbSource.DefaultRuleMode
                // UserID: dbSource.userID,
                // IntegratedSecurity: dbSource.integratedSecurity
            });
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }
    }

    @route("/api/database/:name", { delete: true })
    public static Delete(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let name: string = req.params.name;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var cs = proj.getDatabaseSource(name);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${name}'`);
            }

            proj.removeConnectionString(cs);

            SettingsInstance.saveSettingsToFile();

            return ApiResponse.Success();
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }
    }

    @route("/api/database", { post: true })
    public static Post(req): ApiResponse {
        try {

            let logicalName: string = req.body;

            let projectName: string = req.query.project;
            let dataSource: string = req.query.dataSource;
            let catalog: string = req.query.catalog;
            let username: string = req.query.username;
            let password: string = req.query.password;
            let jsNamespace: string = req.query.jsNamespace;
            let defaultRoleMode: number = req.query.defaultRoleMode;
            let port: number = req.query.port;
            let instanceName: string = req.query.instanceName;

            if (port == null || port == undefined || isNaN(port)) port = 1433;
            if (!instanceName || instanceName.trim() == "") instanceName = null;

            if (logicalName == null || logicalName.trim() == "") {
                return ApiResponse.ExclamationModal("Please provide a valid database source name.");
            }

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var existing = proj.getDatabaseSource(logicalName);

            if (existing != null) {
                return ApiResponse.ExclamationModal(`The database source entry '${logicalName}' already exists.`);
            }

            let ret = proj.addMetadataConnectionString(logicalName, dataSource, catalog, username, password, jsNamespace, defaultRoleMode, port, instanceName);

            if (!ret.success) return ApiResponse.ExclamationModal(ret.userError);

            SettingsInstance.saveSettingsToFile();
            return ApiResponse.Success();
        }
        catch (e) {

            return ApiResponse.Exception(e);
        }
    }


    @route("/api/dbconnections")
    public static GetDatabaseConnections(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSourceName: string = req.query.dbSourceName;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var dbSource = proj.getDatabaseSource(dbSourceName);

            if (dbSource == null) return ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);

            var dbConnections = dbSource.ExecutionConnections;

            if (dbConnections == null) return ApiResponse.Payload(null);

            return ApiResponse.Payload(dbConnections.map(con => {
                return {
                    Guid: con.Guid,
                    Name: con.Name,
                    InitialCatalog: con.initialCatalog,
                    DataSource: con.dataSource,
                    UserID: con.userID,
                    IntegratedSecurity: con.integratedSecurity,
                    port: con.port,
                    instanceName: con.instanceName
                }
            }).sort((a, b) => a.Name.localeCompare(b.Name)));
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }
    }

    @route("/api/dbconnection", { post: true, put: true })
    public static AddUpdateDatabaseConnection(req): ApiResponse {
        try {
            // TODO: Validate parameters - mandatory and also things like logicalName(no special chars etc?)

            let dbSourceName: string = req.query.dbSourceName;
            let logicalName: string = req.query.logicalName;
            let dbConnectionGuid: string = req.query.dbConnectionGuid;
            let projectName: string = req.query.projectName;
            let dataSource: string = req.query.dataSource;
            let catalog: string = req.query.catalog;
            let username: string = req.query.username;
            let password: string = req.query.password;
            let port: number = req.query.port;
            let instanceName: string = req.query.instanceName;

            if (port == null || port == undefined || isNaN(port)) port = 1433;
            if (!instanceName || instanceName.trim() == "") instanceName = null;

            if (logicalName == null || logicalName.trim() == "") {
                return ApiResponse.ExclamationModal("Please provide a valid database source name.");
            }


            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var dbSource = proj.getDatabaseSource(dbSourceName);

            if (dbSource == null) return ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);

            let ret = dbSource.addUpdateDatabaseConnection(false, dbConnectionGuid, logicalName, dataSource, catalog, username, password, port, instanceName);

            if (ret.success) {
                SettingsInstance.saveSettingsToFile();
                return ApiResponse.Success();
            }
            else {
                return ApiResponse.ExclamationModal(ret.userError);
            }
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }
    }


    // 04/07/2016, PL: Created.
    @route("/api/dbconnection", { delete: true })
    public static DeleteDatabaseConnection(req): ApiResponse {
        try {
            let dbConnectionGuid: string = req.query.dbConnectionGuid;
            let projectName: string = req.query.projectName;
            let dbSourceName: string = req.query.dbSourceName;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var dbSource = proj.getDatabaseSource(dbSourceName);

            if (dbSource == null) return ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);

            let ret = dbSource.deleteDatabaseConnection(dbConnectionGuid);
            if (ret.success) {
                SettingsInstance.saveSettingsToFile();
                return ApiResponse.Success();
            }
            else {
                return ApiResponse.ExclamationModal(ret.userError);
            }
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }
    }




    @route("/api/database/update", { put: true })
    public static UpdateDatabaseSource(req): ApiResponse {
        try {
            let logicalName: string = req.body;

            let oldName: string = req.query.oldName;
            let projectName: string = req.query.project;
            let dataSource: string = req.query.dataSource;
            let catalog: string = req.query.catalog;
            let username: string = req.query.username;
            let password: string = req.query.password;
            let jsNamespace: string = req.query.jsNamespace;
            let defaultRoleMode: number = req.query.defaultRoleMode;
            let port: number = parseInt(req.query.port);
            let instanceName: string = req.query.instanceName;

            if (port == null || port == undefined || isNaN(port)) port = 1433;
            if (!instanceName || instanceName.trim() == "") instanceName = null;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var existing = proj.getDatabaseSource(oldName);

            if (existing == null) {
                return ApiResponse.ExclamationModal(`The database source entry '${logicalName}' does not exist and the update operation cannot continue.`);
            }

            existing.Name = logicalName;

            let ret = existing.addUpdateDatabaseConnection(true/*isMetadataConnection*/, null, logicalName, dataSource, catalog, username, password, port, instanceName)

            if (!ret.success) {
                return ApiResponse.ExclamationModal(ret.userError);
            }

            existing.JsNamespace = jsNamespace;
            existing.DefaultRuleMode = defaultRoleMode;

            SettingsInstance.saveSettingsToFile();

            return ApiResponse.Success();
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }
    }


    @route("/api/database/checkOrm")
    public static async IsOrmInstalled(req): Promise<ApiResponse> {
        return new Promise<ApiResponse>(async (resolve, reject) => {
            try {
                let name: string = req.query.name;
                let projectName: string = req.query.projectName;
                let forceRecheck: boolean = req.query.forceRecheck

                let proj = SettingsInstance.Instance.getProject(projectName);

                if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

                var cs = proj.getDatabaseSource(name);

                if (cs == null) {
                    return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${name}'`);
                }

                if (!forceRecheck && cs.IsOrmInstalled) return ApiResponse.Payload(null);

                let missingDeps = await cs.checkForMissingOrmPreRequisitesOnDatabase();

                cs.IsOrmInstalled = missingDeps == null;

                SettingsInstance.saveSettingsToFile();

                resolve(ApiResponse.Payload(missingDeps));
            }
            catch (ex) {
                resolve(ApiResponse.Exception(ex));
            }

        });
    }

    @route("/api/database/installOrm", { post: true })
    public static async InstallOrm(req): Promise<ApiResponse> {
        return new Promise<ApiResponse>(async (resolve, reject) => {
            try {
                let name: string = req.query.name;
                let projectName: string = req.query.projectName;

                let proj = SettingsInstance.Instance.getProject(projectName);

                if (!proj) {
                    resolve(ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`));
                    return;
                }

                var cs = proj.getDatabaseSource(name);

                if (cs == null) {
                    resolve(ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${name}'`));
                    return;
                }

                let installed = await cs.InstallOrm();

                if (installed) {
                    cs.IsOrmInstalled = true;

                    WorkSpawner.resetMaxRowDate(cs);
                    
                    SettingsInstance.saveSettingsToFile();

                    resolve(ApiResponse.Success());
                }
                else resolve(ApiResponse.ExclamationModal("Failed to install ORM"));
            }
            catch (ex) {
                resolve(ApiResponse.Exception(ex));
                return;
            }

        });

    }


    @route("api/database/uninstallOrm", { post: true })
    public static async UninstallOrm(req): Promise<ApiResponse> {
        return new Promise<ApiResponse>(async (resolve, reject) => {
            try {
                let name: string = req.query.name;
                let projectName: string = req.query.projectName;
                let proj = SettingsInstance.Instance.getProject(projectName);

                if (!proj) {
                    resolve(ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`));
                    return;
                }

                var cs = proj.getDatabaseSource(name);

                if (cs == null) {
                    return resolve(ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${name}'`));
                }

                let success = await cs.UnInstallOrm();

                if (success) {
                    cs.IsOrmInstalled = false;
                    SettingsInstance.saveSettingsToFile();

                    resolve(ApiResponse.Success());
                }
                else {
                    resolve(ApiResponse.ExclamationModal("Failed to uninstall ORM"));
                }
            }
            catch (ex) {
                resolve(ApiResponse.Exception(ex));
            }
        });
    }

    @route("/api/database/summary")
    public static GetSummary(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSource;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) {
                return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }

            var cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            var routineCache = cs.cache;

            let ormSummary: any = {};

            if (routineCache != null) {
                ormSummary.Groups = [];

                routineCache.forEach(r => {
                    let g = ormSummary.Groups.find(g => g.Type == r.Type);

                    if (g) g.Count++;
                    else ormSummary.Groups.push({ Type: r.Type, Count: 1 });

                });

                ormSummary.LastUpdated = cs.LastUpdateDate;
                ormSummary.TotalCnt = routineCache.length;
            }
            else {
                ormSummary.TotalCnt = 0;
            }

            return ApiResponse.Payload({
                Orm: ormSummary,
                Rules: "TODO"
            });

        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }
    }


    @route("/api/database/plugins")
    public static GetPlugins(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSource;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) {
                return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }

            let cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            if (cs.Plugins == null) cs.Plugins = [];

            let ret = global["PluginAssemblies"].map(p => {
                return {
                    Name: p.Name,
                    Description: p.Description,
                    Guid: p.Guid,
                    Included: cs.isPluginIncluded(p.Guid),
                    SortOrder: 0
                };
            });
            /*
                        var availableOnServer = (from p in jsDALServer.Classes.jsDALServer.Instance.PluginAssemblies.SelectMany(kv => kv.Value)
                        select new
                            {
                                p.Name
                                , p.Description
                                , p.Guid
                                , Included = cs.ActivePluginList.Contains(p.Guid)
                                , SortOrder = 0
                            }).ToList();
            */

            return ApiResponse.Payload(ret);
            //return availableOnServer.ToApiResponse();
        }
        catch (ex) {
            return ApiResponse.Exception(ex);

        }

    }

    @route("/api/database/plugins", { post: true })
    public static SavePluginConfig(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSource;
            let pluginList: any = req.body;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) {
                return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }

            var cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            let ret = cs.updatePluginList(pluginList);

            if (ret.success) {
                SettingsInstance.saveSettingsToFile();
                return ApiResponse.Success();
            }
            else {
                return ApiResponse.ExclamationModal(ret.userError);
            }
        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }

    }

    @route("/api/database/clearcache", { post: true })
    public static ClearCache(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSource;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) {
                return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }

            var cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            cs.clearCache();
            SettingsInstance.saveSettingsToFile();

            return ApiResponse.Success();
        }
        catch (ex) {
            return ApiResponse.Exception(ex);

        }

    }

    @route("/api/database/cachedroutines")
    public static GetCachedRoutines(req): ApiResponse {
        try {

            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSource;

            let q: string = req.query.q;
            let type: string = req.query.type;
            let status: string = req.query.results;
            let hasMeta: boolean = req.query.hasMeta != null ? req.query.hasMeta.toLowerCase() == "true" : false;
            let isDeleted: boolean = req.query.isDeleted != null ? req.query.isDeleted.toLowerCase() == "true" : false;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) {
                return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }

            var cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            let routineCache = cs.cache;
            let results = routineCache;

            if (q && q.trim() != "") {
                q = q.toLowerCase();
                results = results.filter(r => r.FullName.toLowerCase().indexOf(q) >= 0);
            }

            if (type != "0"/*All*/) {
                results = results.filter(r => r.Type.toLowerCase() === type.toLowerCase());
            }

            if (status == "1"/*Has error*/) {
                results = results.filter(r => r.ResultSetError != null && r.ResultSetError.trim() != "");
            }
            else if (status == "2"/*No error*/) {
                results = results.filter(r => r.ResultSetError == null || r.ResultSetError.trim() == "");
            }

            if (hasMeta) {
                results = results.filter(r => r.jsDALMetadata != null && r.jsDALMetadata.jsDAL != null);
            }

            if (isDeleted) {
                results = results.filter(r => r.IsDeleted);
            }

            return ApiResponse.Payload({
                Results: results.sort((a, b) => a.FullName.localeCompare(b.FullName)),
                TotalCount: routineCache.length
            });
        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }

    }


    @route("/api/database/whitelist")
    public static GetWhitelistedDomains(req): ApiResponse {
        let projectName: string = req.query.projectName;
        let dbSource: string = req.query.dbSourceName;

        let proj = SettingsInstance.Instance.getProject(projectName);

        if (!proj) {
            return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        }

        var cs = proj.getDatabaseSource(dbSource);

        if (cs == null) {
            return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
        }

        return ApiResponse.Payload({
            AllowAllPrivate: cs.WhitelistAllowAllPrivateIPs
            , Whitelist: cs.WhitelistedDomainsCsv ? cs.WhitelistedDomainsCsv.split(',') : null
        });
    }

    @route("/api/database/whitelist", { post: true, put: true })
    public static UpdateWhitelist(req): ApiResponse {
        try {


            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSourceName;
            let whitelist: string = req.query.whitelist;
            let allowAllPrivate: boolean = req.query.allowAllPrivate;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) {
                return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }

            var cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            cs.WhitelistAllowAllPrivateIPs = allowAllPrivate;

            if (whitelist != null) {
                //Select(w => w.TrimEnd('\r')
                var ar = whitelist.split('\n').map(w => w.trim()).filter(w => w && w != "");

                if (ar.length > 0) {
                    cs.WhitelistedDomainsCsv = ar.join(',');
                }
                else {
                    cs.WhitelistedDomainsCsv = null;
                }

            }
            else {
                cs.WhitelistedDomainsCsv = null;
            }

            SettingsInstance.saveSettingsToFile();

            return ApiResponse.Success();
        }
        catch (e) {
            return ApiResponse.Exception(e);
        }
    }
}


