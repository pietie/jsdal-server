import * as express from 'express';

import { route } from  './../decorators'
 
export class AuthController {
    @route('/api/auth', { post: true })
    public static authLogin(req:express.Request) {
        
        let username = req.body.username;
        let password = req.body.password;

        console.log("Username:", username);

        return { todo: 123 };
    }
}