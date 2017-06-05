"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const project_1 = require("./project");
class JsDalServerConfig {
    constructor() {
        this.ProjectList = [];
    }
    static createFromJson(rawJson) {
        if (!rawJson)
            return null;
        let config = new JsDalServerConfig();
        config.Settings = Settings.createFromJson(rawJson.Settings);
        if (typeof (rawJson.ProjectList) !== "undefined") {
            for (var e in rawJson.ProjectList) {
                config.ProjectList.push(project_1.Project.createFromJson(rawJson.ProjectList[e]));
            }
        }
        return config;
    }
    exists(projectName) {
        if (!this.ProjectList)
            return false;
        let existing = this.ProjectList.filter(p => p.Name.toLowerCase() == projectName.toLowerCase());
        return (existing && existing.length > 0);
    }
    getProject(name) {
        if (!name)
            return null;
        let existing = this.ProjectList.filter(p => p.Name.toLowerCase() == name.toLowerCase());
        if (!existing || existing.length == 0)
            return null;
        return existing[0];
    }
    AddProject(name) {
        if (this.ProjectList == null)
            this.ProjectList = [];
        if (this.exists(name)) {
            return { success: false, userError: `A project with the name "${name}" already exists.` };
        }
        let proj = new project_1.Project();
        proj.Name = name;
        this.ProjectList.push(proj);
        return { success: true };
    }
    UpdateProject(currentName, newName) {
        if (this.ProjectList == null)
            this.ProjectList = [];
        if (this.exists(newName)) {
            return { success: false, userError: `A project with the name "${newName}" already exists.` };
        }
        if (!this.exists(currentName)) {
            return { success: false, userError: `The project "${newName}" does not exist so the update operation cannot continue.` };
        }
        let existing = this.ProjectList.filter(p => p.Name.toLowerCase() == currentName.toLowerCase())[0];
        existing.Name = newName;
        return { success: true };
    }
    DeleteProject(name) {
        if (this.ProjectList == null)
            this.ProjectList = [];
        if (!this.exists(name)) {
            return { success: false, userError: `The project "${name}" does not exist.` };
        }
        let existing = this.ProjectList.filter(p => p.Name.toLowerCase() == name.toLowerCase())[0];
        this.ProjectList.splice(this.ProjectList.indexOf(existing), 1);
        return { success: true };
    }
}
exports.JsDalServerConfig = JsDalServerConfig;
// TODO: move to another file
class Settings {
    constructor() {
        this.DbSource_CheckForChangesInMilliseconds = 200;
    }
    static createFromJson(rawJson) {
        if (!rawJson)
            return null;
        let settings = new Settings();
        settings.GoogleRecaptchaSecret = rawJson.GoogleRecaptchaSecret;
        settings.DbSource_CheckForChangesInMilliseconds = rawJson.DbSource_CheckForChangesInMilliseconds;
        settings.WebServer = WebServerSettings.createFromJson(rawJson);
        return settings;
    }
}
exports.Settings = Settings;
// TODO: move to another file
class WebServerSettings {
    constructor() {
        this.EnableBasicHttp = true;
        this.EnableSSL = false;
    }
    static createFromJson(rawJson) {
        if (!rawJson || typeof (rawJson.WebServer) === "undefined")
            return null;
        let settings = new WebServerSettings();
        settings.HttpServerHostname = rawJson.WebServer.HttpServerHostname;
        settings.HttpServerPort = rawJson.WebServer.HttpServerPort;
        settings.EnableBasicHttp = !!rawJson.WebServer.EnableBasicHttp;
        settings.EnableSSL = !!rawJson.WebServer.EnableSSL;
        settings.HttpsServerHostname = rawJson.WebServer.HttpsServerHostname;
        settings.HttpsServerPort = rawJson.WebServer.HttpsServerPort;
        return settings;
    }
}
exports.WebServerSettings = WebServerSettings;
//# sourceMappingURL=jsdal-server.config.js.map