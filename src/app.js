"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_instance_1 = require("./settings/settings-instance");
const work_spawner_1 = require("./generator/work-spawner");
const fs = require("fs");
const path = require("path");
const user_management_1 = require("./util/user-management");
const exception_logger_1 = require("./util/exception-logger");
user_management_1.UserManagement.loadUsersFromFile();
settings_instance_1.SettingsInstance.loadSettingsFromFile().then(() => {
    work_spawner_1.WorkSpawner.Start();
    CompileListOfAvailablePlugins();
    require('./web-app');
});
global["PluginAssemblies"] = []; // TOOD: Wrap nicely in a class?
function CompileListOfAvailablePlugins() {
    try {
        let pluginCollection = fs.readdirSync("./plugins").filter(p => p.toLowerCase().endsWith(".plugin.js"));
        pluginCollection.forEach(p => {
            p = path.resolve(path.join('./plugins', p));
            console.info(`\tLoading plugin "${p}"`);
            LoadPlugin(p);
        });
    }
    catch (e) {
        exception_logger_1.ExceptionLogger.logException(e);
        // TODO: Just log
        ///ignore?
        // console.log("e,",e);
    }
}
function LoadPlugin(path) {
    try {
        // bypass webpack ... I'm sure there must be a better way but for now this works fine!
        let r = eval("require");
        let PluginCollection = r(path).plugins;
        if (!PluginCollection)
            return;
        PluginCollection.forEach(Plugin => {
            try {
                let p = new Plugin();
                console.info(`\t${p.Name} (${p.Guid}) loaded`);
                // TODO: Check Id, check interface compatibility...
                global["PluginAssemblies"].push(p);
            }
            catch (e) {
                // TODO: Log
                console.log("Failed to load plugin ", Plugin, path);
            }
        });
    }
    catch (e) {
        // TODO: log
        console.log("Failed to load plugin ", path);
        console.log(e);
    }
}
//# sourceMappingURL=app.js.map