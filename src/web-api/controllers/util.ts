import { ApiResponse } from './../api-response'
import { SettingsInstance } from './../../settings/settings-instance'
import { route } from './../decorators'

import * as sql from 'mssql';

export class UtilController {


    @route("/api/util/listdbs")
    public static async ListDBs(req): Promise<ApiResponse> {

        return new Promise<ApiResponse>(async (resolve, reject) => {

            try {

                let dataSource: string = req.query.datasource;
                let user: string = req.query.u;
                let pass: string = req.query.p;
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
                let sqlConfig: sql.config = {
                    user: user,
                    password: pass,
                    server: dataSource,
                    database: null,
                    stream: false, // You can enable streaming globally
                    options: {
                        encrypt: true
                    }
                };

                let con: sql.ConnectionPool = <sql.ConnectionPool>await new sql.ConnectionPool(sqlConfig).connect().catch(err => { reject(err); });
                let request = new sql.Request(con);

                let ret: any = await request.query("select Name from sys.databases order by 1").catch(e => reject(e));

                con.close();

                resolve(ApiResponse.Payload(ret.map(r => r.Name)));
            }
            catch (e) {
                reject(e);
            }

        });
    }

    @route("/api/util/testconnection")
    public static async TestConnection(req, res): Promise<ApiResponse> {
        return new Promise<ApiResponse>(async (resolve, reject) => {
            try {
                let dataSource: string = req.query.dataSource;
                let catalog: string = req.query.catalog;
                let username: string = req.query.username;
                let password: string = req.query.password;


                // TODO: Figure out how to do INTEGRATED AUTH with this driver
                //         if (!string.IsNullOrWhiteSpace(username)) {
                //             connStr = string.Format("Data Source={0};Persist Security Info=False;User ID={1};Password={2}; Initial Catalog={3}", dataSource, username, password, catalog);
                //         }
                //         else {
                //             connStr = string.Format("Data Source={0};Persist Security Info=False;Initial Catalog={1};Integrated Security=True", dataSource, catalog);
                //         }


                let sqlConfig: sql.config = {
                    user: username,
                    password: password,
                    server: dataSource,
                    database: catalog,
                    stream: false, // You can enable streaming globally
                    options: {
                        encrypt: true
                    }
                };

                let con: sql.ConnectionPool = <sql.ConnectionPool>await new sql.ConnectionPool(sqlConfig).connect().catch(err => { resolve(ApiResponse.Exception(err)); });
                
                con.close();

                resolve(ApiResponse.Success());

                // catch(SqlException se) {
                //     if (se.Number == 18456) {
                //         return ApiResponse.ExclamationModal("Login failed. Please check your username and password.");
                //     }

                //     return ApiResponse.Exception(se);
            }
            catch (ex) {
                return resolve(ApiResponse.Exception(ex));
            }

        });

    }


}

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