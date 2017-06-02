"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const object_model_1 = require("./object-model");
const exception_logger_1 = require("./../util/exception-logger");
class SettingsInstance {
    static get Instance() {
        return SettingsInstance._instance;
    }
    static get settingsFilePath() {
        return "./jsdal-server.json";
    }
    static saveSettingsToFile() {
        try {
            var json = JSON.stringify(this._instance);
            fs.writeFileSync(SettingsInstance.settingsFilePath, json, { encoding: "utf8" });
        }
        catch (ex) {
            exception_logger_1.ExceptionLogger.logException(ex);
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
                exception_logger_1.ExceptionLogger.logException(e);
                reject(e);
            }
        });
    }
}
exports.SettingsInstance = SettingsInstance;
//# sourceMappingURL=settings-instance.js.map