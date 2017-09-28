"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const object_model_1 = require("./../settings/object-model");
const database_source_1 = require("./../settings/object-model/database-source");
class SqlConfigBuilder {
    static build(con) {
        let sqlConfig = null;
        if (con instanceof object_model_1.Connection) {
            sqlConfig = {
                user: con.userID,
                password: con.password,
                server: con.dataSource,
                port: con.port != null && con.port !== undefined ? con.port : 1433,
                database: con.initialCatalog,
                connectionTimeout: 1000 * 30,
                requestTimeout: 1000 * 30,
                stream: false,
                options: {
                    appName: 'jsdal-server',
                    instanceName: con.instanceName != null && con.instanceName.trim() != "" ? con.instanceName : null,
                    encrypt: true,
                    useUTC: false
                }
            };
        }
        else if (con instanceof database_source_1.DatabaseSource) {
            sqlConfig = {
                user: con.userID,
                password: con.password,
                server: con.dataSource,
                port: con.port != null && con.port !== undefined ? con.port : 1433,
                database: con.initialCatalog,
                connectionTimeout: 1000 * 30,
                requestTimeout: 1000 * 30,
                stream: false,
                options: {
                    appName: `jsdal-server-${con.Name}`,
                    instanceName: con.instanceName != null && con.instanceName.trim() != "" ? con.instanceName : null,
                    encrypt: true,
                    useUTC: false
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
                connectionTimeout: 1000 * 30,
                requestTimeout: 1000 * 30,
                stream: false,
                options: {
                    appName: `jsdal-server-else`,
                    instanceName: con.instanceName != null && con.instanceName.trim() != "" ? con.instanceName : null,
                    encrypt: true,
                    useUTC: false
                }
            };
        }
        return sqlConfig;
    }
}
exports.SqlConfigBuilder = SqlConfigBuilder;
//# sourceMappingURL=sql-config-builder.js.map