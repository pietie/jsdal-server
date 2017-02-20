import * as express from 'express';
import * as cors from 'cors'
import * as bodyParser from 'body-parser';

import { AuthController } from './web-api'

let app = express();

// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json 
app.use(bodyParser.json({ strict: false }));

app.use('/', express.static('web'));

app.use(cors());

console.log("ROUTES TO CONFIGURE!!!", global["WebRoutes"]);

function processRequest(route, req, res) {
    let ret = route.target.call(this, req, res);

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

var server = app.listen(9086, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log(`Web server listening at http://${host}:${port}`);

});