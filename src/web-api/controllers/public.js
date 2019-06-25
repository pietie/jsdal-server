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
const settings_instance_1 = require("./../../settings/settings-instance");
const decorators_1 = require("./../decorators");
const exception_logger_1 = require("./../../util/exception-logger");
const fs = require("fs");
const crypto = require("crypto");
class PublicController {
    static ping() {
        return "1.0";
    }
    static HostName() {
        //var he = Dns.GetHostEntry("localhost");
        //return he ?.HostName;
        return "TODO";
    }
    static ListProjects() {
        try {
            return settings_instance_1.SettingsInstance.Instance.ProjectList.map(p => { return { Name: p.Name, Guid: p.Guid }; });
        }
        catch (ex) {
            exception_logger_1.ExceptionLogger.logException(ex);
            throw ex;
        }
    }
    static GetDbSources(req, res) {
        try {
            let projectGuid = req.query.projectGuid;
            let project = settings_instance_1.SettingsInstance.Instance.ProjectList.find(p => p.Guid != null && p.Guid.toLowerCase() == projectGuid.toLowerCase()); //.FirstOrDefault(p => p.Value.Guid.Equals(projectGuid)).Value;
            if (project == null) {
                //return new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent($"The Project {projectGuid} does not exist.") };
                res.status(404).send(`The Project ${projectGuid} does not exist.`);
                return;
            }
            let dbSources = project.DatabaseSources.map(db => { return { Name: db.Name, Guid: db.CacheKey }; });
            return dbSources;
        }
        catch (e) {
            exception_logger_1.ExceptionLogger.logException(e);
            throw e; // TODO: return error id
        }
    }
    static GetOutputDetail(req, res) {
        try {
            let projectGuid = req.query.projectGuid;
            let project = settings_instance_1.SettingsInstance.Instance.ProjectList.find(p => p.Guid != null && p.Guid.toLowerCase() == projectGuid.toLowerCase());
            if (project == null) {
                res.status(404).send(`The Project ${projectGuid} does not exist.`);
                return;
            }
            return project.DatabaseSources.map(db => {
                return {
                    Guid: db.CacheKey,
                    Name: db.Name,
                    Files: db.JsFiles.map(f => {
                        return {
                            Filename: f.Filename,
                            Guid: f.Guid,
                            Version: f.Version
                        };
                    })
                };
            });
        }
        catch (e) {
            exception_logger_1.ExceptionLogger.logException(e);
            throw e;
        }
    }
    static GetOutputFiles(req, res) {
        try {
            // TODO: review use of toLowerCase
            let dbSourceGuid = req.query.dbSourceGuid;
            //let dbSource = SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources).find(dbs => dbs.find(db => db.CacheKey.toLowerCase() == dbSourceGuid.toLowerCase());
            let project = settings_instance_1.SettingsInstance.Instance.ProjectList.find(p => p.DatabaseSources.find(db => db.CacheKey.toLowerCase() == dbSourceGuid.toLowerCase()) != null);
            if (project == null) {
                res.status(404).send(`The DB Source ${dbSourceGuid} does not exist.`);
            }
            let dbSource = project.DatabaseSources.find(db => db.CacheKey.toLowerCase() == dbSourceGuid.toLowerCase());
            if (dbSource == null) {
                res.status(404).send(`The DB Source ${dbSourceGuid} does not exist.`);
            }
            return dbSource.JsFiles.map(f => { return { Filename: f.Filename, Guid: f.Guid, Version: f.Version }; });
        }
        catch (e) {
            exception_logger_1.ExceptionLogger.logException(e);
            throw e;
        }
    }
    static ServeFile(req, res) {
        try {
            let fileGuid = req.params.fileGuid;
            let v = parseInt(req.query.v);
            let min = req.query.min != null ? req.query.min.toLowerCase() == "true" : false;
            let tsd = req.query.tsd;
            if (v == null || isNaN(v))
                v = 0;
            if (min == null)
                min = false;
            if (tsd == null)
                tsd = false;
            if (settings_instance_1.SettingsInstance.Instance.ProjectList == null) {
                res.status(404).send(null);
                return;
            }
            const flatten = arr => arr.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
            let dbSources = flatten(settings_instance_1.SettingsInstance.Instance.ProjectList.map(p => p.DatabaseSources));
            let jsFilesFlat = flatten(dbSources.map(db => db.JsFiles));
            // TODO: reconsider the use of ToLowerCase once all IDs have been switched over to shortid
            let jsFile = jsFilesFlat.find(f => f.Guid.toLowerCase() == fileGuid.toLowerCase());
            if (jsFile == null) {
                res.status(404).send(null);
                return;
            }
            let dbSource = dbSources.find(db => db.JsFiles.indexOf(jsFile) >= 0);
            if (tsd) // typescript definition
             {
                return PublicController.serveTypescriptDefinition(req, res, jsFile, dbSource);
            }
            let path = min ? dbSource.minifiedOutputFilePath(jsFile) : dbSource.outputFilePath(jsFile);
            if (!fs.existsSync(path)) {
                res.status(412).send("The requested file is not valid or has not been generated yet.");
                return null;
            }
            let jsFileData = null;
            //fs.readFileSync(path, { encoding: "utf8" });
            jsFileData = fs.readFileSync(path);
            let etagForLatestFile = PublicController.computeETag(jsFileData);
            let etagFromRequest = req.headers["if-none-match"];
            if (etagFromRequest && etagFromRequest.trim() != '' && etagForLatestFile && etagForLatestFile.trim() != '') {
                if (`"${etagForLatestFile}"` == etagFromRequest) {
                    //return new HttpResponseMessage(HttpStatusCode.NotModified);
                    res.status(304).send(null);
                    return null;
                }
            }
            res.contentType("text/javascript");
            if (jsFile.Version == undefined) {
                jsFile.Version = 1;
            }
            res.setHeader('jsfver', jsFile.Version.toString());
            res.setHeader('ETag', etagForLatestFile);
            res.send(jsFileData);
            return null;
        }
        catch (ex) {
            exception_logger_1.ExceptionLogger.logException(ex);
            throw ex;
        }
    }
    static computeETag(data) {
        let hash = crypto.createHash('md5').update(data).digest("hex");
        return hash;
        // byte[] md5data = ((System.Security.Cryptography.HashAlgorithm)System.Security.Cryptography.CryptoConfig.CreateFromName("MD5")).ComputeHash(data);
        // return "\"" + BitConverter.ToString(md5data).Replace("-", "").ToLower() + "\"";
    }
    static serveTypescriptDefinition(req, res, jsFile, dbSource) {
        if (jsFile == null && dbSource != null) {
            // TODO: Get server ip/dns name???
            let refs = dbSource.JsFiles.map(f => `/// <reference path="./api/tsd/${f.Guid}" />`);
            let content = "";
            if (refs.length > 0) {
                content = refs.join("\r\n");
            }
            res.contentType("text/javascript");
            res.send(content);
            return null;
        }
        let tsdFilePath = dbSource.outputTypeScriptTypingsFilePath(jsFile);
        if (!fs.existsSync(tsdFilePath)) {
            res.status(404).send();
            return null;
        }
        let tsdData = fs.readFileSync(tsdFilePath);
        res.contentType("text/javascript");
        res.setHeader('jsfver', jsFile.Version.toString());
        res.send(tsdData);
        return null;
    }
    static ServeCommonTSD(req, res) {
        try {
            let typescriptDefinitionsCommon = fs.readFileSync('./resources/TypeScriptDefinitionsCommon.d.ts');
            res.contentType("text/javascript");
            res.send(typescriptDefinitionsCommon);
            return null;
        }
        catch (ex) {
            res.status(500).send(ex.toString());
            //?            SessionLog.Exception(ex);
            return null;
        }
    }
}
__decorate([
    decorators_1.route("/api/jsdal/ping", { get: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], PublicController, "ping", null);
__decorate([
    decorators_1.route("/api/hostname", { get: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], PublicController, "HostName", null);
__decorate([
    decorators_1.route("/api/jsdal/projects", { get: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Array)
], PublicController, "ListProjects", null);
__decorate([
    decorators_1.route("/api/jsdal/dbsources", { get: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Object)
], PublicController, "GetDbSources", null);
__decorate([
    decorators_1.route("/api/jsdal/outputs", { get: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Object)
], PublicController, "GetOutputDetail", null);
__decorate([
    decorators_1.route("/api/jsdal/files", { get: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Object)
], PublicController, "GetOutputFiles", null);
__decorate([
    decorators_1.route("/api/js/:fileGuid", { get: true }, true) // TODO: support multiple ways api/js/quickRef .... api/js/projName/dbSourceName/fileName (e.g. api/js/vZero/IceV0_Audit/General.js)
    ,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Object)
], PublicController, "ServeFile", null);
__decorate([
    decorators_1.route("/api/tsd/common", { get: true }, true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PublicController, "ServeCommonTSD", null);
exports.PublicController = PublicController;
/*
        [HttpGet]
        [Route("api/tsd/{guid}")] // {guid} can be either a JsFile Guid or a DB source guid - if it's a DB Source then we return DBSource/all.d.ts
        public HttpResponseMessage ServeFileTypings(Guid guid)
        {
            try
            {
                if (Settings.Instance.ProjectList == null) return new HttpResponseMessage(HttpStatusCode.NotFound);

                var dbSource = Settings.Instance.ProjectList.SelectMany(p => p.Value.DatabaseSources).FirstOrDefault(db=>db.CacheKey.Equals(guid));

                // if the specified Guid is not a DBSource try looking for a file
                if (dbSource == null)
                {
                    var jsFile = Settings.Instance.ProjectList.SelectMany(p => p.Value.DatabaseSources).SelectMany(db => db.JsFiles).FirstOrDefault(f => f.Guid.Equals(guid));

                    if (jsFile == null) return new HttpResponseMessage(HttpStatusCode.NotFound);

                    dbSource = Settings.Instance.ProjectList.SelectMany(p => p.Value.DatabaseSources).First(db => db.JsFiles.Contains(jsFile));

                    return ServeTypescriptDefinition(jsFile, dbSource);

                }

                return ServeTypescriptDefinition(null, dbSource);

            }
            catch (Exception ex)
            {
                SessionLog.Exception(ex);
                var error = new HttpResponseMessage(HttpStatusCode.InternalServerError);

                error.Content = new StringContent(ex.Message);

                return error;
            }
        }

        



        private static HttpResponseMessage ServeTypescriptDefinition(Classes.ProjectObjectModel.JsFile jsFile, Classes.ProjectObjectModel.DatabaseSource dbSource)
        {
            if (jsFile == null && dbSource != null)
            {
                // TODO: Get server ip/dns name???
                var refs = dbSource.JsFiles.Select(f=> $"/// <reference path=\"./api/tsd/{f.Guid}\" />").ToArray();
                string content = "";

                if (refs.Length > 0)
                {
                    content = string.Join("\r\n", refs);
                }

                var retDB = new HttpResponseMessage(HttpStatusCode.OK);

                retDB.Content = new StringContent(content);
                retDB.Content.Headers.ContentType = new MediaTypeHeaderValue("text/javascript");

                //?retDB.Headers.Add("jsfver", jsFile.Version.ToString());

                return retDB;
            }

            var tsdFilePath = dbSource.OutputTypeScriptTypingsFilePath(jsFile);

            if (!File.Exists(tsdFilePath)) return new HttpResponseMessage(HttpStatusCode.NotFound);

            byte[] tsdData;

            using (var fs = File.Open(tsdFilePath, System.IO.FileMode.Open, System.IO.FileAccess.Read, System.IO.FileShare.Read))
            {
                tsdData = new byte[fs.Length];
                fs.Read(tsdData, 0, tsdData.Length);
            }

            var ret = new HttpResponseMessage(HttpStatusCode.OK);

            ret.Content = new ByteArrayContent(tsdData);
            ret.Content.Headers.ContentType = new MediaTypeHeaderValue("text/javascript");

            ret.Headers.Add("jsfver", jsFile.Version.ToString());

            return ret;
        }

        
        [HttpGet]
        [Route("api/meta")]
        public List<dynamic> GetMetadataUpdates([FromUri] Guid dbSourceGuid, [FromUri] long maxRowver)
        {
            try
            {
                var db = Settings.Instance.ProjectList.SelectMany(p => p.Value.DatabaseSources).FirstOrDefault(d => d.CacheKey == dbSourceGuid);

                if (db == null) throw new Exception(string.Format("The DB source {0} was not found", dbSourceGuid));

                var cache = db.GetCache();

                if (cache == null) return null;

                var q = (from c in cache
                         where c.RowVer > maxRowver //&& !c.IsDeleted --> PL: We need to servce IsDeleted as well so that the subscribers can act on the operation
                         select new
                         {
                             Catalog = db.MetadataInitialCatalog,
                             Name = c.Routine,
                             c.Schema,
                             c.Parameters,
                             c.ResultSetError,
                             c.ResultSetMetadata,
                             c.jsDALMetadata?.jsDAL,
                             c.RowVer,
                             c.IsDeleted
                         }


                         ).ToList<dynamic>();


                return q;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                SessionLog.Exception(ex);
                return null;
            }
        }



        [HttpGet]
        [Route("api/thread/{dbSourceGuid}/status")]
        public HttpResponseMessage GetThreadStatus(Guid dbSourceGuid)
        {
            try
            {
                var workThread = GeneratorThreadDispatcher.GetThread(dbSourceGuid);

                if (workThread == null)
                {
                    return new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent($"The specified DB source {dbSourceGuid} is invalid or does not have a thread running.") };
                }

                var ret = new HttpResponseMessage(HttpStatusCode.OK);

                var obj = new
                {
                    workThread.CreateDate,
                    workThread.IsRunning,
                    workThread.Status
                };

                
                ret.Content = new StringContent(JsonConvert.SerializeObject(obj));
                ret.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

                return ret;
            }
            catch (Exception ex)
            {
                SessionLog.Exception(ex);
                var error = new HttpResponseMessage(HttpStatusCode.InternalServerError);

                error.Content = new StringContent(ex.Message);

                return error;
            }
        }

        */
//# sourceMappingURL=public.js.map