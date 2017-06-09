import * as sql from 'mssql';
import { Connection } from "./../settings/object-model";
import { DatabaseSource } from "./../settings/object-model/database-source";

export class SqlConfigBuilder {
    static build(con: Connection | DatabaseSource | { user: string, password: string, server: string, database: string, port?: number, instanceName?: string }): sql.config {
        let sqlConfig: sql.config = null;

        if (con instanceof Connection) {
            sqlConfig = {
                user: con.userID,
                password: con.password,
                server: con.dataSource,
                port: con.port != null && con.port !== undefined ? con.port : 1433,
                database: con.initialCatalog,
                connectionTimeout: 1000 * 30, //TODO:make configurable
                requestTimeout: 1000 * 30,//TODO:make configurable
                stream: false, // You can enable streaming globally
                options: {
                    instanceName: con.instanceName != null && con.instanceName.trim() != "" ? con.instanceName : null,
                    encrypt: true
                }
            };
        }
        else if (con instanceof DatabaseSource) {
            sqlConfig = {
                user: con.userID,
                password: con.password,
                server: con.dataSource,
                port: con.port != null && con.port !== undefined ? con.port : 1433,
                database: con.initialCatalog,
                connectionTimeout: 1000 * 30, //TODO:make configurable
                requestTimeout: 1000 * 30,//TODO:make configurable
                stream: false, // You can enable streaming globally
                options: {
                    instanceName: con.instanceName != null && con.instanceName.trim() != "" ? con.instanceName : null,
                    encrypt: true
                }
            };
        }
        else {
            sqlConfig = {
                user: con.user,
                password: con.password,
                server: con.server,
                port: con.port != null && con.port !== undefined ? con.port : 1433,
                database: con.database,
                connectionTimeout: 1000 * 30, //TODO:make configurable
                requestTimeout: 1000 * 30,//TODO:make configurable
                stream: false, // You can enable streaming globally
                options: {
                    instanceName: con.instanceName != null && con.instanceName.trim() != "" ? con.instanceName : null,
                    encrypt: true
                }
            };
        }

        return sqlConfig;
    }


}