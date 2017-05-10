"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer = require("inquirer");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
class NssmWrapper {
    static installService(serviceName, displayName = "jsDAL server") {
        let cmd = `${NssmWrapper.exePath} install "${serviceName}" "${NssmWrapper.nodePath}" "${NssmWrapper.scriptPath} run"`;
        cmd += `& ${NssmWrapper.exePath} set "${serviceName}" DisplayName "${displayName}"`;
        cmd += `& ${NssmWrapper.exePath} set "${serviceName}" AppDirectory "${__dirname}"`;
        cmd += `& ${NssmWrapper.exePath} set "${serviceName}" Description "Generates JavaScript data-access layer tor MS SQL sprocs."`;
        cmd += `& ${NssmWrapper.exePath} set "${serviceName}" Start SERVICE_AUTO_START`;
        child_process_1.exec(cmd, (err, stdout) => {
            if (err) {
                console.error(err);
                console.log('\r\n\r\n\r\n', cmd);
            }
            else {
                console.log(stdout.toString());
            }
        });
    }
    static uninstallService(serviceName) {
        let cmd = `${NssmWrapper.exePath} remove "${serviceName}" confirm`;
        child_process_1.exec(cmd, (err, stdout) => {
            if (err) {
                console.error(err);
                console.log('\r\n\r\n\r\n', cmd);
            }
            else {
                console.log(stdout.toString());
            }
        });
    }
}
NssmWrapper.exePath = path.resolve('./tools/nssm.exe');
NssmWrapper.nodePath = process.argv[0];
NssmWrapper.scriptPath = process.argv[1];
function overrideStdOutput() {
    var logStream = fs.createWriteStream(process.argv[1] + ".log");
    var errStream = fs.createWriteStream(process.argv[1] + ".err");
    process.__defineGetter__('stdout', function () {
        return logStream;
    });
    process.__defineGetter__('stderr', function () {
        return errStream;
    });
    process.on('uncaughtException', function (err) {
        console.error((err && err.stack) ? err.stack : err);
    });
    console.info("Setting up....", new Date());
}
function mainManualStartup() {
    return __awaiter(this, void 0, void 0, function* () {
        // look for existing jsdal-like services (based on name)
        let enumServices = new Promise((resolve, reject) => {
            child_process_1.exec("sc query state= all", (err, stdout) => {
                var lines = stdout.toString().split("\r\n").filter(function (line) {
                    return line.indexOf("SERVICE_NAME") !== -1;
                }).map((line) => {
                    return line.replace("SERVICE_NAME: ", "").toLowerCase(); // TODO: not sure if service names are case-sensitve so we may need to remove the toLower later
                }).filter(name => name.indexOf("jsdal") >= 0);
                resolve(lines);
            });
        });
        let existingServices = yield enumServices;
        let initialChoices = ['Run', 'Install', 'Uninstall'];
        if (existingServices.length > 0)
            initialChoices.push('Uninstall (choose)');
        let questions = [
            {
                type: 'list',
                name: 'startMode',
                message: 'What do you want to do?',
                choices: initialChoices,
                filter: (val) => val.toLowerCase()
            },
            {
                type: 'input',
                name: 'serviceName',
                message: 'Window service name?',
                default: 'jsdal-server-prod',
                validate: (val) => { if (val && val.trim().length > 0)
                    return true; return "Please provide value."; },
                when: (answers) => {
                    return answers.startMode == "install" || answers.startMode == "uninstall";
                }
            },
            {
                type: 'input',
                name: 'serviceDisplayName',
                message: 'Window service DISPLAY name?',
                default: 'jsDAL Server (PROD)',
                validate: (val) => { if (val && val.trim().length > 0)
                    return true; return "Please provide value."; },
                when: (answers) => {
                    return answers.startMode == "install";
                }
            },
            {
                type: 'list',
                name: 'serviceName',
                message: 'Window service name?',
                choices: existingServices,
                when: answers => answers.startMode == 'uninstall (choose)'
            }
        ];
        inquirer.prompt(questions).then(function (answers) {
            CmdExecutor.process(answers.startMode, answers.serviceName, answers.serviceDisplayName);
        });
    });
}
class CmdExecutor {
    static run() {
        console.info("\r\nStarting application...");
        require('./app');
    }
    static install(serviceName, displayName) {
        NssmWrapper.installService(serviceName, displayName);
    }
    static uninstall(serviceName) {
        NssmWrapper.uninstallService(serviceName);
    }
    static process(cmdName, ...args) {
        cmdName = cmdName.toLowerCase();
        if (cmdName == "run") {
            CmdExecutor.run();
        }
        else if (cmdName == "install") {
            CmdExecutor.install(args[0], args[1]);
        }
        else if (cmdName == "uninstall" || cmdName == "uninstall (choose)") {
            CmdExecutor.uninstall(args[0]);
        }
        else {
            throw new Error("Unsupported command: " + cmdName);
        }
    }
}
let args = process.argv;
let availableStartupCmds = ["run", "install", "uninstall", "uninstall (choose)"];
if (!args || args.length <= 2 || availableStartupCmds.indexOf(args[2].toLowerCase()) == -1) {
    mainManualStartup();
}
else {
    overrideStdOutput();
    CmdExecutor.process(args[2], args[3]);
}
//# sourceMappingURL=start.js.map