"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
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
var log_1 = require("./../util/log");
var thread_util_1 = require("./../util/thread-util");
var settings_instance_1 = require("./../settings/settings-instance");
var cached_routine_1 = require("./../settings/object-model/cache/cached-routine");
var routine_parameter_1 = require("./../settings/object-model/cache/routine-parameter");
var orm_dal_1 = require("../database/orm-dal");
var async = require("async");
var sql = require("mssql");
var xml2js = require("xml2js");
var WorkSpawner = (function () {
    function WorkSpawner() {
    }
    WorkSpawner.Start = function () {
        try {
            var dbSources = settings_instance_1.SettingsInstance.Instance.ProjectList.map(function (p) { return p.DatabaseSources; }).reduce(function (prev, next) { return prev.concat(next); });
            WorkSpawner._workerList = [];
            dbSources = [dbSources[0]]; //TEMP 
            async.each(dbSources, function (source) {
                var worker = new Worker();
                console.log("Spawning new worker for " + source.Name);
                WorkSpawner._workerList.push(worker);
                worker.run(source);
            }, function (error) {
                log_1.SessionLog.error(error.toString());
            });
        }
        catch (e) {
            log_1.SessionLog.exception(e);
            console.error(e);
        }
    };
    return WorkSpawner;
}());
exports.WorkSpawner = WorkSpawner;
var Worker = (function () {
    function Worker() {
        this.isRunning = false;
        this.maxRowDate = 4743824;
    }
    Object.defineProperty(Worker.prototype, "status", {
        get: function () { return this._status; },
        set: function (val) { this._status = val; },
        enumerable: true,
        configurable: true
    });
    Worker.prototype.stop = function () {
        this.isRunning = false;
    };
    Worker.prototype.run = function (dbSource) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var lastSavedDate, sqlConfig, _loop_1, this_1, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.isRunning = true;
                        lastSavedDate = new Date();
                        sqlConfig = {
                            user: dbSource.userID,
                            password: dbSource.password,
                            server: dbSource.dataSource,
                            database: dbSource.initialCatalog,
                            stream: false,
                            options: {
                                encrypt: true
                            }
                        };
                        _loop_1 = function () {
                            var con, routineCount_1, curRow_1, e_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!dbSource.IsOrmInstalled) {
                                            // try again in 2 seconds
                                            this_1.status = "Waiting for ORM to be installed.";
                                            setTimeout(function () { return _this.run(dbSource); }, 2000);
                                            return [2 /*return*/, { value: void 0 }];
                                        }
                                        return [4 /*yield*/, new sql.Connection(sqlConfig).connect().catch(function (err) {
                                                // TODO: Handle connection error
                                                log_1.SessionLog.error(err.toString());
                                                console.log("connection error", err);
                                            })];
                                    case 1:
                                        con = _a.sent();
                                        _a.label = 2;
                                    case 2:
                                        _a.trys.push([2, 6, , 7]);
                                        return [4 /*yield*/, orm_dal_1.OrmDAL.SprocGenGetRoutineListCnt(con, this_1.maxRowDate)];
                                    case 3:
                                        routineCount_1 = _a.sent();
                                        curRow_1 = 0;
                                        if (!(routineCount_1 > 0))
                                            return [3 /*break*/, 5];
                                        log_1.SessionLog.info("(" + process.pid + ")\t" + dbSource.Name + "\t" + routineCount_1 + " change(s) found using row date " + this_1.maxRowDate);
                                        this_1.status = routineCount_1 + " change(s) found using rowdate " + this_1.maxRowDate;
                                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                                var genGetRoutineListStream = orm_dal_1.OrmDAL.SprocGenGetRoutineListStream(con, _this.maxRowDate);
                                                genGetRoutineListStream.on('row', function (row) { return __awaiter(_this, void 0, void 0, function () {
                                                    var newCachedRoutine, perc, resultSets, e_2;
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0:
                                                                newCachedRoutine = new cached_routine_1.CachedRoutine();
                                                                newCachedRoutine.Routine = row.RoutineName;
                                                                newCachedRoutine.Schema = row.SchemaName;
                                                                newCachedRoutine.Type = row.RoutineType;
                                                                newCachedRoutine.IsDeleted = row.IsDeleted;
                                                                newCachedRoutine.Parameters = [];
                                                                newCachedRoutine.RowVer = row.rowver;
                                                                newCachedRoutine.ResultSetRowver = row.ResultSetRowver;
                                                                newCachedRoutine.RoutineParsingRowver = row.RoutineParsingRowver;
                                                                if (row.JsonMetadata && row.JsonMetadata != "") {
                                                                    try {
                                                                        newCachedRoutine.jsDALMetadata = JSON.parse(row.JsonMetadata);
                                                                    }
                                                                    catch (ex) {
                                                                        newCachedRoutine.jsDALMetadata = { error: ex };
                                                                    }
                                                                }
                                                                // convert ParameterXml to a javscript object
                                                                xml2js.parseString(row.ParametersXml, function (err, result) {
                                                                    if (!err && result && result.Routine && result.Routine.Parameter) {
                                                                        for (var e in result.Routine.Parameter) {
                                                                            var newParm = routine_parameter_1.RoutineParameter.createFromJson(result.Routine.Parameter[e]);
                                                                            newCachedRoutine.Parameters.push(newParm);
                                                                        }
                                                                    }
                                                                });
                                                                curRow_1++;
                                                                perc = (curRow_1 / routineCount_1) * 100.0;
                                                                this.status = dbSource.Name + " - Overall progress: (" + perc.toFixed(2) + "%. Currently processing [" + row.SchemaName + "].[" + row.RoutineName + "]"; //, schema, name, perc);
                                                                console.log(this.status);
                                                                if (!!newCachedRoutine.IsDeleted)
                                                                    return [3 /*break*/, 4];
                                                                if (!(newCachedRoutine.ResultSetRowver && newCachedRoutine.ResultSetRowver >= newCachedRoutine.RowVer))
                                                                    return [3 /*break*/, 1];
                                                                console.log("Result set metadata up to date");
                                                                return [3 /*break*/, 4];
                                                            case 1:
                                                                _a.trys.push([1, 3, , 4]);
                                                                return [4 /*yield*/, orm_dal_1.OrmDAL.RoutineGetFmtOnlyResults(con, newCachedRoutine.Schema, newCachedRoutine.Routine, newCachedRoutine.Parameters)];
                                                            case 2:
                                                                resultSets = _a.sent();
                                                                if (resultSets) {
                                                                    newCachedRoutine.ResultSetMetadata = resultSets;
                                                                }
                                                                else {
                                                                    console.log("No res for ", newCachedRoutine.Routine);
                                                                }
                                                                newCachedRoutine.ResultSetRowver = row.rowver;
                                                                newCachedRoutine.ResultSetError = null;
                                                                return [3 /*break*/, 4];
                                                            case 3:
                                                                e_2 = _a.sent();
                                                                // TODO: Loggity log
                                                                newCachedRoutine.ResultSetRowver = row.rowver;
                                                                newCachedRoutine.ResultSetError = e_2.toString();
                                                                return [3 /*break*/, 4];
                                                            case 4:
                                                                dbSource.addToCache(row.rowver, newCachedRoutine);
                                                                // TODO: Make saving gap configurable?
                                                                if (new Date().getTime() - lastSavedDate.getTime() >= 20000 /*ms*/) {
                                                                    lastSavedDate = new Date();
                                                                    dbSource.saveCache();
                                                                }
                                                                console.log("\t" + newCachedRoutine.Routine + " checking max date..." + row.rowver);
                                                                if (!this.maxRowDate || row.rowver > this.maxRowDate) {
                                                                    this.maxRowDate = row.rowver;
                                                                }
                                                                return [2 /*return*/];
                                                        }
                                                    });
                                                }); }); // "on row"
                                                genGetRoutineListStream.on('error', function (err) {
                                                    // May be emitted multiple times
                                                    console.error(err);
                                                    reject(err);
                                                });
                                                genGetRoutineListStream.on('done', function (affected) {
                                                    dbSource.saveCache();
                                                    console.log("..\r\n\tDONE DONE DONE DONE DONE DONE DONE DONE\r\n--", arguments);
                                                    var r = 0;
                                                    dbSource.cache.forEach(function (c) { if (c.RowVer > r)
                                                        r = c.RowVer; });
                                                    if (r != _this.maxRowDate) {
                                                        console.log("\r\n\r\n!!!!!!!!!!!!!!!!!!!!\r\nMaxRowDates dont match!!!\r\n\tr\t" + r + "\r\n\tmax\t" + _this.maxRowDate);
                                                    }
                                                    // we should not call 'resolve' here...the original Get Changes list will return before the actually processing on each of those items are complete :/
                                                    resolve();
                                                });
                                            })];
                                    case 4:
                                        _a.sent(); // await Promise...
                                        _a.label = 5;
                                    case 5: return [3 /*break*/, 7];
                                    case 6:
                                        e_1 = _a.sent();
                                        console.log("or catch here?", e_1.toString());
                                        return [3 /*break*/, 7];
                                    case 7: return [4 /*yield*/, thread_util_1.ThreadUtil.Sleep(settings_instance_1.SettingsInstance.Instance.Settings.DbSource_CheckForChangesInMilliseconds)];
                                    case 8:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 1;
                    case 1:
                        if (!this.isRunning)
                            return [3 /*break*/, 3];
                        return [5 /*yield**/, _loop_1()];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return Worker;
}());
