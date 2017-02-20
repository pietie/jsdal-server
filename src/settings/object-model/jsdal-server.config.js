"use strict";
var project_1 = require("./project");
var JsDalServerConfig = (function () {
    function JsDalServerConfig() {
        this.ProjectList = [];
    }
    JsDalServerConfig.createFromJson = function (rawJson) {
        if (!rawJson || typeof (rawJson.ProjectList) === undefined)
            return null;
        var config = new JsDalServerConfig();
        config.Settings = Settings.createFromJson(rawJson.Settings);
        for (var e in rawJson.ProjectList) {
            config.ProjectList.push(project_1.Project.createFromJson(e, rawJson.ProjectList[e]));
        }
        return config;
    };
    JsDalServerConfig.prototype.exists = function (projectName) {
        if (!this.ProjectList)
            return false;
        var existing = this.ProjectList.filter(function (p) { return p.Name.toLowerCase() == projectName.toLowerCase(); });
        return (existing && existing.length > 0);
    };
    JsDalServerConfig.prototype.getProject = function (name) {
        if (!name)
            return null;
        var existing = this.ProjectList.filter(function (p) { return p.Name.toLowerCase() == name.toLowerCase(); });
        if (!existing || existing.length == 0)
            return null;
        return existing[0];
    };
    JsDalServerConfig.prototype.AddProject = function (name) {
        if (this.ProjectList == null)
            this.ProjectList = [];
        if (this.exists(name)) {
            return { success: false, userError: "A project with the name \"" + name + "\" already exists." };
        }
        var proj = new project_1.Project();
        proj.Name = name;
        this.ProjectList.push(proj);
        return { success: true };
    };
    JsDalServerConfig.prototype.UpdateProject = function (currentName, newName) {
        if (this.ProjectList == null)
            this.ProjectList = [];
        if (this.exists(newName)) {
            return { success: false, userError: "A project with the name \"" + newName + "\" already exists." };
        }
        if (!this.exists(currentName)) {
            return { success: false, userError: "The project \"" + newName + "\" does not exist so the update operation cannot continue." };
        }
        var existing = this.ProjectList.filter(function (p) { return p.Name.toLowerCase() == currentName.toLowerCase(); })[0];
        existing.Name = newName;
        return { success: true };
    };
    JsDalServerConfig.prototype.DeleteProject = function (name) {
        if (this.ProjectList == null)
            this.ProjectList = [];
        if (!this.exists(name)) {
            return { success: false, userError: "The project \"" + name + "\" does not exist." };
        }
        var existing = this.ProjectList.filter(function (p) { return p.Name.toLowerCase() == name.toLowerCase(); })[0];
        this.ProjectList.splice(this.ProjectList.indexOf(existing), 1);
        return { success: true };
    };
    return JsDalServerConfig;
}());
exports.JsDalServerConfig = JsDalServerConfig;
// TODO: move to another file
var Settings = (function () {
    function Settings() {
        this.DbSource_CheckForChangesInMilliseconds = 200;
    }
    Settings.createFromJson = function (rawJson) {
        if (!rawJson || typeof (rawJson.ProjectList) === undefined)
            return null;
        var settings = new Settings();
        settings.DbSource_CheckForChangesInMilliseconds = rawJson.DbSource_CheckForChangesInMilliseconds;
        return settings;
    };
    return Settings;
}());
exports.Settings = Settings;
