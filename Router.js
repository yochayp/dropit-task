import Db from "./Db.js";
import Controller from "./controller.js";
import { param, body, validationResult } from 'express-validator';

export default class Router {
    
    constructor(app) {
     this.controller = new Controller();
        this.app = app;
        this.db = new Db();
        this.setRoutes();
    }

    setRoutes = () => {

        this.app.get("/deliveries/daily", (req,res) => {
            this.controller.getDeliveriesForToday().then(result => {
                res.status(200).json(result);
            }).catch(err => {
                res.status(400).send(err);
            })
        })

        this.app.get("/deliveries/weekly", (req,res) => {
            this.controller.getDeliveriesForCurrentWeek().then(result => {
                res.status(200).json(result);
            }).catch(err => {
                res.status(400).send(err);
            })
        })
        
        this.app.post("/resolve-address", 
        body('searchTerm').exists()
        .isString()
        ,(req,res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            this.controller.resolveAddress(req.body).then(result => {
                res.status(200).json(result);
            }).catch(err => {
                res.status(400).send(err);
            })
        });

        this.app.post("/init",(req,res) => {
            this.controller.initData().then(result => {
                res.status(200).json(result);
            }).catch(err => {
                console.log("hereee");
                res.status(400).send(err);
            })
        })

        this.app.post("/timeslots",
        body('address').exists()
        ,(req,res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const supportedAddresses = req.body.address.zipcode;
            console.log(supportedAddresses);
            this.controller.getTimeslots(supportedAddresses).then(result => {
                res.status(200).json(result);
            }).catch(err => {
                res.status(400).send(err);
            })
        })
   
        this.app.post("/deliveries",
        body('user').exists().isNumeric(),
        body('timeslotId').exists().isNumeric()
        ,(req,res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const params = req.body;
            this.controller.setDelivery(params).then(result => {
                res.status(200).json(result);
            }).catch(err => {
                res.status(400).send(err);
            })
        })
        
        this.app.post("/deliveries/:id/:complete",
        param('id').exists().isNumeric(),
        param('complete').exists()
        ,(req,res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const params = req.params;
            this.controller.completeDelivery(params).then(result => {
                res.status(200).json(result);
            }).catch(err => {
                res.status(400).send(err);
            })
        })

        this.app.delete("/deliveries/:id",
        param('id').exists().isNumeric()
        ,(req,res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const params = req.params;
            this.controller.deleteDelivery(params).then(result => {
                res.status(200).json(result);
            }).catch(err => {
                res.status(400).send(err);
            })
        })
    }
}