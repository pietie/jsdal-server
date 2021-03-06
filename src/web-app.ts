import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import * as compression from 'compression';
import * as multer from 'multer';

import * as fs from 'fs';
import * as path from 'path';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

import * as keypair from 'keypair';
import * as jwt from 'jsonwebtoken';

import * as  httpProxy from 'http-proxy';  

let proxy = httpProxy.createProxyServer();


import { SettingsInstance } from './settings/settings-instance'
import { AuthController } from './web-api'
import { UserManagement } from "./util/user-management";

let app = express();

const SERVER_PRIVATE_KEY = keypair().private;

app.use(function (req, res, next) {
    let host:string = <string>req.headers.host;

    if (host && host.startsWith('dal2.'))
    {
        proxy.web(req, res, { target: 'http://dal2.europassistance.co.za:8001' });
        return;
    }
    next();
});

app.use(compression());

// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json 
app.use(bodyParser.json({ strict: false }));

// parse multipart/form-data
let memStorage = multer.memoryStorage();
// TODO: consider warning from docs:   Make sure that you always handle the files that a user uploads. Never add multer as a global middleware since a malicious user could upload files to a route that you didn't anticipate. Only use this function on routes where you are handling the uploaded files.
//!app.use(multer({ storage: memStorage, limits: { fileSize/*bytes*/: 1024*1024 * 10 } }).any()); // TODO: make max file size configurable

app.use('/', express.static('web'));
app.use(cors());

app.use(function (req, res, next) {
    let url: string = req.url.toLowerCase();
    
    if (url.startsWith("/api/") || url.startsWith("/token/")) {
        next();
        return;
    }
    

    res.sendFile(path.resolve("./web/index.html"));
});


let webServerSettings = SettingsInstance.Instance.Settings.WebServer;

if (!webServerSettings) webServerSettings = { HttpServerHostname: "localhost", HttpServerPort: 9086, EnableSSL: false, EnableBasicHttp: true };

if (webServerSettings.EnableBasicHttp) {
    let httpServer = http.createServer(app).listen(
        {
            host: webServerSettings.HttpServerHostname,
            port: webServerSettings.HttpServerPort
        }, () => {
            let host = httpServer.address().address;
            let port = httpServer.address().port;

            console.log(`Web server listening at http://${host}:${port}`);
        }
    );
}

if (webServerSettings.EnableSSL) {

    //key: fs.readFileSync('key.pem'), // TODO: Make file names and locations configurable?
    //cert: fs.readFileSync('cert.pem')
    let httpsServer = https.createServer({
        pfx: <any>fs.readFileSync('cert.pfx'),
        passphrase: fs.readFileSync('certpass.pass', { encoding: 'utf8' }),
        ca: fs.readFileSync('ca.crt', { encoding: 'utf8' })
    }, app).listen({
        host: webServerSettings.HttpsServerHostname,
        port: webServerSettings.HttpsServerPort

    }, () => {
        let host = httpsServer.address().address;
        let port = httpsServer.address().port;

        console.log(`Web server listening at https://${host}:${port}`);
    });

}

// get an instance of the router for api routes
var apiRoutes = express.Router();

// // parse application/x-www-form-urlencoded 
// apiRoutes.use(bodyParser.urlencoded({ extended: false }));

// // parse application/json 
// apiRoutes.use(bodyParser.json({ strict: false }));

// apiRoutes.use(cors());

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', (req, res) => {

    {
        let isValid = UserManagement.validate(req.body.username, req.body.password);

        if (!isValid) {
            res.status(400).json({ success: false, message: 'Authentication failed' });
        } else {

            // check if password matches
            // if (user.password != req.body.password) {
            //     res.status(400).json({ success: false, message: 'Authentication failed' });
            // } else 
            {

                let timeoutInHours = 24;

                let expiresEpoch = new Date().getTime() + (timeoutInHours * 3600000/*convert to ms*/);

                var token = jwt.sign({ name: "Some name" }, SERVER_PRIVATE_KEY, {
                    expiresIn: `${timeoutInHours} hours`
                });

                res.json({
                    token: token,
                    expiresEpoch: expiresEpoch
                });
            }

        }

    }

});

app.use('/token/validate', (req, res, next) => {
    // look for token
    let token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (token) {
        // decode token
        jwt.verify(token, SERVER_PRIVATE_KEY, (err, decoded) => {
            if (err) {
                return res.status(200).send({ valid: false, message: err.toString() });
            } else {
                return res.status(200).send({ valid: true });
            }
        });

    } else {

        // no token present
        return res.status(200).send({
            valid: false,
            message: 'No token provided. (ref1)'
        });

    }

});

function authorise(req): Promise<any> {
    return new Promise<any>((resolve, reject) => {

        // look for token
        let token = req.body.token || req.query.token || req.headers['x-access-token'];

        if (token) {
            // decode token
            jwt.verify(token, SERVER_PRIVATE_KEY, (err, decoded) => {
                if (err) {
                    resolve({ status: 401, ret: { jwtfailed: true, message: err.toString() } });
                } else {
                    // allow next request in the chain
                    resolve({ status: 200 });
                }
            });

        } else {
            // no token present
            resolve({
                status: 403, ret: {
                    success: false,
                    message: 'No token provided. (ref2)'
                }
            });
        }

    });
}


async function processRequest(route, req, res) {

    if (!route.allowAnonymousAccess) {
        let auth = await authorise(req);

        if (auth.status != 200) {
            return res.status(auth.status).send(auth.ret);
        }
    }

    if (route.nocache) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
        res.setHeader("Content-Type", "application/json");
    }

    try {


        let ret = route.target.call(this, req, res);

        // if the ret value is undefined assume the target call already handled the response
        if (ret == undefined) return;

        // look for promise-like result
        if (ret.then && ret.catch) {
            ret.then(result => {
                // if (global.gc) {
                //     global.gc();
                // }

                res.send(result);
            }).catch(e => {
                console.log("ERROR!!! during exec call");
                console.error(e);
            });
        }
        else {
            res.send(ret);
        }
    }
    catch (e) {
        console.error(e);
        res.status(500).send("Error:(");
    }
}

// configure routes picked up from decorators
if (global["WebRoutes"]) {

    for (let i = 0; i < global["WebRoutes"].length; i++) {
        let route: { get?: boolean, post?: boolean, put?: boolean, delete?: boolean, target: Function, path: string } = global["WebRoutes"][i];

        if (route.get) {
            app.get(route.path, function (req, res) { processRequest(route, req, res); });
        }
        if (route.post) {
            app.post(route.path, function (req, res) { processRequest(route, req, res); });
        }
        if (route.put) {
            app.put(route.path, function (req, res) { processRequest(route, req, res); });
        }
        if (route.delete) {
            app.delete(route.path, function (req, res) { processRequest(route, req, res); });
        }
    }

    delete global["WebRoutes"];
}

// need this just to force the @route decorator to run on all other classes..not sure how this works...
let a = new AuthController();