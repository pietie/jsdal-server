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
var api_response_1 = require("./../api-response");
var settings_instance_1 = require("./../../settings/settings-instance");
var decorators_1 = require("./../decorators");
var jsfile_1 = require("./../../settings/object-model/jsfile");
var RuleController = (function () {
    function RuleController() {
    }
    RuleController.Post = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSourceName = req.query.dbSource;
            var jsFilenameGuid_1 = req.query.jsFilenameGuid;
            var json = req.query.json;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            var dbSource = proj.getDatabaseSource(dbSourceName);
            if (dbSource == null)
                return api_response_1.ApiResponse.ExclamationModal("The data source '" + dbSourceName + "' does not exist.");
            var obj = JSON.parse(json);
            if (!jsFilenameGuid_1) {
                var ret = dbSource.addRule(obj.Type, obj.Text);
                if (ret.success) {
                    settings_instance_1.SettingsInstance.saveSettingsToFile();
                    //!GeneratorThreadDispatcher.SetRulesDirty(cs);
                    return api_response_1.ApiResponse.Success();
                }
                else {
                    return api_response_1.ApiResponse.ExclamationModal(ret.userErrorMsg);
                }
            }
            else {
                var jsFile = dbSource.JsFiles.find(function (js) { return js.Guid.toLowerCase() == jsFilenameGuid_1.toLowerCase(); });
                if (jsFile == null)
                    return api_response_1.ApiResponse.ExclamationModal("The specified output file was not found.");
                var ret = jsFile.addRule(obj.Type, obj.Text);
                if (ret.success) {
                    settings_instance_1.SettingsInstance.saveSettingsToFile();
                    //!                    GeneratorThreadDispatcher.SetRulesDirty(cs);
                    return api_response_1.ApiResponse.Success();
                }
                else {
                    return api_response_1.ApiResponse.ExclamationModal(ret.userErrorMsg);
                }
            }
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    RuleController.Delete = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSourceName = req.query.dbSource;
            var jsFilenameGuid_2 = req.query.jsFilenameGuid;
            var ruleGuid = req.query.ruleGuid;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            var dbSource = proj.getDatabaseSource(dbSourceName);
            if (dbSource == null)
                return api_response_1.ApiResponse.ExclamationModal("The data source '" + dbSourceName + "' does not exist.");
            if (!jsFilenameGuid_2) {
                var ret = dbSource.deleteRule(ruleGuid);
                if (ret.success) {
                    //!GeneratorThreadDispatcher.SetRulesDirty(cs);
                    settings_instance_1.SettingsInstance.saveSettingsToFile();
                    return api_response_1.ApiResponse.Success();
                }
                else {
                    return api_response_1.ApiResponse.ExclamationModal(ret.userErrorMsg);
                }
            }
            else {
                var jsFile = dbSource.JsFiles.find(function (js) { return js.Guid == jsFilenameGuid_2; });
                if (jsFile == null)
                    return api_response_1.ApiResponse.ExclamationModal("The specified output file was not found.");
                var ret = jsFile.deleteRule(ruleGuid);
                if (ret.success) {
                    //!GeneratorThreadDispatcher.SetRulesDirty(cs);
                    settings_instance_1.SettingsInstance.saveSettingsToFile();
                    return api_response_1.ApiResponse.Success();
                }
                else
                    return api_response_1.ApiResponse.ExclamationModal(ret.userErrorMsg);
            }
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    RuleController.GetRoutineList = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSourceName = req.query.dbSource;
            var jsFilenameGuid_3 = req.query.jsFilenameGuid;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            var dbSource = proj.getDatabaseSource(dbSourceName);
            if (dbSource == null)
                return api_response_1.ApiResponse.ExclamationModal("The data source '" + dbSourceName + "' does not exist.");
            var cache = dbSource.cache;
            if (cache == null) {
                return api_response_1.ApiResponse.ExclamationModal("Routine cache does not exist. Make sure the project thread is running and that it is able to access the database.");
            }
            var jsFile_1 = null;
            if (jsFilenameGuid_3) {
                jsFile_1 = dbSource.JsFiles.find(function (js) { return js.Guid == jsFilenameGuid_3; });
                if (jsFile_1 == null)
                    return api_response_1.ApiResponse.ExclamationModal("The specified output file was not found.");
            }
            if (jsFile_1 == null) {
                dbSource.applyDbLevelRules();
                var dbLevel_1 = jsfile_1.JsFile.DBLevel.Guid;
                var ret = cache.filter(function (row) { return !row.IsDeleted; }).sort(function (a, b) { return a.FullName.localeCompare(b.FullName); }).map(function (row) {
                    var ruleIns = row.RuleInstructions[dbLevel_1];
                    return {
                        RoutineFullName: row.FullName,
                        Included: !!ruleIns.Included,
                        Excluded: !!ruleIns.Excluded,
                        Reason: ruleIns.Reason,
                        Source: ruleIns.Source
                    };
                });
                return api_response_1.ApiResponse.Payload(ret);
            }
            else {
                dbSource.applyRules(jsFile_1);
                var ret = cache.filter(function (row) { return !row.IsDeleted; }).sort(function (a, b) { return a.FullName.localeCompare(b.FullName); }).map(function (row) {
                    var ruleIns = row.RuleInstructions[jsFile_1.Guid];
                    return {
                        RoutineFullName: row.FullName,
                        Included: !!ruleIns.Included,
                        Excluded: !!ruleIns.Excluded,
                        Reason: ruleIns.Reason,
                        Source: ruleIns.Source
                    };
                });
                return api_response_1.ApiResponse.Payload(ret);
            }
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    RuleController.GetRuleList = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSourceName = req.query.dbSource;
            var jsFilenameGuid_4 = req.query.jsFilenameGuid;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            var dbSource = proj.getDatabaseSource(dbSourceName);
            if (dbSource == null)
                return api_response_1.ApiResponse.ExclamationModal("The data source '" + dbSourceName + "' does not exist.");
            var cachedRoutines = dbSource.cache;
            dbSource.applyDbLevelRules();
            //                var ruleLookup = cachedRoutines?.GroupBy(cr => cr.RuleInstructions[JsFile.DBLevel]?.Rule)
            //                  .Select(g => new { Rule = g.Key, Count = g.Count() }).Where(g => g.Rule != null).ToDictionary(k => k.Rule);
            var dbSourceRules = dbSource.Rules.filter(function (r) { return r != null; }).map(function (rule) {
                return {
                    Ix: dbSource.Rules.indexOf(rule) + 1,
                    Type: rule.Type,
                    Description: rule.toString(),
                    Guid: rule.Guid,
                    IsDataSourceRule: true,
                    DBLevelOnly: true,
                    AffectedCount: 9999 // TODO:! (ruleLookup.ContainsKey(r) ? ruleLookup[r].Count : 0)
                };
            });
            if (!jsFilenameGuid_4) {
                /*
                
                                var q = (from r in cs.Rules
                                select new
                                    {
                                        Ix = cs.Rules.IndexOf(r) + 1,
                                        Type = (int)r.Type,
                                        Description = r.ToString(),
                                        r.Guid,
                                        IsDataSourceRule = true,
                                        DBLevelOnly = true,
                                        AffectedCount = (ruleLookup.ContainsKey(r) ? ruleLookup[r].Count : 0)
                                    }).ToList();
                */
                return api_response_1.ApiResponse.Payload(dbSourceRules);
            }
            else {
                var jsFile = dbSource.JsFiles.find(function (js) { return js.Guid == jsFilenameGuid_4; });
                if (jsFile == null)
                    return api_response_1.ApiResponse.ExclamationModal("The specified output file was not found.");
                dbSource.applyRules(jsFile);
                //var ruleLookup = cachedRoutines ?.GroupBy(cr => cr.RuleInstructions[jsFile] ?.Rule)
                //                    .Select(g => new { Rule = g.Key, Count = g.Count() }).Where(g => g.Rule != null).ToDictionary(k => k.Rule);
                //                var ruleLookup = cachedRoutines?.GroupBy(cr => cr.RuleInstructions[JsFile.DBLevel]?.Rule)
                //                  .Select(g => new { Rule = g.Key, Count = g.Count() }).Where(g => g.Rule != null).ToDictionary(k => k.Rule);
                var jsFileRules = jsFile.Rules.filter(function (r) { return r != null; }).map(function (rule) {
                    return {
                        Ix: jsFile.Rules.indexOf(rule) + 1,
                        Type: rule.Type,
                        Description: rule.toString(),
                        Guid: rule.Guid,
                        IsDataSourceRule: false,
                        DBLevelOnly: false,
                        AffectedCount: 9999 // TODO:! (ruleLookup.ContainsKey(r) ? ruleLookup[r].Count : 0)
                    };
                });
                var ret = dbSourceRules.concat(jsFileRules).sort(function (a, b) { return (a.IsDataSourceRule === b.IsDataSourceRule) ? 0 : a.IsDataSourceRule ? -1 : 1; });
                return api_response_1.ApiResponse.Payload(ret);
            }
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    return RuleController;
}());
__decorate([
    decorators_1.route("/api/rule", { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], RuleController, "Post", null);
__decorate([
    decorators_1.route("/api/rule", { delete: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], RuleController, "Delete", null);
__decorate([
    decorators_1.route("/api/rule/routineList"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], RuleController, "GetRoutineList", null);
__decorate([
    decorators_1.route("/api/rule/ruleList"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], RuleController, "GetRuleList", null);
exports.RuleController = RuleController;
//# sourceMappingURL=rule.js.map