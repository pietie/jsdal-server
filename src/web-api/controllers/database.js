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
Object.defineProperty(exports, "__esModule", { value: true });
var api_response_1 = require("./../api-response");
var settings_instance_1 = require("./../../settings/settings-instance");
var decorators_1 = require("./../decorators");
var DatabaseController = (function () {
    function DatabaseController() {
    }
    // get list of DB Sources for a specific Project
    DatabaseController.Get = function (req) {
        var projectName = req.query.project;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        if (proj.DatabaseSources == null)
            proj.DatabaseSources = [];
        return api_response_1.ApiResponse.Payload(proj.DatabaseSources.map(function (dbs) {
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
        }).sort(function (a, b) { return a.Name.localeCompare(b.Name); }));
    };
    DatabaseController.GetSingle = function (req) {
        var projectName = req.params.project;
        var dbSourceName = req.params.dbSource;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        var dbSource = proj.getDatabaseSource(dbSourceName);
        if (dbSource == null) {
            return api_response_1.ApiResponse.ExclamationModal("The database source entry '" + dbSourceName + "' does not exist.");
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
    };
    DatabaseController.Delete = function (req) {
        var projectName = req.query.projectName;
        var name = req.params.name;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        var cs = proj.getDatabaseSource(name);
        if (cs == null) {
            return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + name + "'");
        }
        proj.removeConnectionString(cs);
        settings_instance_1.SettingsInstance.saveSettingsToFile();
        return api_response_1.ApiResponse.Success();
    };
    DatabaseController.Post = function (req) {
        // TODO: Validate parameters - mandatory and also things like logicalName(no special chars etc?)
        var logicalName = req.body;
        var projectName = req.query.project;
        var dataSource = req.query.dataSource;
        var catalog = req.query.catalog;
        var username = req.query.username;
        var password = req.query.password;
        var jsNamespace = req.query.jsNamespace;
        var defaultRoleMode = req.query.defaultRoleMode;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        var existing = proj.getDatabaseSource(logicalName);
        if (existing != null) {
            return api_response_1.ApiResponse.ExclamationModal("The database source entry '" + logicalName + "' already exists.");
        }
        var ret = proj.addMetadataConnectionString(logicalName, dataSource, catalog, username, password, jsNamespace, defaultRoleMode);
        if (!ret.success)
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        settings_instance_1.SettingsInstance.saveSettingsToFile();
        return api_response_1.ApiResponse.Success();
    };
    DatabaseController.GetDatabaseConnections = function (req) {
        var projectName = req.query.projectName;
        var dbSourceName = req.query.dbSourceName;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        var dbSource = proj.getDatabaseSource(dbSourceName);
        if (dbSource == null)
            return api_response_1.ApiResponse.ExclamationModal("The data source '" + dbSourceName + "' does not exist.");
        var dbConnections = dbSource.ExecutionConnections;
        if (dbConnections == null)
            return api_response_1.ApiResponse.Payload(null);
        return api_response_1.ApiResponse.Payload(dbConnections.map(function (con) {
            return {
                Guid: con.Guid,
                Name: con.Name,
                InitialCatalog: con.initialCatalog,
                DataSource: con.dataSource,
                UserID: con.userID,
                IntegratedSecurity: con.integratedSecurity
            };
        }).sort(function (a, b) { return a.Name.localeCompare(b.Name); }));
    };
    DatabaseController.AddUpdateDatabaseConnection = function (req) {
        // TODO: Validate parameters - mandatory and also things like logicalName(no special chars etc?)
        var dbSourceName = req.query.dbSourceName;
        var logicalName = req.query.logicalName;
        var dbConnectionGuid = req.query.dbConnectionGuid;
        var projectName = req.query.projectName;
        var dataSource = req.query.dataSource;
        var catalog = req.query.catalog;
        var username = req.query.username;
        var password = req.query.password;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        var dbSource = proj.getDatabaseSource(dbSourceName);
        if (dbSource == null)
            return api_response_1.ApiResponse.ExclamationModal("The data source '" + dbSourceName + "' does not exist.");
        var ret = dbSource.addUpdateDatabaseConnection(false, dbConnectionGuid, logicalName, dataSource, catalog, username, password);
        if (ret.success) {
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            return api_response_1.ApiResponse.Success();
        }
        else {
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        }
    };
    // 04/07/2016, PL: Created.
    DatabaseController.DeleteDatabaseConnection = function (req) {
        var dbConnectionGuid = req.query.dbConnectionGuid;
        var projectName = req.query.projectName;
        var dbSourceName = req.query.dbSourceName;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        var dbSource = proj.getDatabaseSource(dbSourceName);
        if (dbSource == null)
            return api_response_1.ApiResponse.ExclamationModal("The data source '" + dbSourceName + "' does not exist.");
        var ret = dbSource.deleteDatabaseConnection(dbConnectionGuid);
        if (ret.success) {
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            return api_response_1.ApiResponse.Success();
        }
        else {
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        }
    };
    DatabaseController.UpdateDatabaseSource = function (req) {
        var logicalName = req.body;
        var oldName = req.query.oldName;
        var projectName = req.query.project;
        var dataSource = req.query.dataSource;
        var catalog = req.query.catalog;
        var username = req.query.username;
        var password = req.query.password;
        var jsNamespace = req.query.jsNamespace;
        var defaultRoleMode = req.query.defaultRoleMode;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj)
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        var existing = proj.getDatabaseSource(oldName);
        if (existing == null) {
            return api_response_1.ApiResponse.ExclamationModal("The database source entry '" + logicalName + "' does not exist and the update operation cannot continue.");
        }
        existing.Name = logicalName;
        var ret = existing.addUpdateDatabaseConnection(true /*isMetadataConnection*/, null, logicalName, dataSource, catalog, username, password);
        if (!ret.success) {
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        }
        existing.JsNamespace = jsNamespace;
        existing.DefaultRuleMode = defaultRoleMode;
        settings_instance_1.SettingsInstance.saveSettingsToFile();
        return api_response_1.ApiResponse.Success();
    };
    DatabaseController.IsOrmInstalled = function (req) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var name, projectName, forceRecheck, proj, cs, missingDeps, ex_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    name = req.query.name;
                                    projectName = req.query.projectName;
                                    forceRecheck = req.query.forceRecheck;
                                    proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
                                    if (!proj)
                                        return [2 /*return*/, api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.")];
                                    cs = proj.getDatabaseSource(name);
                                    if (cs == null) {
                                        return [2 /*return*/, api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + name + "'")];
                                    }
                                    if (!forceRecheck && cs.IsOrmInstalled)
                                        return [2 /*return*/, api_response_1.ApiResponse.Payload(null)];
                                    return [4 /*yield*/, cs.checkForMissingOrmPreRequisitesOnDatabase()];
                                case 1:
                                    missingDeps = _a.sent();
                                    cs.IsOrmInstalled = missingDeps == null;
                                    settings_instance_1.SettingsInstance.saveSettingsToFile();
                                    resolve(api_response_1.ApiResponse.Payload(missingDeps));
                                    return [3 /*break*/, 3];
                                case 2:
                                    ex_1 = _a.sent();
                                    resolve(api_response_1.ApiResponse.Exception(ex_1));
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseController.InstallOrm = function (req) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var name, projectName, proj, cs, installed, ex_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    name = req.query.name;
                                    projectName = req.query.projectName;
                                    proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
                                    if (!proj) {
                                        resolve(api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist."));
                                        return [2 /*return*/];
                                    }
                                    cs = proj.getDatabaseSource(name);
                                    if (cs == null) {
                                        resolve(api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + name + "'"));
                                        return [2 /*return*/];
                                    }
                                    return [4 /*yield*/, cs.InstallOrm()];
                                case 1:
                                    installed = _a.sent();
                                    if (installed) {
                                        cs.IsOrmInstalled = true;
                                        settings_instance_1.SettingsInstance.saveSettingsToFile();
                                        resolve(api_response_1.ApiResponse.Success());
                                    }
                                    else
                                        resolve(api_response_1.ApiResponse.ExclamationModal("Failed to install ORM"));
                                    return [3 /*break*/, 3];
                                case 2:
                                    ex_2 = _a.sent();
                                    resolve(api_response_1.ApiResponse.Exception(ex_2));
                                    return [2 /*return*/];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseController.UninstallOrm = function (req) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var name, projectName, proj, cs, success, ex_3;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    name = req.query.name;
                                    projectName = req.query.projectName;
                                    proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
                                    if (!proj) {
                                        resolve(api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist."));
                                        return [2 /*return*/];
                                    }
                                    cs = proj.getDatabaseSource(name);
                                    if (cs == null) {
                                        return [2 /*return*/, resolve(api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + name + "'"))];
                                    }
                                    return [4 /*yield*/, cs.UnInstallOrm()];
                                case 1:
                                    success = _a.sent();
                                    if (success) {
                                        cs.IsOrmInstalled = false;
                                        settings_instance_1.SettingsInstance.saveSettingsToFile();
                                        resolve(api_response_1.ApiResponse.Success());
                                    }
                                    else {
                                        resolve(api_response_1.ApiResponse.ExclamationModal("Failed to uninstall ORM"));
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    ex_3 = _a.sent();
                                    resolve(api_response_1.ApiResponse.Exception(ex_3));
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseController.GetSummary = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSource = req.query.dbSource;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
            }
            var routineCache = cs.cache;
            var ormSummary_1 = {};
            if (routineCache != null) {
                ormSummary_1.Groups = [];
                routineCache.forEach(function (r) {
                    var g = ormSummary_1.Groups.find(function (g) { return g.Type == r.Type; });
                    if (g)
                        g.Count++;
                    else
                        ormSummary_1.Groups.push({ Type: r.Type, Count: 1 });
                });
                ormSummary_1.LastUpdated = cs.LastUpdateDate;
                ormSummary_1.TotalCnt = routineCache.length;
            }
            else {
                ormSummary_1.TotalCnt = 0;
            }
            return api_response_1.ApiResponse.Payload({
                Orm: ormSummary_1,
                Rules: "TODO"
            });
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    DatabaseController.GetPlugins = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSource = req.query.dbSource;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
            }
            if (cs.Plugins == null)
                cs.Plugins = [];
            var ret = global["PluginAssemblies"].map(function (p) { return { Name: p.Name, Description: p.Description, Guid: "TODO!", Included: false, SortOrder: 0 }; });
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
    };
    DatabaseController.SavePluginConfig = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSource = req.query.dbSource;
            var pluginList = req.body;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
            }
            var ret = cs.updatePluginList(pluginList);
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
    };
    DatabaseController.ClearCache = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSource = req.query.dbSource;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
            }
            cs.clearCache();
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            return api_response_1.ApiResponse.Success();
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    DatabaseController.GetCachedRoutines = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSource = req.query.dbSource;
            var q_1 = req.query.q;
            var type_1 = req.query.type;
            var status = req.query.results;
            var hasMeta = req.query.hasMeta != null ? req.query.hasMeta.toLowerCase() == "true" : false;
            var isDeleted = req.query.isDeleted != null ? req.query.isDeleted.toLowerCase() == "true" : false;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
            }
            var routineCache = cs.cache;
            var results = routineCache;
            if (q_1 && q_1.trim() != "") {
                q_1 = q_1.toLowerCase();
                results = results.filter(function (r) { return r.FullName.toLowerCase().indexOf(q_1) >= 0; });
            }
            if (type_1 != "0" /*All*/) {
                results = results.filter(function (r) { return r.Type.toLowerCase() === type_1.toLowerCase(); });
            }
            if (status == "1" /*Has error*/) {
                results = results.filter(function (r) { return r.ResultSetError != null && r.ResultSetError.trim() != ""; });
            }
            else if (status == "2" /*No error*/) {
                results = results.filter(function (r) { return r.ResultSetError == null || r.ResultSetError.trim() == ""; });
            }
            if (hasMeta) {
                results = results.filter(function (r) { return r.jsDALMetadata != null && r.jsDALMetadata.jsDAL != null; });
            }
            if (isDeleted) {
                results = results.filter(function (r) { return r.IsDeleted; });
            }
            return api_response_1.ApiResponse.Payload({
                Results: results.sort(function (a, b) { return a.FullName.localeCompare(b.FullName); }),
                TotalCount: routineCache.length
            });
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    DatabaseController.GetWhitelistedDomains = function (req) {
        var projectName = req.query.projectName;
        var dbSource = req.query.dbSourceName;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj) {
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        }
        var cs = proj.getDatabaseSource(dbSource);
        if (cs == null) {
            return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
        }
        return api_response_1.ApiResponse.Payload({
            AllowAllPrivate: cs.WhitelistAllowAllPrivateIPs,
            Whitelist: cs.WhitelistedDomainsCsv ? cs.WhitelistedDomainsCsv.split(',') : null
        });
    };
    DatabaseController.UpdateWhitelist = function (req) {
        var projectName = req.query.projectName;
        var dbSource = req.query.dbSourceName;
        var whitelist = req.query.whitelist;
        var allowAllPrivate = req.query.allowAllPrivate;
        var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
        if (!proj) {
            return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
        }
        var cs = proj.getDatabaseSource(dbSource);
        if (cs == null) {
            return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
        }
        cs.WhitelistAllowAllPrivateIPs = allowAllPrivate;
        if (whitelist != null) {
            //Select(w => w.TrimEnd('\r')
            var ar = whitelist.split('\n').map(function (w) { return w.trim(); }).filter(function (w) { return w && w != ""; });
            console.log("ar", ar);
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
    };
    return DatabaseController;
}());
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