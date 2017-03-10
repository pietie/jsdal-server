"use strict";
var edge = require("edge");
var winAuth = edge.func(function () {
    /*
    #r "System.DirectoryServices.dll"

    using System.Collections.Generic;
    using System.DirectoryServices;

    async (input) => {
        IDictionary<string, object> data = (IDictionary<string, object>)input;

        string ldapConnectionString = @"LDAP://172.16.0.8/CN=Users,DC=corp,DC=net";

        string username = (string)data["username"];
        string password = (string)data["password"];

        try {
            using (var de = new DirectoryEntry(ldapConnectionString, username, password, AuthenticationTypes.Secure))
            {
                return de.NativeObject != null;
            }
        } catch  { return false; }
    }
*/ });
/***
winAuth({ username: "plessing", password: "P@ssw0rd" }, (error, result) => {
    if (error) throw error;
    console.log(result);
});
***/ 
//# sourceMappingURL=win-auth.js.map