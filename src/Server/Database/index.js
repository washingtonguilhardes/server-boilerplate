import mongoose from "mongoose";
import Settings from "./../../../Settings";
import DatabaseManager from "./DatabaseManager";


mongoose.Promise = Promise;

const Database = {
    connection: null,

    /**
     * Start a new database connection
     * using a settings form Settings
     * @return {Promise<any>}
     */
    async init() {
        try {
            if (this.connection) {
                return connection;
            }
            this.connection = mongoose.createConnection(Settings.getDatabaseSettings(), {
                promiseLibrary: global.Promise
            });
            this.connection.on("error", e => {
                console.error("[FAIL] DATABASE CONNECTION ERROR \n ", e);
                process.exit(1);
            });
            this.connection.once("open", () => console.log(`[ OK ] DATABASE CONNECTION OPEN WITH SUCCESS`));
            return this.connection;
        } catch (e) {
            console.error("[FAIL] DATABASE CONNECTION ERROR \n ", e);
        }
    },

    /**
     * Close aplication database connection.
     * @param {Function} cb call whem conneciton is closed
     */
    close(cb) {
        this.connection.close(cb || console.log);
    }
};

export {
    DatabaseManager,
    Database
}

export default Database;