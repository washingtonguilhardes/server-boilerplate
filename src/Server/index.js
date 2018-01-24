import multer from "multer";
import graphQLHTTP from "express-graphql";
//import ObjectId from "bson-objectid";
//import schema from "./Schema";
import Schema, { AuthSchema } from "./Schema";

import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import pug from "pug";
import Express from "express";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import FileStore from "session-file-store";
import morgan from "morgan";
import compression from "compression";
import Database from "./Database";
import { getEnvSettings } from "./../../Settings"
import Authentication from "./Authentication";
import { Constants, Models } from "./Models";

const privateKey = fs.readFileSync(path.join(__dirname, "ssl", "your_private.key"), "utf8");
const certificate = fs.readFileSync(path.join(__dirname, "ssl", "your_private.crt"), "utf8");
const credentials = {key: privateKey, cert: certificate};

const SERVICE_FILE_UPLOAD = "SERVICE_FILE_UPLOAD";
const SERVICE_GRAPHQL_SERVER = "SERVICE_GRAPHQL_SERVER";
const SERVICE_GRAPHQL_AUTH = "SERVICE_GRAPHQL_AUTH";

// PUT your system comon data loader here;
const sysDataMidleware = (filter = {}) => async (req, res, next) => {
    console.log("sysDataMidleware LOADER");
    next();
};

export default class Server {

    constructor(appName = "my awesome app") {
        this.app = Express();
        this._appName = appName;
        this.httpServer = null;
        this.httpsServer = null;
        this.settings = getEnvSettings();
        this.events = [];
        this.servicesEnabled = [];
        Server.APP = this;
        console.log(`>>>>>> ${this.getAppName().toUpperCase()} RUNING IN ${process.env.PWD} | PID: ${process.pid} <<<<<<`);
    }

    static APP = null;
    static PRE_START = "SERVER_PRE_LISTEM";
    static POS_START = "SERVER_POS_LISTEM";

    static Models = Models;
    static Schema = Schema;
    static Express = Express;
    static Constants = Constants;
    static Authentication = Authentication;


    /**
     *
     * @return {String}
     */
    getAppName() {
        return this._appName;
    }

    setAppName(_appName) {
        this._appName = _appName;
    }

    /**
     *
     * @return {String}
     */
    get appName() {
        return this._appName;
    }

    /**
     *
     * @param {String} _appName
     */

    set appName(_appName) {
        this._appName = _appName;
    }

    /**
     *
     * @return {Express}
     */

    get app() {
        return this._app;
    }

    /**
     *
     * @param {Express} _app
     */
    set app(_app) {
        this._app = _app;
    }

    /**
     * @param {Array} [dirs]
     * @return {Server}
     */
    setupStaticFolders(dirs = []) {
        try {
            const publicDir = path.join(process.env.PWD, "public");
            const resources = path.join(process.env.PWD, "res");
            this._app.use('/public', Express.static(publicDir));
            this._app.use('/resources', Express.static(resources));
            console.log("[  √ ] SETUP STATIC FOLDERS ");
            console.log(`[ OK ] SETUP STATIC (/public) ${publicDir}`);
            console.log(`[ OK ] SETUP STATIC (/resources) ${resources}`);
            dirs.map(dir => {
                console.log(`[ OK ] SETUP STATIC (${dir.route}) ${dir.path}`);
                this._app.use(dir.route, Express.static(dir.path));
            });
            return this;
        } catch (e) {
            console.log(`[ FAIL ] SETUP STATIC FOLDERS FAILT ${e.message}`);
            process.exit(1);
        }
    }

    setupCustomRouter(path, Router) {
        try {
            if (!path) {
                throw new Error('Invalid custom router path');
            }
            if (!Router) {
                throw new Error('Provide a valid router');
            }

            this._app.use(path, sysDataMidleware(), Router);
            console.log(`[ OK ] SETUP CUSTOM ROUTER ${path} `);
            return this;
        } catch (e) {
            console.error(`[ FAIL ] SETUP CUSTOM ROUTER ${path} ${e.message}`);
            throw e;
        }
    }

