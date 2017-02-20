import * as fs from 'fs'
import * as async from 'async'

import { JsDalServerConfig } from './object-model'

export class SettingsInstance {
    private static _instance: JsDalServerConfig;

    public static get Instance(): JsDalServerConfig {
        return SettingsInstance._instance;
    }

    public static get settingsFilePath(): string {
        return "./test/jsdal-server.json";
    }

    public static saveSettingsToFile() {
        try {// TODO: Add locking mechanism here to handle concurrent writes
            var json = JSON.stringify(this._instance);

            //console.log("TO SAVE\tTO SAVE\tTO SAVE\tTO SAVE\r\n", json);

            //!File.WriteAllText(SettingsFilePath, json);

        }
        catch (ex) {
            //!SessionLog.Exception(ex);
        }
    }

    public static loadSettingsFromFile(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            try {
                if (!fs.existsSync(SettingsInstance.settingsFilePath)) return;

                fs.readFile(SettingsInstance.settingsFilePath, { encoding: "utf8" }, (err, data) => {
                    if (!err) {

                        let settingsInst = JsDalServerConfig.createFromJson(JSON.parse(data));


                        //  console.dir(settingsInst.ProjectList[0].DatabaseSources[0].ExecutionConnections[0].ConnectionStringDecrypted);

                        settingsInst.ProjectList.forEach(p => p.DatabaseSources.forEach(dbs => {
                            dbs.loadCache();
                        }));

                        SettingsInstance._instance = settingsInst;

                        resolve(true);

                        //console.log(settingsInst.ProjectList.map(p=>p.DatabaseSources));


                        // TODO: Deserialize into proper Settings related objects!
                        //console.log("data", Object.keys(json.ProjectList));

                        /*foreach(var cs in  _instance.ProjectList.SelectMany(p => p.Value.DatabaseSources))
                                    {
                                        cs.LoadCache();
                                    }*/
                    }
                    else {
                        // TODO: handle file reading error
                        reject(err);
                    }
                });

                /*
                            var json = File.ReadAllText(SettingsFilePath);
                
                            _instance = JsonConvert.DeserializeObject<Settings>(json, new JsonConverter[] { new RuleJsonConverter() });
                
                            foreach(var cs in  _instance.ProjectList.SelectMany(p => p.Value.DatabaseSources))
                            {
                                cs.LoadCache();
                            }
                */
            }
            catch (e) {
                console.error(e);
                // TODO: Error handler
                reject(e);
            }

        });


    }

}