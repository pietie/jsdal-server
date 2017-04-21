import { ApiResponse } from './../api-response'
import { SettingsInstance } from './../../settings/settings-instance'
import { route } from './../decorators'


export class JsFileController {

    @route("/api/database/jsFiles")
    public static GetJsFiles(req, res): ApiResponse {
        try {
            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSource;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) {
                return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);
            }

            var cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            let q = cs.JsFiles.map(j => { return { Filename: j.Filename, Guid: j.Guid } }).sort((a, b) => a.Filename.localeCompare(b.Filename));

            return ApiResponse.Payload(q);
        }
        catch (ex) {
            return ApiResponse.Exception(ex);
        }

    }


    @route("/api/database/addJsfile", { post: true })
    public static AddJsFile(req, res): ApiResponse // TODO: Change from jsFilename to jsFileGuid?
    {
        try {
            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSource;
            let jsFileName: string = req.query.jsFileName;

            if (!jsFileName.toLowerCase().endsWith(".js")) jsFileName += ".js";

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            let ret = cs.addJsFile(jsFileName);

            if (ret.success) {
                SettingsInstance.saveSettingsToFile();
                //?!GeneratorThreadDispatcher.SetOutputFilesDirty(cs);
                return ApiResponse.Success();
            }
            else {
                return ApiResponse.ExclamationModal(ret.userError);
            }
        }
        catch (ex) {
            return ApiResponse.Exception(ex);

        }

    }


    @route("/api/database/updateJsFile", { put: true })
    public static UpdateJsFile(req): ApiResponse {
        try {

            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSource;
            let oldName: string = req.query.oldName;
            let newName: string = req.query.newName;

            if (!newName.toLowerCase().endsWith(".js")) newName += ".js";

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            let existing = cs.JsFiles.find(js => js.Filename.toLowerCase() == oldName.toLowerCase());

            if (existing == null) {
                return ApiResponse.ExclamationModal(`The output file '${oldName}' does not exist in '${projectName}/${dbSource}'`);
            }

            let existingNewName = cs.JsFiles.find(js => js.Filename.toLowerCase() == newName.toLowerCase());

            if (existingNewName != null) {
                return ApiResponse.ExclamationModal(`The output file '${newName}' already exists in '${projectName}/${dbSource}'`);
            }

            existing.Filename = newName;
            SettingsInstance.saveSettingsToFile();

            //!GeneratorThreadDispatcher.SetOutputFilesDirty(cs);

            return ApiResponse.Success();
        }
        catch (ex) {
            return ApiResponse.Exception(ex);

        }
    }

    @route("/api/jsfile/:key", { delete: true })
    public static DeleteJsFile(req, res): ApiResponse {
        try {

            let projectName: string = req.query.projectName;
            let dbSource: string = req.query.dbSource;

            let jsFilenameGuid: string = req.params.key;

            let proj = SettingsInstance.Instance.getProject(projectName);

            if (!proj) return ApiResponse.ExclamationModal(`The project "${projectName}" does not exist.`);

            var cs = proj.getDatabaseSource(dbSource);

            if (cs == null) {
                return ApiResponse.ExclamationModal(`The project '${projectName}' does not contain a datasource called '${dbSource}'`);
            }

            let existing = cs.JsFiles.find(js => js.Guid.toLowerCase() == jsFilenameGuid.toLowerCase());

            if (existing == null) {
                return ApiResponse.ExclamationModal(`The output file '${jsFilenameGuid}' does not exist in '${projectName}/${dbSource}'`);
            }

            cs.JsFiles.splice(cs.JsFiles.indexOf(existing));

            SettingsInstance.saveSettingsToFile();

            //!GeneratorThreadDispatcher.SetOutputFilesDirty(cs);

            return ApiResponse.Success();
        }
        catch (ex) {
            return ApiResponse.Exception(ex);

        }
    }

}

