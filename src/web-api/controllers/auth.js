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
var express = require("express");
var decorators_1 = require("./../decorators");
var AuthController = (function () {
    function AuthController() {
    }
    AuthController.authLogin = function (req) {
        var username = req.body.username;
        var password = req.body.password;
        console.log("Username:", username);
        return { todo: 123 };
    };
    return AuthController;
}());
__decorate([
    decorators_1.route('/api/auth', { post: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController, "authLogin", null);
exports.AuthController = AuthController;
//# sourceMappingURL=auth.js.map