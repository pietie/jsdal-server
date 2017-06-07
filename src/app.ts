import { SettingsInstance } from './settings/settings-instance';
import { WorkSpawner } from './generator/work-spawner';

import * as fs from 'fs';
import * as path from 'path';

import { UserManagement } from "./util/user-management";
import { ExceptionLogger } from "./util/exception-logger";

UserManagement.loadUsersFromFile();

SettingsInstance.loadSettingsFromFile().then(() => {
  WorkSpawner.Start();
  CompileListOfAvailablePlugins();

  require('./web-app');
});


global["PluginAssemblies"] = [];// TOOD: Wrap nicely in a class?

function CompileListOfAvailablePlugins() {

  try {
    let pluginCollection = fs.readdirSync("./plugins").filter(p => p.toLowerCase().endsWith(".plugin.js"));

    pluginCollection.forEach(p => {
      p = path.resolve(path.join('./plugins', p));

      console.info(`\tLoading plugin "${p}"`)
      LoadPlugin(p);
    });
  }
  catch (e) {
    ExceptionLogger.logException(e);
    // TODO: Just log
    ///ignore?
    // console.log("e,",e);
  }
}

function LoadPlugin(path: string) {
  try {

    // bypass webpack ... I'm sure there must be a better way but for now this works fine!
    let r = eval("require");
    
    let PluginCollection: any[] = r(path).plugins;

    if (!PluginCollection) return;

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