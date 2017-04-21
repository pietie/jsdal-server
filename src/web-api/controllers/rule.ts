import { ApiResponse } from './../api-response';
import { SettingsInstance } from './../../settings/settings-instance';
import { route } from './../decorators';

import { JsFile } from './../../settings/object-model/jsfile';

export class RuleController {

    @route("/api/rule", { post: true })
    public static Post(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSourceName: string = req.query.dbSource;
            let jsFilenameGuid: string = req.query.jsFilenameGuid;
            let json: string = req.query.json;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var dbSource = proj.getDatabaseSource(dbSourceName);

            if (dbSource == null) return ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);

            var obj = JSON.parse(json);

            if (!jsFilenameGuid) { // DB-level

                let ret = dbSource.addRule(obj.Type, obj.Text);

                if (ret.success) {
                    SettingsInstance.saveSettingsToFile();

                    //!GeneratorThreadDispatcher.SetRulesDirty(cs);

                    return ApiResponse.Success();
                }
                else {
                    return ApiResponse.ExclamationModal(ret.userErrorMsg);
                }
            }
            else {
                var jsFile = dbSource.JsFiles.find(js => js.Guid.toLowerCase() == jsFilenameGuid.toLowerCase());

                if (jsFile == null) return ApiResponse.ExclamationModal("The specified output file was not found.");

                let ret = jsFile.addRule(obj.Type, obj.Text);

                if (ret.success) {
                    SettingsInstance.saveSettingsToFile();

                    //!                    GeneratorThreadDispatcher.SetRulesDirty(cs);

                    return ApiResponse.Success();
                }
                else {
                    return ApiResponse.ExclamationModal(ret.userErrorMsg);
                }

            }

        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }
    }


    @route("/api/rule", { delete: true })
    public static Delete(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSourceName: string = req.query.dbSource;
            let jsFilenameGuid: string = req.query.jsFilenameGuid;
            let ruleGuid: string = req.query.ruleGuid;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var dbSource = proj.getDatabaseSource(dbSourceName);

            if (dbSource == null) return ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);


            if (!jsFilenameGuid) { // DB level
                let ret = dbSource.deleteRule(ruleGuid);

                if (ret.success) {
                    //!GeneratorThreadDispatcher.SetRulesDirty(cs);
                    SettingsInstance.saveSettingsToFile();
                    return ApiResponse.Success();
                }
                else {
                    return ApiResponse.ExclamationModal(ret.userErrorMsg);
                }
            }
            else {
                var jsFile = dbSource.JsFiles.find(js => js.Guid == jsFilenameGuid);

                if (jsFile == null) return ApiResponse.ExclamationModal("The specified output file was not found.");

                let ret = jsFile.deleteRule(ruleGuid);

                if (ret.success) {
                    //!GeneratorThreadDispatcher.SetRulesDirty(cs);
                    SettingsInstance.saveSettingsToFile();
                    return ApiResponse.Success();
                }
                else return ApiResponse.ExclamationModal(ret.userErrorMsg);
            }

        }
        catch (ex) {
            return ApiResponse.Exception(ex);

        }
    }

    @route("/api/rule/routineList")
    public static GetRoutineList(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSourceName: string = req.query.dbSource;
            let jsFilenameGuid: string = req.query.jsFilenameGuid;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var dbSource = proj.getDatabaseSource(dbSourceName);

            if (dbSource == null) return ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);

            var cache = dbSource.cache;

            if (cache == null) {
                return ApiResponse.ExclamationModal("Routine cache does not exist. Make sure the project thread is running and that it is able to access the database.");
            }

            let jsFile: JsFile = null;

            if (jsFilenameGuid) {

                jsFile = dbSource.JsFiles.find(js => js.Guid == jsFilenameGuid);

                if (jsFile == null) return ApiResponse.ExclamationModal("The specified output file was not found.");
            }

            if (jsFile == null) {
                dbSource.applyDbLevelRules();

                let dbLevel = JsFile.DBLevel.Guid;

                let ret = cache.filter(row => !row.IsDeleted).sort((a, b) => a.FullName.localeCompare(b.FullName)).map(row => {

                    let ruleIns = row.RuleInstructions[dbLevel];

                    return {
                        RoutineFullName: row.FullName,
                        Included: !!ruleIns.Included,
                        Excluded: !!ruleIns.Excluded,
                        Reason: ruleIns.Reason,
                        Source: ruleIns.Source
                    }
                });

                return ApiResponse.Payload(ret);
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
                    }
                });

                return ApiResponse.Payload(ret);
            }
        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }
    }



    @route("/api/rule/ruleList")
    public static GetRuleList(req): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSourceName: string = req.query.dbSource;
            let jsFilenameGuid: string = req.query.jsFilenameGuid;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var dbSource = proj.getDatabaseSource(dbSourceName);

            if (dbSource == null) return ApiResponse.ExclamationModal(`The data source '${dbSourceName}' does not exist.`);

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

            if (!jsFilenameGuid) { // DB-level

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
                return ApiResponse.Payload(dbSourceRules);
            }
            else { //  JsFile-level
                var jsFile = dbSource.JsFiles.find(js => js.Guid == jsFilenameGuid);

                if (jsFile == null) return ApiResponse.ExclamationModal("The specified output file was not found.");

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
                        AffectedCount: 9999// TODO:! (ruleLookup.ContainsKey(r) ? ruleLookup[r].Count : 0)
                    };
                });

                let ret = [...dbSourceRules, ...jsFileRules].sort((a, b) => { return (a.IsDataSourceRule === b.IsDataSourceRule) ? 0 : a.IsDataSourceRule ? -1 : 1; });

                return ApiResponse.Payload(ret);

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
            return ApiResponse.Exception(ex);
        }
    }
}