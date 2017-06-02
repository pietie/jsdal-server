"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const exception_logger_1 = require("./../util/exception-logger");
class UserManagement {
    static get adminUserExists() {
        if (!UserManagement.users)
            return false;
        return UserManagement.users.find(u => u.isAdmin) != null;
    }
    static addUser(user) {
        // TODO: Validate values. Check for existing users..blah blah
        if (UserManagement.users == null)
            UserManagement.users = [];
        UserManagement.users.push(user);
    }
    static loadUsersFromFile() {
        try {
            UserManagement.users = [];
            if (!fs.existsSync(UserManagement.UserFilename))
                return;
            let content = fs.readFileSync(UserManagement.UserFilename, "utf8");
            let users = JSON.parse(content);
            UserManagement.users = users;
        }
        catch (e) {
            exception_logger_1.ExceptionLogger.logException(e);
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
    static validate(username, password) {
        return UserManagement.users.find(u => u.username === username && u.password == password) != null;
    }
}
UserManagement.UserFilename = "users.json";
exports.UserManagement = UserManagement;
class jsDALServerUser {
}
exports.jsDALServerUser = jsDALServerUser;
//# sourceMappingURL=user-management.js.map