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
Object.defineProperty(exports, "__esModule", { value: true });
const api_response_1 = require("./../api-response");
const settings_instance_1 = require("./../../settings/settings-instance");
const decorators_1 = require("./../decorators");
const jsfile_1 = require("./../../settings/object-model/jsfile");
class RuleController {
    static Post(req) {
        try {
            let projectName = req.query.projectName;
            let dbSourceName = req.query.dbSource;
            let jsFilenameGuid = req.query.jsFilenameGuid;
            let json = req.query.json;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            var dbSource = proj.getDatabaseSource(dbSourceName);
            if (dbSource == null)
                return api_response_1.ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);
            var obj = JSON.parse(json);
            if (!jsFilenameGuid) {
                let ret = dbSource.addRule(obj.Type, obj.Text);
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
                var jsFile = dbSource.JsFiles.find(js => js.Guid.toLowerCase() == jsFilenameGuid.toLowerCase());
                if (jsFile == null)
                    return api_response_1.ApiResponse.ExclamationModal("The specified output file was not found.");
                let ret = jsFile.addRule(obj.Type, obj.Text);
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
    }
    static Delete(req) {
        try {
            let projectName = req.query.projectName;
            let dbSourceName = req.query.dbSource;
            let jsFilenameGuid = req.query.jsFilenameGuid;
            let ruleGuid = req.query.ruleGuid;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            var dbSource = proj.getDatabaseSource(dbSourceName);
            if (dbSource == null)
                return api_response_1.ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);
            if (!jsFilenameGuid) {
                let ret = dbSource.deleteRule(ruleGuid);
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
                var jsFile = dbSource.JsFiles.find(js => js.Guid == jsFilenameGuid);
                if (jsFile == null)
                    return api_response_1.ApiResponse.ExclamationModal("The specified output file was not found.");
                let ret = jsFile.deleteRule(ruleGuid);
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
    }
    static GetRoutineList(req) {
        try {
            let projectName = req.query.projectName;
            let dbSourceName = req.query.dbSource;
            let jsFilenameGuid = req.query.jsFilenameGuid;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            var dbSource = proj.getDatabaseSource(dbSourceName);
            if (dbSource == null)
                return api_response_1.ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);
            var cache = dbSource.cache;
            if (cache == null) {
                return api_response_1.ApiResponse.ExclamationModal("Routine cache does not exist. Make sure the project thread is running and that it is able to access the database.");
            }
            let jsFile = null;
            if (jsFilenameGuid) {
                jsFile = dbSource.JsFiles.find(js => js.Guid == jsFilenameGuid);
                if (jsFile == null)
                    return api_response_1.ApiResponse.ExclamationModal("The specified output file was not found.");
            }
            if (jsFile == null) {
                dbSource.applyDbLevelRules();
                let dbLevel = jsfile_1.JsFile.DBLevel.Guid;
                let ret = cache.filter(row => !row.IsDeleted).sort((a, b) => a.FullName.localeCompare(b.FullName)).map(row => {
                    let ruleIns = row.RuleInstructions[dbLevel];
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
                dbSource.applyRules(jsFile);
                let ret = cache.filter(row => !row.IsDeleted).sort((a, b) => a.FullName.localeCompare(b.FullName)).map(row => {
                    let ruleIns = row.RuleInstructions[jsFile.Guid];
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
    }
    static GetRuleList(req) {
        try {
            let projectName = req.query.projectName;
            let dbSourceName = req.query.dbSource;
            let jsFilenameGuid = req.query.jsFilenameGuid;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            var dbSource = proj.getDatabaseSource(dbSourceName);
            if (dbSource == null)
                return api_response_1.ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);
            var cachedRoutines = dbSource.cache;
            dbSource.applyDbLevelRules();
            //                var ruleLookup = cachedRoutines?.GroupBy(cr => cr.RuleInstructions[JsFile.DBLevel]?.Rule)
            //                  .Select(g => new { Rule = g.Key, Count = g.Count() }).Where(g => g.Rule != null).ToDictionary(k => k.Rule);
            let ruleLookup = {};
            if (cachedRoutines) {
                // group by Rule...select KV....where Rule != null....ToLookup
                let dbLevelRuleInstructions = cachedRoutines.map(cr => cr.RuleInstructions.DbLevel).filter(r => r != null && r.Rule != null);
                ruleLookup = dbLevelRuleInstructions.reduce((acc, cur) => {
                    acc[cur.Rule.Guid] = acc[cur.Rule.Guid] || { Cnt: 0 };
                    acc[cur.Rule.Guid].Cnt = acc[cur.Rule.Guid].Cnt + 1;
                    return acc;
                }, {});
            }
            let dbSourceRules = dbSource.Rules.filter(r => r != null).map(rule => {
                return {
                    Ix: dbSource.Rules.indexOf(rule) + 1,
                    Type: rule.Type,
                    Description: rule.toString(),
                    Guid: rule.Guid,
                    IsDataSourceRule: true,
                    DBLevelOnly: true,
                    AffectedCount: ruleLookup[rule.Guid] != null ? ruleLookup[rule.Guid].Cnt : 0
                };
            });
            if (!jsFilenameGuid) {
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
                var jsFile = dbSource.JsFiles.find(js => js.Guid == jsFilenameGuid);
                if (jsFile == null)
                    return api_response_1.ApiResponse.ExclamationModal("The specified output file was not found.");
                dbSource.applyRules(jsFile);
                //var ruleLookup = cachedRoutines ?.GroupBy(cr => cr.RuleInstructions[jsFile] ?.Rule)
                //                    .Select(g => new { Rule = g.Key, Count = g.Count() }).Where(g => g.Rule != null).ToDictionary(k => k.Rule);
                //                var ruleLookup = cachedRoutines?.GroupBy(cr => cr.RuleInstructions[JsFile.DBLevel]?.Rule)
                //                  .Select(g => new { Rule = g.Key, Count = g.Count() }).Where(g => g.Rule != null).ToDictionary(k => k.Rule);
                let jsFileRules = jsFile.Rules.filter(r => r != null).map(rule => {
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
                let ret = [...dbSourceRules, ...jsFileRules].sort((a, b) => { return (a.IsDataSourceRule === b.IsDataSourceRule) ? 0 : a.IsDataSourceRule ? -1 : 1; });
                return api_response_1.ApiResponse.Payload(ret);
                /**
                              var q = (from r in jsFile.Rules
                              select new
                                  {
                                      Ix = jsFile.Rules.IndexOf(r) + 1,
                                      Type = (int)r.Type,
                                      Description = r.ToString(),
                                      r.Guid,
                                      IsDataSourceRule = false,
                                      DBLevelOnly = false,
                                      AffectedCount = (ruleLookup.ContainsKey(r) ? ruleLookup[r].Count : 0)
                                  }).Union(
                                      from r in cs.Rules
                                                  select new
                                          {
                                              Ix = cs.Rules.IndexOf(r) + 1,
                                              Type = (int)r.Type,
                                              Description = r.ToString(),
                                              r.Guid,
                                              IsDataSourceRule = true,
                                              DBLevelOnly = false,
                                              AffectedCount = (ruleLookup.ContainsKey(r) ? ruleLookup[r].Count : 0)
                                          }
                                  ).OrderByDescending(e => e.IsDataSourceRule).ThenBy(e => e.Ix)
                                      .ToList();
              
                              return ApiResponse.Payload(ret);**/
            }
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
}
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