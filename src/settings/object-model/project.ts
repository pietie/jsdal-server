import { DatabaseSource } from './database-source'
import * as shortid from 'shortid'

export class Project {
    public Name: string;
    public Guid: string;
    public DatabaseSources: DatabaseSource[]; 

    public toJSON()
    {
        return { Name: this.Name, Guid: this.Guid, DatabaseSources: this.DatabaseSources  } ;
    }

    constructor() {
        this.DatabaseSources = [];
    }

    public static createFromJson(rawJson: any): Project {
        let project = new Project();

        project.Name = rawJson.Name;
        project.Guid = rawJson.Guid;

        for (let i = 0; i < rawJson.DatabaseSources.length; i++) {
            let dbs = rawJson.DatabaseSources[i];
            project.DatabaseSources.push(DatabaseSource.createFromJson(dbs));
        }

        //        console.dir(project);

        return project;
    }

    public getDatabaseSource(logicalName: string): DatabaseSource {
        if (this.DatabaseSources == null) return null;
        return this.DatabaseSources.find(dbs => dbs.Name.toLowerCase() == logicalName.toLowerCase());
    }

    public removeConnectionString(dbSource: DatabaseSource) {
        this.DatabaseSources.splice(this.DatabaseSources.indexOf(dbSource), 1);
    }

    public addMetadataConnectionString(name: string, dataSource: string, catalog: string, username: string, password: string, jsNamespace: string, defaultRoleMode: number): { success: boolean, userError?: string, dbSource?: DatabaseSource } {
        if (this.DatabaseSources == null) this.DatabaseSources = [];

        var cs = new DatabaseSource();

        cs.CacheKey = shortid.generate();
        cs.Name = name;
        cs.DefaultRuleMode = defaultRoleMode;

        let ret = cs.addUpdateDatabaseConnection(true/*isMetadataConnection*/, null, name, dataSource, catalog, username, password);

        if (!ret.success) return ret;

        cs.JsNamespace = jsNamespace;

        this.DatabaseSources.push(cs);

        return { success: true, dbSource: cs };
    }

}
