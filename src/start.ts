import * as inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';



class NssmWrapper {
    private static exePath: string = path.resolve('./tools/nssm.exe');
    private static nodePath: string = process.argv[0];
    private static scriptPath: string = process.argv[1];

    static installService(serviceName: string, displayName: string = "jsDAL server") {
        let cmd: string = `${NssmWrapper.exePath} install "${serviceName}" "${NssmWrapper.nodePath}" "${NssmWrapper.scriptPath} run"`;

        cmd += `& ${NssmWrapper.exePath} set "${serviceName}" DisplayName "${displayName}"`;
        cmd += `& ${NssmWrapper.exePath} set "${serviceName}" AppDirectory "${__dirname}"`;
        cmd += `& ${NssmWrapper.exePath} set "${serviceName}" Description "Generates JavaScript data-access layer tor MS SQL sprocs."`;
        cmd += `& ${NssmWrapper.exePath} set "${serviceName}" Start SERVICE_AUTO_START`;

        exec(cmd,
            (err, stdout) => {
                if (err) {
                    console.error(err);
                    console.log('\r\n\r\n\r\n', cmd)
                }
                else {
                    console.log(stdout.toString());
                }
            });

    }

     static uninstallService(serviceName: string) {
        let cmd: string = `${NssmWrapper.exePath} remove "${serviceName}" confirm`;

        exec(cmd,
            (err, stdout) => {
                if (err) {
                    console.error(err);
                    console.log('\r\n\r\n\r\n', cmd)
                }
                else {
                    console.log(stdout.toString());
                }
            });

    }

}


function overrideStdOutput() {
    var logStream = fs.createWriteStream(process.argv[1] + ".log");
    var errStream = fs.createWriteStream(process.argv[1] + ".err");

    (<any>process).__defineGetter__('stdout', function () {
        return logStream;
    });
    (<any>process).__defineGetter__('stderr', function () {
        return errStream;
    });

    process.on('uncaughtException', function (err) {
        console.error((err && err.stack) ? err.stack : err);
    });

    console.info("Setting up....", new Date());
}

async function mainManualStartup() {
    // look for existing jsdal-like services (based on name)
    let enumServices: Promise<string[]> = new Promise<string[]>((resolve, reject) => {

        exec("sc query state= all", (err, stdout) => {
            var lines = stdout.toString().split("\r\n").filter(function (line) {
                return line.indexOf("SERVICE_NAME") !== -1;
            }).map((line) => {
                return line.replace("SERVICE_NAME: ", "").toLowerCase(); // TODO: not sure if service names are case-sensitve so we may need to remove the toLower later
            }).filter(name => name.indexOf("jsdal") >= 0);

            resolve(lines);

        });
    });

    let existingServices = await enumServices;

    let initialChoices = ['Run', 'Install', 'Uninstall'];

    if (existingServices.length > 0) initialChoices.push('Uninstall (choose)');

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
            validate: (val) => { if (val && val.trim().length > 0) return true; return "Please provide value."; },
            when: (answers) => {
                return answers.startMode == "install" || answers.startMode == "uninstall";
            }
        },
        {
            type: 'input',
            name: 'serviceDisplayName',
            message: 'Window service DISPLAY name?',
            default: 'jsDAL Server (PROD)',
            validate: (val) => { if (val && val.trim().length > 0) return true; return "Please provide value."; },
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

    inquirer.prompt(<any>questions).then(function (answers) {

        CmdExecutor.process(answers.startMode, answers.serviceName, answers.serviceDisplayName);
    });
}

class CmdExecutor {
    public static run() {
        console.info("\r\nStarting application...")
        require('./app');
    }

    public static install(serviceName: string, displayName: string) {
        NssmWrapper.installService(serviceName, displayName);
    }

    public static uninstall(serviceName: string) {
        NssmWrapper.uninstallService(serviceName);
    }

    public static process(cmdName: string, ...args) {
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