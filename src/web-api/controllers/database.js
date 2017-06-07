"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_response_1 = require("./../api-response");
const settings_instance_1 = require("./../../settings/settings-instance");
const decorators_1 = require("./../decorators");
class DatabaseController {
    // get list of DB Sources for a specific Project
    static Get(req) {
        let projectName = req.query.project;
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        if (proj.DatabaseSources == null)
            proj.DatabaseSources = [];
        return api_response_1.ApiResponse.Payload(proj.DatabaseSources.map(dbs => {
            return {
                Name: dbs.Name,
                Guid: dbs.CacheKey,
                InitialCatalog: dbs.initialCatalog,
                DataSource: dbs.dataSource,
                IsOrmInstalled: dbs.IsOrmInstalled,
                JsNamespace: dbs.JsNamespace,
                DefaultRuleMode: dbs.DefaultRuleMode,
                UserID: dbs.userID,
                IntegratedSecurity: dbs.integratedSecurity
            };
        }).sort((a, b) => a.Name.localeCompare(b.Name)));
    }
    static GetSingle(req) {
        let projectName = req.params.project;
        let dbSourceName = req.params.dbSource;
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        var dbSource = proj.getDatabaseSource(dbSourceName);
        if (dbSource == null) {
            return api_response_1.ApiResponse.ExclamationModal(`The database source entry '${dbSourceName}' does not exist.`);
        }
        return api_response_1.ApiResponse.Payload({
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
    static Delete(req) {
        let projectName = req.query.projectName;
        let name = req.params.name;
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        var cs = proj.getDatabaseSource(name);
        if (cs == null) {
            return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${name}'`);
        }
        proj.removeConnectionString(cs);
        settings_instance_1.SettingsInstance.saveSettingsToFile();
        return api_response_1.ApiResponse.Success();
    }
    static Post(req) {
        // TODO: Validate parameters - mandatory and also things like logicalName(no special chars etc?)
        let logicalName = req.body;
        let projectName = req.query.project;
        let dataSource = req.query.dataSource;
        let catalog = req.query.catalog;
        let username = req.query.username;
        let password = req.query.password;
        let jsNamespace = req.query.jsNamespace;
        let defaultRoleMode = req.query.defaultRoleMode;
        if (logicalName == null || logicalName.trim() == "") {
            return api_response_1.ApiResponse.ExclamationModal("Please provide a valid database source name.");
        }
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        var existing = proj.getDatabaseSource(logicalName);
        if (existing != null) {
            return api_response_1.ApiResponse.ExclamationModal(`The database source entry '${logicalName}' already exists.`);
        }
        let ret = proj.addMetadataConnectionString(logicalName, dataSource, catalog, username, password, jsNamespace, defaultRoleMode);
        if (!ret.success)
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        settings_instance_1.SettingsInstance.saveSettingsToFile();
        return api_response_1.ApiResponse.Success();
    }
    static GetDatabaseConnections(req) {
        let projectName = req.query.projectName;
        let dbSourceName = req.query.dbSourceName;
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        var dbSource = proj.getDatabaseSource(dbSourceName);
        if (dbSource == null)
            return api_response_1.ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);
        var dbConnections = dbSource.ExecutionConnections;
        if (dbConnections == null)
            return api_response_1.ApiResponse.Payload(null);
        return api_response_1.ApiResponse.Payload(dbConnections.map(con => {
            return {
                Guid: con.Guid,
                Name: con.Name,
                InitialCatalog: con.initialCatalog,
                DataSource: con.dataSource,
                UserID: con.userID,
                IntegratedSecurity: con.integratedSecurity
            };
        }).sort((a, b) => a.Name.localeCompare(b.Name)));
    }
    static AddUpdateDatabaseConnection(req) {
        // TODO: Validate parameters - mandatory and also things like logicalName(no special chars etc?)
        let dbSourceName = req.query.dbSourceName;
        let logicalName = req.query.logicalName;
        let dbConnectionGuid = req.query.dbConnectionGuid;
        let projectName = req.query.projectName;
        let dataSource = req.query.dataSource;
        let catalog = req.query.catalog;
        let username = req.query.username;
        let password = req.query.password;
        if (logicalName == null || logicalName.trim() == "") {
            return api_response_1.ApiResponse.ExclamationModal("Please provide a valid database source name.");
        }
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        var dbSource = proj.getDatabaseSource(dbSourceName);
        if (dbSource == null)
            return api_response_1.ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);
        let ret = dbSource.addUpdateDatabaseConnection(false, dbConnectionGuid, logicalName, dataSource, catalog, username, password);
        if (ret.success) {
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            return api_response_1.ApiResponse.Success();
        }
        else {
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        }
    }
    // 04/07/2016, PL: Created.
    static DeleteDatabaseConnection(req) {
        let dbConnectionGuid = req.query.dbConnectionGuid;
        let projectName = req.query.projectName;
        let dbSourceName = req.query.dbSourceName;
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        var dbSource = proj.getDatabaseSource(dbSourceName);
        if (dbSource == null)
            return api_response_1.ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);
        let ret = dbSource.deleteDatabaseConnection(dbConnectionGuid);
        if (ret.success) {
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            return api_response_1.ApiResponse.Success();
        }
        else {
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        }
    }
    static UpdateDatabaseSource(req) {
        let logicalName = req.body;
        let oldName = req.query.oldName;
        let projectName = req.query.project;
        let dataSource = req.query.dataSource;
        let catalog = req.query.catalog;
        let username = req.query.username;
        let password = req.query.password;
        let jsNamespace = req.query.jsNamespace;
        let defaultRoleMode = req.query.defaultRoleMode;
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        var existing = proj.getDatabaseSource(oldName);
        if (existing == null) {
            return api_response_1.ApiResponse.ExclamationModal(`The database source entry '${logicalName}' does not exist and the update operation cannot continue.`);
        }
        existing.Name = logicalName;
        let ret = existing.addUpdateDatabaseConnection(true /*isMetadataConnection*/, null, logicalName, dataSource, catalog, username, password);
        if (!ret.success) {
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        }
        existing.JsNamespace = jsNamespace;
        existing.DefaultRuleMode = defaultRoleMode;
        settings_instance_1.SettingsInstance.saveSettingsToFile();
        return api_response_1.ApiResponse.Success();
    }
    static IsOrmInstalled(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let name = req.query.name;
                    let projectName = req.query.projectName;
                    let forceRecheck = req.query.forceRecheck;
                    let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
                    if (!proj)
                        return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
                    var cs = proj.getDatabaseSource(name);
                    if (cs == null) {
                        return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${name}'`);
                    }
                    if (!forceRecheck && cs.IsOrmInstalled)
                        return api_response_1.ApiResponse.Payload(null);
                    let missingDeps = yield cs.checkForMissingOrmPreRequisitesOnDatabase();
                    cs.IsOrmInstalled = missingDeps == null;
                    settings_instance_1.SettingsInstance.saveSettingsToFile();
                    resolve(api_response_1.ApiResponse.Payload(missingDeps));
                }
                catch (ex) {
                    resolve(api_response_1.ApiResponse.Exception(ex));
                }
            }));
        });
    }
    static InstallOrm(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let name = req.query.name;
                    let projectName = req.query.projectName;
                    let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
                    if (!proj) {
                        resolve(api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`));
                        return;
                    }
                    var cs = proj.getDatabaseSource(name);
                    if (cs == null) {
                        resolve(api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${name}'`));
                        return;
                    }
                    let installed = yield cs.InstallOrm();
                    if (installed) {
                        cs.IsOrmInstalled = true;
                        settings_instance_1.SettingsInstance.saveSettingsToFile();
                        resolve(api_response_1.ApiResponse.Success());
                    }
                    else
                        resolve(api_response_1.ApiResponse.ExclamationModal("Failed to install ORM"));
                }
                catch (ex) {
                    resolve(api_response_1.ApiResponse.Exception(ex));
                    return;
                }
            }));
        });
    }
    static UninstallOrm(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let name = req.query.name;
                    let projectName = req.query.projectName;
                    let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
                    if (!proj) {
                        resolve(api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`));
                        return;
                    }
                    var cs = proj.getDatabaseSource(name);
                    if (cs == null) {
                        return resolve(api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${name}'`));
                    }
                    let success = yield cs.UnInstallOrm();
                    if (success) {
                        cs.IsOrmInstalled = false;
                        settings_instance_1.SettingsInstance.saveSettingsToFile();
                        resolve(api_response_1.ApiResponse.Success());
                    }
                    else {
                        resolve(api_response_1.ApiResponse.ExclamationModal("Failed to uninstall ORM"));
                    }
                }
                catch (ex) {
                    resolve(api_response_1.ApiResponse.Exception(ex));
                }
            }));
        });
    }
    static GetSummary(req) {
        try {
            let projectName = req.query.projectName;
            let dbSource = req.query.dbSource;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }
            var routineCache = cs.cache;
            let ormSummary = {};
            if (routineCache != null) {
                ormSummary.Groups = [];
                routineCache.forEach(r => {
                    let g = ormSummary.Groups.find(g => g.Type == r.Type);
                    if (g)
                        g.Count++;
                    else
                        ormSummary.Groups.push({ Type: r.Type, Count: 1 });
                });
                ormSummary.LastUpdated = cs.LastUpdateDate;
                ormSummary.TotalCnt = routineCache.length;
            }
            else {
                ormSummary.TotalCnt = 0;
            }
            return api_response_1.ApiResponse.Payload({
                Orm: ormSummary,
                Rules: "TODO"
            });
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static GetPlugins(req) {
        try {
            let projectName = req.query.projectName;
            let dbSource = req.query.dbSource;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }
            let cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }
            if (cs.Plugins == null)
                cs.Plugins = [];
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
            return api_response_1.ApiResponse.Payload(ret);
            //return availableOnServer.ToApiResponse();
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static SavePluginConfig(req) {
        try {
            let projectName = req.query.projectName;
            let dbSource = req.query.dbSource;
            let pluginList = req.body;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }
            let ret = cs.updatePluginList(pluginList);
            if (ret.success) {
                settings_instance_1.SettingsInstance.saveSettingsToFile();
                return api_response_1.ApiResponse.Success();
            }
            else {
                return api_response_1.ApiResponse.ExclamationModal(ret.userError);
            }
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static ClearCache(req) {
        try {
            let projectName = req.query.projectName;
            let dbSource = req.query.dbSource;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }
            cs.clearCache();
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            return api_response_1.ApiResponse.Success();
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static GetCachedRoutines(req) {
        try {
            let projectName = req.query.projectName;
            let dbSource = req.query.dbSource;
            let q = req.query.q;
            let type = req.query.type;
            let status = req.query.results;
            let hasMeta = req.query.hasMeta != null ? req.query.hasMeta.toLowerCase() == "true" : false;
            let isDeleted = req.query.isDeleted != null ? req.query.isDeleted.toLowerCase() == "true" : false;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }
            let routineCache = cs.cache;
            let results = routineCache;
            if (q && q.trim() != "") {
                q = q.toLowerCase();
                results = results.filter(r => r.FullName.toLowerCase().indexOf(q) >= 0);
            }
            if (type != "0" /*All*/) {
                results = results.filter(r => r.Type.toLowerCase() === type.toLowerCase());
            }
            if (status == "1" /*Has error*/) {
                results = results.filter(r => r.ResultSetError != null && r.ResultSetError.trim() != "");
            }
            else if (status == "2" /*No error*/) {
                results = results.filter(r => r.ResultSetError == null || r.ResultSetError.trim() == "");
            }
            if (hasMeta) {
                results = results.filter(r => r.jsDALMetadata != null && r.jsDALMetadata.jsDAL != null);
            }
            if (isDeleted) {
                results = results.filter(r => r.IsDeleted);
            }
            return api_response_1.ApiResponse.Payload({
                Results: results.sort((a, b) => a.FullName.localeCompare(b.FullName)),
                TotalCount: routineCache.length
            });
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static GetWhitelistedDomains(req) {
        let projectName = req.query.projectName;
        let dbSource = req.query.dbSourceName;
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj) {
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        }
        var cs = proj.getDatabaseSource(dbSource);
        if (cs == null) {
            return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
        }
        return api_response_1.ApiResponse.Payload({
            AllowAllPrivate: cs.WhitelistAllowAllPrivateIPs,
            Whitelist: cs.WhitelistedDomainsCsv ? cs.WhitelistedDomainsCsv.split(',') : null
        });
    }
    static UpdateWhitelist(req) {
        let projectName = req.query.projectName;
        let dbSource = req.query.dbSourceName;
        let whitelist = req.query.whitelist;
        let allowAllPrivate = req.query.allowAllPrivate;
        let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj) {
            return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
        }
        var cs = proj.getDatabaseSource(dbSource);
        if (cs == null) {
            return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
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
        settings_instance_1.SettingsInstance.saveSettingsToFile();
        return api_response_1.ApiResponse.Success();
    }
}
__decorate([
    decorators_1.route("/api/database"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "Get", null);
__decorate([
    decorators_1.route("/api/dbs/:project/:dbSource"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "GetSingle", null);
__decorate([
    decorators_1.route("/api/database/:name", { delete: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "Delete", null);
__decorate([
    decorators_1.route("/api/database", { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "Post", null);
__decorate([
    decorators_1.route("/api/dbconnections"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "GetDatabaseConnections", null);
__decorate([
    decorators_1.route("/api/dbconnection", { post: true, put: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "AddUpdateDatabaseConnection", null);
__decorate([
    decorators_1.route("/api/dbconnection", { delete: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "DeleteDatabaseConnection", null);
__decorate([
    decorators_1.route("/api/database/update", { put: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "UpdateDatabaseSource", null);
__decorate([
    decorators_1.route("/api/database/checkOrm"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DatabaseController, "IsOrmInstalled", null);
__decorate([
    decorators_1.route("/api/database/installOrm", { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DatabaseController, "InstallOrm", null);
__decorate([
    decorators_1.route("api/database/uninstallOrm", { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DatabaseController, "UninstallOrm", null);
__decorate([
    decorators_1.route("/api/database/summary"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "GetSummary", null);
__decorate([
    decorators_1.route("/api/database/plugins"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "GetPlugins", null);
__decorate([
    decorators_1.route("/api/database/plugins", { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "SavePluginConfig", null);
__decorate([
    decorators_1.route("/api/database/clearcache", { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "ClearCache", null);
__decorate([
    decorators_1.route("/api/database/cachedroutines"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "GetCachedRoutines", null);
__decorate([
    decorators_1.route("/api/database/whitelist"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "GetWhitelistedDomains", null);
__decorate([
    decorators_1.route("/api/database/whitelist", { post: true, put: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], DatabaseController, "UpdateWhitelist", null);
exports.DatabaseController = DatabaseController;
//# sourceMappingURL=database.js.map