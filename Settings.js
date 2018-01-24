const _package = require("./package.json");
const STORAGE_NAME = "custom_mya_app_sdk_name";
const settings = {
    production: {
        port: 3102,//  prodution port here
        host: "000.000.000.000",//  prodution host here
        api: "https://api.my-app.com.br", // api entry point here
        app: "https://app.my-app.com.br", // application entry  point here
        mongouri: "",//production uri here
        database: {
            host: "",// database prodution host here
            port: 0,// database prodution port here
            name: "",// database prodution name here
            user: "",// database prodution user here
            password: "" // database prodution pass here
        },
        STORAGE_NAME
    },
    debug: {
        port: 80, // debugger host here
        host: "http://debug-host.com.br",
        mongouri: "mongodb://MDatabase:MDatabasePass@127.0.0.1:27017/",
        database: {
            host: "127.0.0.1",
            port: 27017,
            name: "",
            user: "",
            password: ""
        }
    },
    development: {
        port: 3300, // development port here
        host: "127.0.0.1", // development host here
        api: "http://localhost:3300/api", // development api entry point here
        app: "http://localhost:3300", // development application entry point here
        mongouri: "mongodb://127.0.0.1:27017/",
        database: {host: "127.0.0.1", port: 27017, name: "MyAppDatabase", user: "", password: ""},
        STORAGE_NAME
    }
};
/**
 * Return enviroment settings
 * @param [env]
 * @return {*|settings.development|{port, host, mongouri, dbName,api,app,STORAGE_NAME, database: {host, port, name, user, password}}}
 */
export const getEnvSettings = (env = process.env.NODE_ENV) => {
    return settings[env] || settings.development;
};

export const getDatabaseSettings = (options = "") => {
    const {database} = getEnvSettings();
    if (process.env.NODE_ENV === "production") {
        options = options ? `${options}&authSource=${database.name}` : `?authSource=${database.name}`
    }
    if (process.env.MONGO_URI) {
        return `${process.env.MONGO_URI}${options}`
    }
    const uri = `${database.host}:${database.port}/${database.name}${options}`;
    if (!database.user && !database.password) {
        return `mongodb://${uri}`;
    } else {
        return `mongodb://${database.user}:${database.password}@${uri}`;
    }
};

export const getVersion = () => _package.version;

export default {
    getVersion,
    getDatabaseSettings,
    defaultSettings: settings,
};