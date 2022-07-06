import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import Router from "./Router.js";
import { config } from "./constants.js";

export default class Server {
    
    constructor(){
        this.port = config.NODE_ENVIRONMENT.port;
        this.app = express();
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: false }));        
        this.app.use(cors())
        this.router = new Router(this.app); 
        this.app.listen(this.port,()=>{
            console.log('server is running on port '+this.port);
        });
    }
}




