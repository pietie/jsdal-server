import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

import * as keypair from 'keypair';
import * as jwt from 'jsonwebtoken';

import { AuthController } from './web-api'

let app = express();

const SERVER_PRIVATE_KEY = keypair().private;

// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json 
app.use(bodyParser.json({ strict: false }));

app.use('/', express.static('web'));

app.use(cors());

var server = app.listen(9086, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log(`Web server listening at http://${host}:${port}`);

});


// get an instance of the router for api routes
var apiRoutes = express.Router();

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', (req, res) => {
    console.log("body", req.body);

    // TODO: find user

    // find the user
    //User.findOne({
    //name: req.body.name
    //}, (err, user) => 

    {

        //        if (err) throw err;

        // TODO: Auth users here from some DB or config
        let user = { name: "test", password: "abc123" };


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
                    expiresIn:`${timeoutInHours} hours`
                });

                res.json({
                    token: token,
                    expiresEpoch: expiresEpoch
                });
            }

        }

    }

});

app.use('/token/validate', (req, res, next)=>
{
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
            message: 'No token provided.'
        });

    }

});

// validate JWT 
apiRoutes.use((req, res, next) => {

    // look for token
    let token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (token) {
        // decode token
        jwt.verify(token, SERVER_PRIVATE_KEY, (err, decoded) => {
            if (err) {
              
                return res.status(401).send({ jwtfailed: true, message: err.toString() });

            } else {
                // allow next request in the chain
                next();
            }
        });

    } else {

        // no token present
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });

    }
});


//console.log("ROUTES TO CONFIGURE!!!", global["WebRoutes"]);

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
    
    //console.log("\r\n\r\nROUTES ROUTES ROUTES\r\n", global["WebRoutes"]);

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

