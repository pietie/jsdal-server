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
var api_response_1 = require("./../api-response");
var settings_instance_1 = require("./../../settings/settings-instance");
var decorators_1 = require("./../decorators");
var ProjectController = (function () {
    function ProjectController() {
    }
    ProjectController.Get = function () {
        return api_response_1.ApiResponse.Payload(settings_instance_1.SettingsInstance.Instance.ProjectList.map(function (p) { return { Name: p.Name, NumberOfDatabaseSources: p.DatabaseSources.length }; }));
    };
    ProjectController.AddNew = function (req) {
        var name = req.body;
        var ret = settings_instance_1.SettingsInstance.Instance.AddProject(name);
        if (ret.success) {
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            return api_response_1.ApiResponse.Success();
        }
        else {
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        }
    };
    ProjectController.UpdateProject = function (req) {
        var name = req.params.name;
        var newName = req.body;
        var ret = settings_instance_1.SettingsInstance.Instance.UpdateProject(name, newName);
        if (ret.success) {
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            return api_response_1.ApiResponse.Success();
        }
        else {
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        }
    };
    ProjectController.Delete = function (req) {
        var name = req.body;
        var ret = settings_instance_1.SettingsInstance.Instance.DeleteProject(name);
        if (ret.success) {
            settings_instance_1.SettingsInstance.saveSettingsToFile();
            return api_response_1.ApiResponse.Success();
        }
        else {
            return api_response_1.ApiResponse.ExclamationModal(ret.userError);
        }
    };
    return ProjectController;
}());
__decorate([
    decorators_1.route("/api/project"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", api_response_1.ApiResponse)
], ProjectController, "Get", null);
__decorate([
    decorators_1.route("/api/project", { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], ProjectController, "AddNew", null);
__decorate([
    decorators_1.route("/api/project/:name", { put: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], ProjectController, "UpdateProject", null);
__decorate([
    decorators_1.route("/api/project", { delete: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", api_response_1.ApiResponse)
], ProjectController, "Delete", null);
exports.ProjectController = ProjectController;
