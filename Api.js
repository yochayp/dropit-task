import { readFile } from 'fs/promises';
import axios from "axios";

export default class Api{
    constructor(config){
        this.apiUrl = config.url;
        this.apiKey = config.key;
    }

    get(params){
        return new Promise(async ( resolve, reject) => {
            const reqParams = {...this.apiKey,...params}            

            axios.get(this.apiUrl,
                {
                  params: reqParams
                })
              .then(res => {
                resolve(res);
            })
              .catch(err => {
                reject(err)
            })    
        })
    }

   async readFile()  {
        const json = JSON.parse(
            await readFile(
              new URL('./assets/data/timeslots.json', import.meta.url)
            )
          );
        return json;
    }
    
}