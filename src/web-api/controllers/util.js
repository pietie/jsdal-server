"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_response_1 = require("./../api-response");
const decorators_1 = require("./../decorators");
const sql = require("mssql");
class UtilController {
    static ListDBs(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let dataSource = req.query.datasource;
                    let user = req.query.u;
                    let pass = req.query.p;
                    // TODO: Figure out how to do INTEGRATED AUTH with this driver
                    /*****
                     *
                     *
                                    if (!string.IsNullOrWhiteSpace(user)) {
                                        connStr = string.Format("Data Source={0};Persist Security Info=False;User ID={1};Password={2};", dataSource, user, pass);
                                    }
                                    else {
                                        connStr = string.Format("Data Source={0};Persist Security Info=False;Integrated Security=True", dataSource);
                                    }
                     */
                    let sqlConfig = {
                        user: user,
                        password: pass,
                        server: dataSource,
                        database: null,
                        stream: false,
                        options: {
                            encrypt: true
                        }
                    };
                    let con = yield new sql.ConnectionPool(sqlConfig).connect().catch(err => { reject(err); });
                    let request = new sql.Request(con);
                    let ret = yield request.query("select Name from sys.databases order by 1").catch(e => reject(e));
                    con.close();
                    resolve(api_response_1.ApiResponse.Payload(ret.map(r => r.Name)));
                }
                catch (e) {
                    reject(e);
                }
            }));
        });
    }
    static TestConnection(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let dataSource = req.query.dataSource;
                    let catalog = req.query.catalog;
                    let username = req.query.username;
                    let password = req.query.password;
                    // TODO: Figure out how to do INTEGRATED AUTH with this driver
                    //         if (!string.IsNullOrWhiteSpace(username)) {
                    //             connStr = string.Format("Data Source={0};Persist Security Info=False;User ID={1};Password={2}; Initial Catalog={3}", dataSource, username, password, catalog);
                    //         }
                    //         else {
                    //             connStr = string.Format("Data Source={0};Persist Security Info=False;Initial Catalog={1};Integrated Security=True", dataSource, catalog);
                    //         }
                    let sqlConfig = {
                        user: username,
                        password: password,
                        server: dataSource,
                        database: catalog,
                        stream: false,
                        options: {
                            encrypt: true
                        }
                    };
                    let con = yield new sql.ConnectionPool(sqlConfig).connect().catch(err => { resolve(api_response_1.ApiResponse.Exception(err)); });
                    con.close();
                    resolve(api_response_1.ApiResponse.Success());
                    // catch(SqlException se) {
                    //     if (se.Number == 18456) {
                    //         return ApiResponse.ExclamationModal("Login failed. Please check your username and password.");
                    //     }
                    //     return ApiResponse.Exception(se);
                }
                catch (ex) {
                    return resolve(api_response_1.ApiResponse.Exception(ex));
                }
            }));
        });
    }
}
__decorate([
    decorators_1.route("/api/util/listdbs"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UtilController, "ListDBs", null);
__decorate([
    decorators_1.route("/api/util/testconnection"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UtilController, "TestConnection", null);
exports.UtilController = UtilController;
/*
 public class UtilController : ApiController
    {
         

     
        [AllowAnonymous]
        [HttpGet]
        [Route("api/util/clientip")]
        [NoCache]
        public string GetClientIP()
        {
            return Request.GetOwinContext()?.Request?.RemoteIpAddress;
        }

    }

    */ 
//# sourceMappingURL=util.js.map