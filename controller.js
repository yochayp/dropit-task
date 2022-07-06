import Api from "./Api.js";
import { config } from "./constants.js";
import Db from "./Db.js";
import { Mutex } from 'async-mutex';

export default class Controller {

    constructor() {
        this.geoApi = new Api(config.API.geoApi);
        this.db = new Db();
        this.mutex = new Mutex(); 
    }

    getDeliveriesForCurrentWeek = () => {
        
        let today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        let nextWeek = new Date();
        nextWeek.setUTCHours(7 * 24, 0, 0, 0);

        return this.getDeliveriesByDate(today, nextWeek);
    }

    getDeliveriesForToday = () => {
        
        let today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        let tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);

        return this.getDeliveriesByDate(today, tomorrow);
    }

    getDeliveriesByDate = (fromDate, toDate) => {
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT d.id, d.user_id, d.timeslot_id, t.startTime, t.endTime FROM deliveries d 
                            INNER JOIN  timeslots t ON d.timeslot_id = t.id 
                            WHERE t.startTime >= ? AND t.startTime < ?`, [fromDate, toDate]).then(res => {
                resolve(res);
            }
            ).catch(err => {
                reject(err)
            })
        })
    }

    resolveAddress = (params) => {
        params.text = params.searchTerm;
        delete params.searchTerm
        return new Promise((resolve, reject) => {
            this.geoApi.get(params).then(res => {
                if (res.data.features.length) {
                    const { street, address_line1, address_line2, country, postcode } = res.data.features[1].properties;
                    const newData = { street, address_line1, address_line2, country, zipcode:postcode };
                    resolve(newData)
                } else {
                    reject("address not found")
                }
            }
            ).catch(err => {
                reject(err.message);
            })

        })
    }

    getTimeslots = (params) => {
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT t.id timeslot_id FROM timeslots t
                            INNER JOIN rl_timeslots_addresses ta ON t.id = ta.timeslot_id
                            INNER JOIN supported_addresses sa ON sa.id = ta.address_id
                            WHERE sa.zipcode IN (?)
                            GROUP BY  t.id`, [params]).then(res => resolve(res)
            ).catch(err => {
                reject(err.message)
            })
        })
    }

    deleteDelivery = (params) => {

        const { id } = params;

        return new Promise(async (resolve, reject) => {
            this.db.query("DELETE FROM deliveries WHERE id = ?", [id])
                .then(result => {
                    if (result.affectedRows) {
                        resolve("delivery deleted");
                    } else {
                        reject("delivery not exist");
                    }
                }).catch(err => {
                    reject(err.message);
                })
        })
    }

    completeDelivery = (params) => {

        const { id } = params;
        const table = "deliveries";

        return new Promise(async (resolve, reject) => {
            const isExist = await this.db.checkIfExist(table, id);
            if (isExist) {
                this.db.query(`UPDATE deliveries SET completed = true WHERE id = ?`, [id]).then(res => {
                    resolve(res.affectedRows);
                }).catch(err => reject(err.message));
            }
        })
    }

    setDelivery = (params) => {
        const { user, timeslotId } = params;

        return new Promise(async (resolve, reject) => {

            try {
                const timeslot = await this.db.query(`SELECT * FROM timeslots WHERE id = ?`, [timeslotId]);

                // check if timeslot exist
                if (timeslot.length) {

                    const release = await this.mutex.acquire() // acquires access to the critical path

                    try {
                        const deliveries = await this.db.query('SELECT * FROM deliveries WHERE timeslot_id = ?', [timeslotId]);
    
                        // check timeslot limit
                        if (deliveries.length < config.CONSTRAINTS.timeslotCapacity) {
    
                            let fromDate = new Date(timeslot[0].startTime);
                            fromDate.setUTCHours(0, 0, 0, 0);
                            let toDate = new Date(timeslot[0].startTime);
                            toDate.setUTCHours(24, 0, 0, 0);
    
                            const deliveriesByDate = await this.getDeliveriesByDate(fromDate, toDate);
    
                            // check business capacity
                            if (deliveriesByDate.length < config.CONSTRAINTS.businessCapacity) {
                                const deliveryRes = await this.db.query(`INSERT INTO deliveries ( user_id, timeslot_id ) VALUES (?,?)`, [user, timeslotId]);
                                release() // completes the work on the critical path
                                resolve(deliveryRes.insertId);
    
                            } else {
                                release() // completes the work on the critical path
                                reject("Reached maximum daily delivery capacity");
                            }
                        } else {
                            release() // completes the work on the critical path
                            reject("Each timeslot can be used for 2 deliveries");
                        }
                    } finally {
                        release() // completes the work on the critical path
                    }
                }
                else {
                    reject("timeslot dosn't exist");
                }

            } catch (error) {
                reject(error.message)
            } 
        })
    }

    initData = async () => {
        return new Promise(async (resolve, reject) => {

            const holidayApi = new Api(config.API.holidayApi);
            const courierApi = new Api(config.API.courierApi);

            try {
                // fetch data from Api's
                const timeSlotes = courierApi.readFile();
                const holidays = holidayApi.get({ "country": 'IL', "year": 2021 })

                const dates = {};

                const promiseRes = await Promise.all([holidays, timeSlotes]);
                const holidayRes = promiseRes[0];
                const timeslotesRes = promiseRes[1];

                holidayRes.data.holidays.map(holiday => {
                    dates[holiday.date] = "";
                });

                // insert all new zipcodes to supported_addresses table
                const zipcodes = new Set();
                timeslotesRes.forEach(timeslot => {
                    timeslot.supportedAddresses.forEach(address => {
                        zipcodes.add(address);
                    })
                })

                const zipcodeArr = Array.from(zipcodes);

                await this.db.query('INSERT INTO supported_addresses ( zipcode ) VALUES ? ON DUPLICATE KEY UPDATE id = id', [zipcodeArr.map(zipcode => [zipcode])]);

                // filter the holiday dates from timeslots 
                let timeSlots = timeslotesRes.filter(timeslot => {
                    const startDate = new Date(Date.parse(timeslot.startTime)).toISOString().slice(0, 10);
                    if (dates[startDate] === undefined)
                        return timeslot;
                })

                // save timeslots to db
                for (let i = 0; i < timeSlots.length; i++) {
                    let timeslot = timeSlots[i];
                    const res = await this.db.query('INSERT INTO timeslots ( startTime, endTime ) VALUES (?,?)', [timeslot.startTime, timeslot.endTime]);
                    const timeslotId = res.insertId;
                    
                    for (let j = 0; j < timeslot.supportedAddresses.length; j++) {
                        const address = timeslot.supportedAddresses[j];
                        const res = await this.db.query('SELECT id FROM supported_addresses WHERE zipcode = ?', [address]);
                        const addressId = res[0].id;
                        await this.db.query('INSERT INTO rl_timeslots_addresses ( timeslot_id, address_id ) values (?,?)', [timeslotId, addressId])
                    }
                  }
            } catch (error) {
                reject(error.message);
            }
            resolve("init succeed")
        })
    }
}

