import { SettingsInstance } from './settings/settings-instance'
import { WorkSpawner } from './generator/work-spawner'

import './web-app';

import * as fs from 'fs'

SettingsInstance.loadSettingsFromFile().then(() => {
  WorkSpawner.Start();

  CompileListOfAvailablePlugins();
});


global["PluginAssemblies"] = [];// TOOD: Wrap nicely in a class?

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

function LoadPlugin(path: string) {
  try {

    let PluginCollection: any[] = require(path).plugins;

    if (!PluginCollection) return;

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