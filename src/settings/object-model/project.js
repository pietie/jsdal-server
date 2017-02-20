"use strict";
var database_source_1 = require("./database-source");
var shortid = require("shortid");
var Project = (function () {
    function Project() {
        this.DatabaseSources = [];
    }
    Project.createFromJson = function (name, rawJson) {
        var project = new Project();
        project.Name = name;
        project.Guid = rawJson.Guid;
        for (var i = 0; i < rawJson.DatabaseSources.length; i++) {
            var dbs = rawJson.DatabaseSources[i];
            project.DatabaseSources.push(database_source_1.DatabaseSource.createFromJson(dbs));
        }
        //        console.dir(project);
        return project;
    };
    Project.prototype.getDatabaseSource = function (logicalName) {
        if (this.DatabaseSources == null)
            return null;
        return this.DatabaseSources.find(function (dbs) { return dbs.Name.toLowerCase() == logicalName.toLowerCase(); });
    };
    Project.prototype.removeConnectionString = function (dbSource) {
        this.DatabaseSources.splice(this.DatabaseSources.indexOf(dbSource), 1);
    };
    Project.prototype.addMetadataConnectionString = function (name, dataSource, catalog, username, password, jsNamespace, defaultRoleMode) {
        if (this.DatabaseSources == null)
            this.DatabaseSources = [];
        var cs = new database_source_1.DatabaseSource();
        cs.CacheKey = shortid.generate();
        cs.Name = name;
        cs.DefaultRuleMode = defaultRoleMode;
        var ret = cs.addUpdateDatabaseConnection(true /*isMetadataConnection*/, null, name, dataSource, catalog, username, password);
        if (!ret.success)
            return ret;
        cs.JsNamespace = jsNamespace;
        this.DatabaseSources.push(cs);
        return { success: true, dbSource: cs };
    };
    return Project;
}());
exports.Project = Project;
