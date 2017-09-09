const Promise = require('es6-promise').Promise;
const mongoose = require("mongoose");
mongoose.Promise = Promise;
const settings = require('./../../settings.json');
const env =process.env.NODE_ENV || "development";
const databaseAddr = settings[env].mongouri + settings.dbName;
/**
 *
 *
 * @return {Promise}
 */
module.exports = function () {
    return new Promise((resolve, reject) => {
        console.log("OPENING DATABASE CONNECTION");
        mongoose.connect(databaseAddr);
        const connection = mongoose.connection;
        connection.on('error', reject);
        connection.once('open', () => {
            console.log("DATABASE CONNECTION OPEN WITH SUCCESS");
            resolve(connection)
        });
    });
};