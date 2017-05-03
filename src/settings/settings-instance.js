"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const object_model_1 = require("./object-model");
class SettingsInstance {
    static get Instance() {
        return SettingsInstance._instance;
    }
    static get settingsFilePath() {
        return "./test/jsdal-server.json";
    }
    static saveSettingsToFile() {
        try {
            var json = JSON.stringify(this._instance);
            fs.writeFileSync(SettingsInstance.settingsFilePath, json, { encoding: "utf8" });
        }
        catch (ex) {
            console.error(ex);
            //!SessionLog.Exception(ex);
        }
    }
    static loadSettingsFromFile() {
        return new Promise((resolve, reject) => {
            try {
                if (!fs.existsSync(SettingsInstance.settingsFilePath))
                    return;
                fs.readFile(SettingsInstance.settingsFilePath, { encoding: "utf8" }, (err, data) => {
                    if (!err) {
                        let settingsInst = object_model_1.JsDalServerConfig.createFromJson(JSON.parse(data));
                        settingsInst.ProjectList.forEach(p => p.DatabaseSources.forEach(dbs => {
                            dbs.loadCache();
                        }));
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
    }
}
exports.SettingsInstance = SettingsInstance;
//# sourceMappingURL=settings-instance.js.map