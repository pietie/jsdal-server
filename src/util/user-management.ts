import * as fs from 'fs';
import { ExceptionLogger } from "./../util/exception-logger";

export class UserManagement {
    private static readonly UserFilename: string = "users.json";

    private static users: jsDALServerUser[];

    static get adminUserExists(): boolean {
        if (!UserManagement.users) return false;
        return UserManagement.users.find(u => u.isAdmin) != null;
    }

    static addUser(user: jsDALServerUser) {
        // TODO: Validate values. Check for existing users..blah blah
        if (UserManagement.users == null) UserManagement.users = [];

        UserManagement.users.push(user);
    }

    static loadUsersFromFile() {
        try {
            UserManagement.users = [];

            if (!fs.existsSync(UserManagement.UserFilename)) return;

            let content = fs.readFileSync(UserManagement.UserFilename, "utf8");

            let users = JSON.parse(content);

            UserManagement.users = users;

        }
        catch (e) {
            ExceptionLogger.logException(e);
        }

    }

    static saveToFile() {
        try {
            var json = JSON.stringify(UserManagement.users);

            fs.writeFileSync(UserManagement.UserFilename, json, { encoding: "utf8" });
        }
        catch (ex) {
            console.error(ex);
            //!SessionLog.Exception(ex);
        }
    }

    static validate(username: string, password:string)
    {
        return UserManagement.users.find(u=>u.username === username && u.password == password) != null;
    }
}

export class jsDALServerUser {
    public username: string;
    public password: string;
    public isAdmin: boolean;
}