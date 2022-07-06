const config = {
    "NODE_ENVIRONMENT" : {
        "port" : 3000
    },
    "DB" : {
        "host": "localhost",
        "user": "root",
        "password": "",
        "database":"dropit_db"
    },
    "API" : {
        "geoApi": {
            "url" : "https://api.geoapify.com/v1/geocode/search",
            "key" : { "apiKey": "598ebe025e90404ab16b1e411997e2f0" }
        },
        "holidayApi" :{           
            "url":"https://holidayapi.com/v1/holidays?pretty",
            "key" : { "key": "fd0a68fb-51b2-434c-baf8-469cfed59d4e" }
        },
        "courierApi": {
            "url":'./assets/data/timeslotes.json',
            "key":''
        } 
    },
    "CONSTRAINTS":{
        "businessCapacity": 10,
        "timeslotCapacity": 2
    }
  };


  export { config };
