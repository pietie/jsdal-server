"use strict";
var base_rule_1 = require("./base-rule");
var JsFile = (function () {
    function JsFile() {
        this.Rules = [];
    }
    JsFile.createFromJson = function (rawJson) {
        var jsfile = new JsFile();
        jsfile.Filename = rawJson.Filename;
        jsfile.Guid = rawJson.Guid;
        jsfile.Version = rawJson.Version;
        for (var i = 0; i < rawJson.Rules; i++) {
            jsfile.Rules.push(base_rule_1.BaseRule.createFromJson(rawJson.Rules[i]));
        }
        return jsfile;
    };
    return JsFile;
}());
exports.JsFile = JsFile;
