"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var api_response_1 = require("./../api-response");
var settings_instance_1 = require("./../../settings/settings-instance");
var decorators_1 = require("./../decorators");
var JsFileController = (function () {
    function JsFileController() {
    }
    JsFileController.GetJsFiles = function (req, res) {
        try {
            var projectName = req.query.projectName;
            var dbSource = req.query.dbSource;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
            }
            var q = cs.JsFiles.map(function (j) { return { Filename: j.Filename, Guid: j.Guid }; }).sort(function (a, b) { return a.Filename.localeCompare(b.Filename); });
            return api_response_1.ApiResponse.Payload(q);
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    JsFileController.AddJsFile = function (req, res) {
        try {
            var projectName = req.query.projectName;
            var dbSource = req.query.dbSource;
            var jsFileName = req.query.jsFileName;
            if (!jsFileName.toLowerCase().endsWith(".js"))
                jsFileName += ".js";
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
            }
            var ret = cs.addJsFile(jsFileName);
            if (ret.success) {
                settings_instance_1.SettingsInstance.saveSettingsToFile();
                //?!GeneratorThreadDispatcher.SetOutputFilesDirty(cs);
                return api_response_1.ApiResponse.Success();
            }
            else {
                return api_response_1.ApiResponse.ExclamationModal(ret.userError);
            }
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    JsFileController.UpdateJsFile = function (req) {
        try {
            var projectName = req.query.projectName;
            var dbSource = req.query.dbSource;
            var oldName_1 = req.query.oldName;
            var newName_1 = req.query.newName;
            if (!newName_1.toLowerCase().endsWith(".js"))
                newName_1 += ".js";
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
            }
            var existing = cs.JsFiles.find(function (js) { return js.Filename.toLowerCase() == oldName_1.toLowerCase(); });
            if (existing == null) {
                return api_response_1.ApiResponse.ExclamationModal("The output file '" + oldName_1 + "' does not exist in '" + projectName + "/" + dbSource + "'");
            }
            var existingNewName = cs.JsFiles.find(function (js) { return js.Filename.toLowerCase() == newName_1.toLowerCase(); });
            if (existingNewName != null) {
                return api_response_1.ApiResponse.ExclamationModal("The output file '" + newName_1 + "' already exists in '" + projectName + "/" + dbSource + "'");
            }
            existing.Filename = newName_1;
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            //!GeneratorThreadDispatcher.SetOutputFilesDirty(cs);
            return api_response_1.ApiResponse.Success();
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    JsFileController.DeleteJsFile = function (req, res) {
        try {
            var projectName = req.query.projectName;
            var dbSource = req.query.dbSource;
            var jsFilenameGuid_1 = req.params.key;
            var proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal("The project \"" + projectName + "\" does not exist.");
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal("The project '" + projectName + "' does not contain a datasource called '" + dbSource + "'");
            }
            var existing = cs.JsFiles.find(function (js) { return js.Guid.toLowerCase() == jsFilenameGuid_1.toLowerCase(); });
            if (existing == null) {
                return api_response_1.ApiResponse.ExclamationModal("The output file '" + jsFilenameGuid_1 + "' does not exist in '" + projectName + "/" + dbSource + "'");
            }
            cs.JsFiles.splice(cs.JsFiles.indexOf(existing));
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            //!GeneratorThreadDispatcher.SetOutputFilesDirty(cs);
            return api_response_1.ApiResponse.Success();
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    };
    return JsFileController;
}());
__decorate([
    decorators_1.route("/api/database/jsFiles"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], JsFileController, "GetJsFiles", null);
__decorate([
    decorators_1.route("/api/database/addJsfile", { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse // TODO: Change from jsFilename to jsFileGuid?
    )
], JsFileController, "AddJsFile", null);
__decorate([
    decorators_1.route("/api/database/updateJsFile", { put: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], JsFileController, "UpdateJsFile", null);
__decorate([
    decorators_1.route("/api/jsfile/:key", { delete: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], JsFileController, "DeleteJsFile", null);
exports.JsFileController = JsFileController;
//# sourceMappingURL=jsfile.js.map