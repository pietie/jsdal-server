import { Project } from './project'

export class JsDalServerConfig {
    public Settings: Settings;
    public ProjectList: Project[];

    constructor() {
        this.ProjectList = [];
    }

    public static createFromJson(rawJson: any): JsDalServerConfig {
        if (!rawJson || typeof (rawJson.ProjectList) === undefined) return null;

        let config = new JsDalServerConfig();

        config.Settings = Settings.createFromJson(rawJson.Settings);

        for (var e in rawJson.ProjectList) {
            config.ProjectList.push(Project.createFromJson(rawJson.ProjectList[e]));
        }

        return config;

    }

    private exists(projectName: string): boolean {
        if (!this.ProjectList) return false;

        let existing = this.ProjectList.filter(p => p.Name.toLowerCase() == projectName.toLowerCase());

        return (existing && existing.length > 0);
    }

    public getProject(name:string) : Project
    {
        if (!name) return null;

        let existing = this.ProjectList.filter(p => p.Name.toLowerCase() == name.toLowerCase());
        if (!existing || existing.length == 0) return null;
        return existing[0];
    }

    public AddProject(name: string): { success: boolean, userError?: string } {

        if (this.ProjectList == null) this.ProjectList = [];

        if (this.exists(name)) {
            return { success: false, userError: `A project with the name "${name}" already exists.` };
        }

        let proj = new Project();
        proj.Name = name;
        this.ProjectList.push(proj);

        return { success: true };
    }


    public UpdateProject(currentName: string, newName: string): { success: boolean, userError?: string } {

        if (this.ProjectList == null) this.ProjectList = [];

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

    public DeleteProject(name: string): { success: boolean, userError?: string } {
        if (this.ProjectList == null) this.ProjectList = [];

        if (!this.exists(name)) {
            return { success: false, userError: `The project "${name}" does not exist.` };
        }

        let existing = this.ProjectList.filter(p => p.Name.toLowerCase() == name.toLowerCase())[0];

        this.ProjectList.splice(this.ProjectList.indexOf(existing), 1);

        return { success: true };
    }

}


// TODO: move to another file
export class Settings {

    public DbSource_CheckForChangesInMilliseconds: number = 200;

    public static createFromJson(rawJson: any): Settings {
        if (!rawJson || typeof (rawJson.ProjectList) === undefined) return null;
        let settings = new Settings();

        settings.DbSource_CheckForChangesInMilliseconds = rawJson.DbSource_CheckForChangesInMilliseconds;

        return settings;
    }
}
