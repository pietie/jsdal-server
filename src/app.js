"use strict";
var settings_instance_1 = require("./settings/settings-instance");
var work_spawner_1 = require("./generator/work-spawner");
require("./web-app");
var fs = require("fs");
settings_instance_1.SettingsInstance.loadSettingsFromFile().then(function () {
    work_spawner_1.WorkSpawner.Start();
    CompileListOfAvailablePlugins();
});
global["PluginAssemblies"] = []; // TOOD: Wrap nicely in a class?
function CompileListOfAvailablePlugins() {
    try {
        // TODO: Figure out how we want to do JS-plugins
        var pluginCollection = fs.readdirSync("./plugins").filter(function (p) { return p.toLowerCase().endsWith(".plugin.js"); });
        pluginCollection.forEach(function (p) { return LoadPlugin("./../plugins/" + p); });
    }
    catch (e) {
    }
}
function LoadPlugin(path) {
    try {
        var PluginCollection = require(path).plugins;
        if (!PluginCollection)
            return;
        PluginCollection.forEach(function (Plugin) {
            try {
                var p = new Plugin();
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
