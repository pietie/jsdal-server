import { ApiResponse } from './../api-response'
import { SettingsInstance } from './../../settings/settings-instance'
import { route } from './../decorators'

export class ProjectController {
    @route("/api/project")
    public static Get(): ApiResponse {
        return ApiResponse.Payload(SettingsInstance.Instance.ProjectList.map(p => { return { Name: p.Name, NumberOfDatabaseSources: p.DatabaseSources.length }; }));
    }

    @route("/api/project", { post: true })
    public static AddNew(req): ApiResponse {

        let name:string = req.body;

        let ret = SettingsInstance.Instance.AddProject(name);

        if (ret.success) {
            SettingsInstance.saveSettingsToFile();
            return ApiResponse.Success();
        }
        else {
            return ApiResponse.ExclamationModal(ret.userError);
        }
    }

    @route("/api/project/:name", { put: true })
    public static UpdateProject(req): ApiResponse {

        let name: string = req.params.name;
        let newName = req.body;

        let ret = SettingsInstance.Instance.UpdateProject(name, newName);

        if (ret.success) {
            SettingsInstance.saveSettingsToFile();
            return ApiResponse.Success();
        }
        else {
            return ApiResponse.ExclamationModal(ret.userError);
        }
    }

    @route("/api/project", { delete: true })
    public static Delete(req): ApiResponse {
        let name = req.body;

        let ret = SettingsInstance.Instance.DeleteProject(name);

        if (ret.success) {
            SettingsInstance.saveSettingsToFile();
            return ApiResponse.Success();
        }
        else {
            return ApiResponse.ExclamationModal(ret.userError);
        }
    }
}

