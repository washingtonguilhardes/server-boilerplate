import mongoose from "mongoose";
mongoose.Promise = Promise;
const Settings = require("./../../../Settings");
const Database = {
    connection: null,
    
    /**
    * Start a new database connection
    * using a settings form Settings
    * @return {Promise<any>}
    */
    async init() {
        try{
            if (this.connection) {
                return connection;
            }
            this.connection = mongoose.createConnection(Settings.getDatabaseSettings(), {useMongoClient: true, promiseLibrary: global.Promise});
            connection.on("error", e => console.error("[FAIL] DATABASE CONNECTION ERROR \n ", e));
            this.connection.once("open", () =>  console.log(`[ OK ] DATABASE CONNECTION OPEN WITH SUCCESS`));
            return this.connection;
        }catch(e){
            console.error("[FAIL] DATABASE CONNECTION ERROR \n ", e);
        }
    },
    
    /**
    * Close aplication database connection.
    * @param {Function} cb call whem conneciton is closed
    */
    close(cb) {
        connection.close(cb || console.log);
    }
};

export {
    DatabaseManager,
    Database
}

export default Database;