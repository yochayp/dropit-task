import mysql  from 'mysql';
import { config } from './constants.js';

export default class Db{
    constructor(){
        this.con = mysql.createConnection({
            host: config.DB.host,
            user:  config.DB.user,
            password:  config.DB.password,
            database:  config.DB.database
          });
    }

    query(query,params){
        return new Promise((resolve,reject) => {
                this.con.query(query, params,  (error, results, fields) => {
                    if (error){
                        reject(error);
                    }
                    resolve(results);
                  });
        })
         
    }

    checkIfExist(table,id){
        return new Promise((resolve, reject) => {
            this.query(`SELECT * FROM ${table} WHERE id = ?`,[id]).then(res => {
                if(res.length) return resolve(true);
                resolve(false);                
            }).catch(err=>
                reject(err)
            )
        })
    }

    timeOut = (delay) => {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, delay * 1000);
        })
    }
}