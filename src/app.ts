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


/*

var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = `Akey○{Ω°UsEDtoenc!51ryptcoN3N$trings548§`;

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}
 
var hw = encrypt("Data source=12347;user id= 3242342; password=324234324")
// outputs hello world

console.log(decrypt(hw), hw);

*/