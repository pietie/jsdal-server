import * as fs from 'fs';
import * as async from 'async';

import { JsDalServerConfig, Settings } from './object-model';
import { ExceptionLogger } from "./../util/exception-logger";

export class SettingsInstance {
    private static _instance: JsDalServerConfig;

    public static get Instance(): JsDalServerConfig {
        return SettingsInstance._instance;
    }

    public static get settingsFilePath(): string {
        return "./jsdal-server.json";
    }

    public static saveSettingsToFile() {
        try {
            var json = JSON.stringify(this._instance);

            fs.writeFileSync(SettingsInstance.settingsFilePath, json, { encoding: "utf8" });
        }
        catch (ex) {
            ExceptionLogger.logException(ex);
        }
    }

    public static loadSettingsFromFile(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            try {

                if (!fs.existsSync(SettingsInstance.settingsFilePath)) return;

                fs.readFile(SettingsInstance.settingsFilePath, { encoding: "utf8" }, (err, data) => {
                    if (!err) {

                        let settingsInst = JsDalServerConfig.createFromJson(JSON.parse(data));

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
                ExceptionLogger.logException(e);
                reject(e);
            }

        });


    }

}