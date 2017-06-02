"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_instance_1 = require("./settings/settings-instance");
const work_spawner_1 = require("./generator/work-spawner");
const fs = require("fs");
const user_management_1 = require("./util/user-management");
user_management_1.UserManagement.loadUsersFromFile();
settings_instance_1.SettingsInstance.loadSettingsFromFile().then(() => {
    work_spawner_1.WorkSpawner.Start();
    CompileListOfAvailablePlugins();
    require('./web-app');
});
global["PluginAssemblies"] = []; // TOOD: Wrap nicely in a class?
function CompileListOfAvailablePlugins() {
    try {
        // TODO: Figure out how we want to do JS-plugins
        let pluginCollection = fs.readdirSync("./plugins").filter(p => p.toLowerCase().endsWith(".plugin.js"));
        pluginCollection.forEach(p => LoadPlugin(`./../plugins/${p}`));
    }
    catch (e) {
        // TODO: Just log
        ///ignore?
        // console.log("e,",e);
    }
}
function LoadPlugin(path) {
    try {
        let PluginCollection = require(path).plugins;
        if (!PluginCollection)
            return;
        PluginCollection.forEach(Plugin => {
            try {
                let p = new Plugin();
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