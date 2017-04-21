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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var api_response_1 = require("./../api-response");
var decorators_1 = require("./../decorators");
var sql = require("mssql");
var UtilController = (function () {
    function UtilController() {
    }
    UtilController.ListDBs = function (req) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var dataSource, user, pass, sqlConfig, con, request, ret, e_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    dataSource = req.query.datasource;
                                    user = req.query.u;
                                    pass = req.query.p;
                                    sqlConfig = {
                                        user: user,
                                        password: pass,
                                        server: dataSource,
                                        database: null,
                                        stream: false,
                                        options: {
                                            encrypt: true
                                        }
                                    };
                                    return [4 /*yield*/, new sql.Connection(sqlConfig).connect().catch(function (err) { reject(err); })];
                                case 1:
                                    con = _a.sent();
                                    request = new sql.Request(con);
                                    return [4 /*yield*/, request.query("select Name from sys.databases order by 1").catch(function (e) { return reject(e); })];
                                case 2:
                                    ret = _a.sent();
                                    con.close();
                                    resolve(api_response_1.ApiResponse.Payload(ret.map(function (r) { return r.Name; })));
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_1 = _a.sent();
                                    reject(e_1);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    UtilController.TestConnection = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var dataSource, catalog, username, password, sqlConfig, con, ex_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    dataSource = req.query.dataSource;
                                    catalog = req.query.catalog;
                                    username = req.query.username;
                                    password = req.query.password;
                                    sqlConfig = {
                                        user: username,
                                        password: password,
                                        server: dataSource,
                                        database: catalog,
                                        stream: false,
                                        options: {
                                            encrypt: true
                                        }
                                    };
                                    return [4 /*yield*/, new sql.Connection(sqlConfig).connect().catch(function (err) { resolve(api_response_1.ApiResponse.Exception(err)); })];
                                case 1:
                                    con = _a.sent();
                                    con.close();
                                    resolve(api_response_1.ApiResponse.Success());
                                    return [3 /*break*/, 3];
                                case 2:
                                    ex_1 = _a.sent();
                                    return [2 /*return*/, resolve(api_response_1.ApiResponse.Exception(ex_1))];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    return UtilController;
}());
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