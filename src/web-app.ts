import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import * as compression from 'compression';
import * as fs from 'fs';
import * as path from 'path';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

import * as keypair from 'keypair';
import * as jwt from 'jsonwebtoken';

import { SettingsInstance } from './settings/settings-instance'
import { AuthController } from './web-api'

let app = express();

const SERVER_PRIVATE_KEY = keypair().private;

app.use(compression());

// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json 
app.use(bodyParser.json({ strict: false }));

app.use('/', express.static('web'));
app.use(cors());

app.use(function (req, res, next) {
    let url:string = req.url.toLowerCase();

    if (url.startsWith("/api/") || url.startsWith("/token/")) {
        next();
        return;
    }
    
    res.sendFile( path.resolve("./web/index.html"));
});


let webServerSettings = SettingsInstance.Instance.Settings.WebServer;

if (!webServerSettings) webServerSettings = { HttpServerHostname: "localhost", HttpServerPort: 9086, EnableSSL: false };

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

if (webServerSettings.EnableSSL) {
    let httpsServer = https.createServer({
        key: fs.readFileSync('key.pem'), // TODO: Make file names and locations configurable?
        cert: fs.readFileSync('cert.pem')
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
    console.log("body", req.body);

    {

        //        if (err) throw err;

        // TODO: Auth users here from some DB or config
        let availableUsers = [{ name: "test", password: "abc123" }];

        //let user = { name: "test", password: "abc123" };

        let user = availableUsers.find(a => a.name === req.body.username);

        if (!user) {
            res.status(400).json({ success: false, message: 'Authentication failed' });
        } else if (user) {

            // check if password matches
            if (user.password != req.body.password) {
                res.status(400).json({ success: false, message: 'Authentication failed' });
            } else {

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

    let ret = route.target.call(this, req, res);

    // if the ret value is undefined assume the target call already handled the response
    if (ret == undefined) return;

    // look for promise-like result
    if (ret.then && ret.catch) {
        ret.then(function (result) { res.send(result); });
    }
    else {
        res.send(ret);
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