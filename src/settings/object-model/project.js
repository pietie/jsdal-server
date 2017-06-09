"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_source_1 = require("./database-source");
const shortid = require("shortid");
class Project {
    toJSON() {
        return { Name: this.Name, Guid: this.Guid, DatabaseSources: this.DatabaseSources };
    }
    constructor() {
        this.DatabaseSources = [];
    }
    static createFromJson(rawJson) {
        let project = new Project();
        project.Name = rawJson.Name;
        project.Guid = rawJson.Guid;
        for (let i = 0; i < rawJson.DatabaseSources.length; i++) {
            let dbs = rawJson.DatabaseSources[i];
            project.DatabaseSources.push(database_source_1.DatabaseSource.createFromJson(dbs));
        }
        //        console.dir(project);
        return project;
    }
    getDatabaseSource(logicalName) {
        if (this.DatabaseSources == null)
            return null;
        return this.DatabaseSources.find(dbs => dbs.Name.toLowerCase() == logicalName.toLowerCase());
    }
    removeConnectionString(dbSource) {
        this.DatabaseSources.splice(this.DatabaseSources.indexOf(dbSource), 1);
    }
    addMetadataConnectionString(name, dataSource, catalog, username, password, jsNamespace, defaultRoleMode, port, instanceName) {
        if (this.DatabaseSources == null)
            this.DatabaseSources = [];
        var cs = new database_source_1.DatabaseSource();
        cs.CacheKey = shortid.generate();
        cs.Name = name;
        cs.DefaultRuleMode = defaultRoleMode;
        let ret = cs.addUpdateDatabaseConnection(true /*isMetadataConnection*/, null, name, dataSource, catalog, username, password, port, instanceName);
        if (!ret.success)
            return ret;
        cs.JsNamespace = jsNamespace;
        this.DatabaseSources.push(cs);
        return { success: true, dbSource: cs };
    }
}
exports.Project = Project;
//# sourceMappingURL=project.js.map