    /**
     *
     * @return {Server}
     */
    setupSession() {
        const _sessionsPath = path.join(process.env.PWD, "sessions");
        fs.existsSync(_sessionsPath) || fs.mkdirSync(_sessionsPath, 0o777);
        this._app.use(session({
            store: new FileStore,
            secret: "keyboard cat",
            resave: false,
            saveUninitialized: true,
            cookie: {maxAge: 24 * 60 * 60 * 1000}
        }));
        console.log("[ OK ] SETUP SESSION (path)");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupCORS() {
        this._app.use(cors());
        console.log("[ OK ] SETUP CROSS ORIGIN REQUESTS");
        return this;
    }

    setupFileHandler() {
        try {
            if (
                this.getServices().indexOf(SERVICE_GRAPHQL_SERVER) > -1
                || this.getServices().indexOf(SERVICE_GRAPHQL_AUTH) > -1
            ) {
                throw new Error(` MUST BE SETUPED BEFORE GraphQL Services`);
            }
            const dest = path.join(process.env.PWD, 'public', 'uploads');
            const upload = multer({
                dest,
                filename: function (req, file, cb) {
                    cb(null, file.originalname);
                }
            });

            const fileGetter = async (req, res) => {
                try {
                    const file = await Models.Files.getInstance().get({_id: req.params.id});
                    if (!file) {
                        res.sendStatus(404);
                        return;
                    }
                    const fname = path.join(process.env.PWD, "public", "uploads", file.filename);
                    if (!fs.existsSync(fname)) {
                        return res.sendStatus(404);
                    }
                    res.setHeader('Content-Type', file.mimetype);
                    fs.createReadStream(fname).pipe(res);
                } catch (err) {
                    res.sendStatus(400);
                }
            };
            const fileInsertter = async (req, res) => {
                try {
                    Models
                        .Files
                        .addMultiples(req.files)
                        .then(_files => res.status(200).send(_files))
                        .catch(res.status(500).send);
                } catch (e) {
                    res.status(500).send(e)
                }
            };

            this._app.get("/files/:id", fileGetter);
            this._app.get("/apifiles/:id", fileGetter);
            this._app.post("/apifiles", upload.any(), fileInsertter);
            this._app.post("/files", upload.any(), fileInsertter);

            console.log(`[ OK ] SETUP FILE UPLOAD HANDLER IN ${dest} `);
            this.serviceSetupEnd(SERVICE_FILE_UPLOAD);
            return this;
        } catch (e) {
            console.log(`[ FAIL ] FILE UPLOAD HANDLER ${e.message}`);
            process.exit(1);
        }

    }

    /**
     *  Start a graphQL athentication resolser, models and controllers
     * @return {Server}
     */
    setupGraphQLAuth() {
        this._app.use(
            /\/(apiauth|auth)/i,
            bodyParser.json(),
            bodyParser.text({type: 'application/graphql'}),
            Authentication.authMiddleware({blockResponse: false}),
            Authentication.checkTokenMiddleware({blockResponse: false}),
            graphQLHTTP(req => ({
                schema: AuthSchema,
                graphiql: true,
                context: {
                    Models,
                    Authentication,
                    Constants,
                    user: req.user
                }
            })));

        this.serviceSetupEnd(SERVICE_GRAPHQL_AUTH);
        console.log("[ OK ] GRAPHQL AUTHENTICATION SERVER");
        return this;
    }

    /**
     * Start a graphQL server payload
     * @return {Server}
     */
    setupGraphQLServer() {
        this._app.use(
            '/api',
            bodyParser.json(),
            bodyParser.text({type: 'application/graphql'}),
            //Normaliza o usuário pelo token (joga ele para o context)
            Authentication.authMiddleware({blockResponse: true}),
            //Verifica se o usuário está authenticado
            Authentication.checkTokenMiddleware({blockResponse: false}),
            sysDataMidleware(),
            // Inicia o middleware do GraphQL
            graphQLHTTP(req => ({
                schema: Schema,
                graphiql: process.env.NODE_ENV === "development",
                context: {
                    Models,
                    Constants,
                    Authentication,
                    user: req.user,
                    token: req.token,
                    systemCredit: req.systemCredit,
                    systemSettings: req.systemSettings,
                }
            })));
        this.serviceSetupEnd(SERVICE_GRAPHQL_SERVER);
        console.log("[ OK ] GRAPHQL SERVER ");
        return this;
    }

    setupBody() {
        this._app.use(bodyParser.json());
        this._app.use(bodyParser.urlencoded({extended: true}));
        console.log("[ OK ] SETUP BODY PARSER");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupViewEngine() {
        const views = path.join(__dirname, "Views");
        this._app.set("views", views);
        this._app.engine("pug", pug.__express);
        this._app.set("pug", "pug");

        console.log(`[ OK ] SETUP VIEW ENGINE ${views}`);
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupGZIP() {
        this._app.use(compression({
            filter: () => {
                return true;
            }
        }));
        console.log("[ OK ] SETUP GZIP (compression)");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupMorgan() {
        this._app.use(morgan("tiny"));
        console.log("[ OK ] SETUP MORGAN");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    defaults() {
        this._app.enable("trust proxy");
        //this._app.set("ssl_port", 3301);
        this._app.set("port", this.settings.port);
        this._app.set("host", this.settings.host.replace("http://", ""));
        return this;
    }

    /**
     *
     * @return {Promise}
     */

    async startServer() {
        return new Promise((resolve, reject) => {
            this.defaults();
            const pre = this.events.filter(l => l.event === Server.PRE_START).map(pE => pE.callback(this));
            const pos = this.events.filter(l => l.event === Server.POS_START).map(poE => poE.callback(this));
            Promise
                .all(pre)
                .then(() => {
                    this.http.listen(this._app.get("port"), this._app.get("host"), (e) => {
                        if (e) {
                            throw e;
                        }
                        console.log(`[ OK ] HTTP START AT: ${this._app.get("host")}:${this._app.get("port")}`);
                        Promise.all(pos);
                        resolve(this.settings);
                    });
                })
                .catch(error => {
                    console.error(`[ FAILT ] ERROR ON START ${this.getAppName()}`);
                    reject(error)
                });
        });
    }

    /**
     *
     * @param event
     * @param callback
     * @return {Server}
     */
    addEventListener(event, callback) {
        if (this.events.length <= 50) {
            this.events.push({event, callback, date: new Date});
        } else {
            console.warn("EVENT LIMIT EXCEDED. LIMIT: 50");
        }
        return this;
    }

    get http() {
        if (this.httpServer) {
            return this.httpServer;
        }
        this.httpServer = http.createServer(this._app);
        return this.httpServer;
    }

    get https() {
        if (this.httpsServer) {
            return this.httpsServer;
        }
        this.httpsServer = https.createServer(credentials, this._app);
        return this.httpsServer;
    }

    /**
     *
     * @param [_appName]
     * @return {Server}
     */
    static getInstance(_appName) {
        if (!Server.APP) {
            Server.APP = new Server(_appName);
        }
        return Server.APP;
    }

    async startDatabase() {
        return await  Database.init();
    }

    serviceSetupEnd(service) {
        this.servicesEnabled.push(service);
    }

    /**
     *
     * @return {Array}
     */
    getServices() {
        return this.servicesEnabled;
    }
}
