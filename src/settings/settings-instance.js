"use strict";
var fs = require("fs");
var object_model_1 = require("./object-model");
var SettingsInstance = (function () {
    function SettingsInstance() {
    }
    Object.defineProperty(SettingsInstance, "Instance", {
        get: function () {
            return SettingsInstance._instance;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SettingsInstance, "settingsFilePath", {
        get: function () {
            return "./test/jsdal-server.json";
        },
        enumerable: true,
        configurable: true
    });
    SettingsInstance.saveSettingsToFile = function () {
        try {
            var json = JSON.stringify(this._instance);
            fs.writeFileSync(SettingsInstance.settingsFilePath, json, { encoding: "utf8" });
        }
        catch (ex) {
            console.error(ex);
        }
    };
    SettingsInstance.loadSettingsFromFile = function () {
        return new Promise(function (resolve, reject) {
            try {
                if (!fs.existsSync(SettingsInstance.settingsFilePath))
                    return;
                fs.readFile(SettingsInstance.settingsFilePath, { encoding: "utf8" }, function (err, data) {
                    if (!err) {
                        var settingsInst = object_model_1.JsDalServerConfig.createFromJson(JSON.parse(data));
                        settingsInst.ProjectList.forEach(function (p) { return p.DatabaseSources.forEach(function (dbs) {
                            dbs.loadCache();
                        }); });
                        SettingsInstance._instance = settingsInst;
                        resolve(true);
                    }
                    else {
                        // TODO: handle file reading error
                        reject(err);
                    }
                });
            }
            catch (e) {
                console.error(e);
                // TODO: Error handler
                reject(e);
            }
        });
    };
    return SettingsInstance;
}());
exports.SettingsInstance = SettingsInstance;
//# sourceMappingURL=settings-instance.js.map