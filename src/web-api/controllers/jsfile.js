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
const api_response_1 = require("./../api-response");
const settings_instance_1 = require("./../../settings/settings-instance");
const decorators_1 = require("./../decorators");
class JsFileController {
    static GetJsFiles(req, res) {
        try {
            let projectName = req.query.projectName;
            let dbSource = req.query.dbSource;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj) {
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }
            let q = cs.JsFiles.map(j => { return { Filename: j.Filename, Guid: j.Guid }; }).sort((a, b) => a.Filename.localeCompare(b.Filename));
            return api_response_1.ApiResponse.Payload(q);
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static AddJsFile(req, res) {
        try {
            let projectName = req.query.projectName;
            let dbSource = req.query.dbSource;
            let jsFileName = req.query.jsFileName;
            if (jsFileName == null || jsFileName.trim() == "") {
                return api_response_1.ApiResponse.ExclamationModal("Please provide a valid file name.");
            }
            if (!jsFileName.toLowerCase().endsWith(".js"))
                jsFileName += ".js";
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }
            let ret = cs.addJsFile(jsFileName);
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
    }
    static UpdateJsFile(req) {
        try {
            let projectName = req.query.projectName;
            let dbSource = req.query.dbSource;
            let oldName = req.query.oldName;
            let newName = req.query.newName;
            if (newName == null || newName.trim() == "") {
                return api_response_1.ApiResponse.ExclamationModal("Please provide a valid file name.");
            }
            if (!newName.toLowerCase().endsWith(".js"))
                newName += ".js";
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }
            let existing = cs.JsFiles.find(js => js.Filename.toLowerCase() == oldName.toLowerCase());
            if (existing == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The output file '${oldName}' does not exist in '${projectName}/${dbSource}'`);
            }
            let existingNewName = cs.JsFiles.find(js => js.Filename.toLowerCase() == newName.toLowerCase());
            if (existingNewName != null) {
                return api_response_1.ApiResponse.ExclamationModal(`The output file '${newName}' already exists in '${projectName}/${dbSource}'`);
            }
            existing.Filename = newName;
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            //!GeneratorThreadDispatcher.SetOutputFilesDirty(cs);
            return api_response_1.ApiResponse.Success();
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
    static DeleteJsFile(req, res) {
        try {
            let projectName = req.query.projectName;
            let dbSource = req.query.dbSource;
            let jsFilenameGuid = req.params.key;
            let proj = settings_instance_1.SettingsInstance.Instance.getProject(projectName);
            if (!proj)
                return api_response_1.ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            var cs = proj.getDatabaseSource(dbSource);
            if (cs == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }
            let existing = cs.JsFiles.find(js => js.Guid.toLowerCase() == jsFilenameGuid.toLowerCase());
            if (existing == null) {
                return api_response_1.ApiResponse.ExclamationModal(`The output file '${jsFilenameGuid}' does not exist in '${projectName}/${dbSource}'`);
            }
            cs.JsFiles.splice(cs.JsFiles.indexOf(existing));
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            //!GeneratorThreadDispatcher.SetOutputFilesDirty(cs);
            return api_response_1.ApiResponse.Success();
        }
        catch (ex) {
            return api_response_1.ApiResponse.Exception(ex);
        }
    }
}
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