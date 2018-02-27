import multer from "multer";
import graphQLHTTP from "express-graphql";
import Schema, { AuthSchema } from "./Schema";
import os from "os";

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
import { getEnvSettings } from "./Settings"
import Authentication from "./Authentication";
import { Constants, Models } from "./Models";
import moment from "moment";
import _package from "./../../package.json";

const privateKey = fs.readFileSync(path.join(__dirname, "ssl", "your_private.key"), "utf8");
const certificate = fs.readFileSync(path.join(__dirname, "ssl", "your_private.crt"), "utf8");
const credentials = {key: privateKey, cert: certificate};

const SERVICE_FILE_UPLOAD = "SERVICE_FILE_UPLOAD";
const SERVICE_GRAPHQL_SERVER = "SERVICE_GRAPHQL_SERVER";
const SERVICE_GRAPHQL_AUTH = "SERVICE_GRAPHQL_AUTH";

// PUT your system comon data loader here;
const sysDataMidleware = (filter = {}) => async (req, res, next) => {
    next();
};

export default class Server {

    constructor(appName = "MyAwesomeApp", mode) {
        this.app = Express();
        this._appName = appName;
        this.httpServer = null;
        this.httpsServer = null;
        this.settings = getEnvSettings();
        this.events = [];
        this.servicesEnabled = [];
        this.PWD = process.env.PWD;
        Server.APP = this;
        this.ready = false;
        return new Proxy(this, {
            get(target, name) {
                if (name in target) {
                    return target[name];
                }
                return target.getPureServer()[name];
            }
        });
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
     * @return {Server}
     */
    initLog() {
        process.stdout.write('\x1Bc');
        const cols = process.stdout.columns;
        let header = '';
        let bottom = '';
        for (let i = 0; i < cols; ++i) {
            header += '=';
            bottom += '-';
        }
        const logs = [];
        logs.push(`| App      |   ${this.getAppName()}`);
        logs.push(`| Version  |   ${_package.version} (${this.getLastCommit()})`);
        logs.push(`| Arch     |   ${process.arch}`);
        logs.push(`| UID      |   ${process.getuid()}`);
        logs.push(`| PID      |   ${process.pid}`);
        logs.push(`| ENV      |   ${process.env.NODE_ENV}`);
        logs.push(`| Node V.  |   ${process.version}`);
        logs.push(`| Platform |   ${os.platform()}`);
        logs.push(`| OSType   |   ${os.type}`);
        logs.push(`| Date     |   ${moment().format('HH:mm:ss DD/MM/Y')}`);
        const view = [];
        logs.map(log => {
            log = log.slice(0, cols - 1);
            const l = log.length;
            for (let i = 0; i < (cols - l - 1); ++i) {
                log += ' ';
            }
            view.push(log + '|');
        });
        //logs.push(bottom);

        view.unshift(header);
        view.push(bottom);
        console.log(view.join(os.EOL));
        return this;
    }

    /**
     *
     * @return {Server}
     */
    notifyDone() {
        this.ready = true;
        return this;
    }

    isReady() {
        return this.ready;
    }

    getShortPWD(_path = this.PWD) {
        const arr = (_path || this.PWD).split('/');
        return arr.length <= 2 ? arr.join('/') : ['[...]'].concat(arr.slice(arr.length - 3, arr.length)).join('/');
    }

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
     * @param {Array} [dirs]
     * @return {Server}
     */
    setupStaticFolders(dirs = []) {
        try {
            const publicDir = path.join(process.env.PWD, "public");
            const resources = path.join(process.env.PWD, "res");
            this._app.use('/public', Express.static(publicDir));
            this._app.use('/resources', Express.static(resources));
            console.log("[ √ ] SETUP STATIC FOLDERS ");
            console.log(`[ √ ] SETUP STATIC (/public) ${this.getShortPWD(publicDir)}`);
            console.log(`[ √ ] SETUP STATIC (/resources) ${this.getShortPWD(resources)}`);
            dirs.map(dir => {
                console.log(`[ √ ] SETUP STATIC (${dir.route}) ${dir.path}`);
                this._app.use(dir.route, Express.static(dir.path));
            });
            return this;
        } catch (e) {
            console.log(`[ERR] SETUP STATIC FOLDERS FAIL ${e.message}`);
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
            console.log(`[ √ ] SETUP CUSTOM ROUTER ${path} `);
            return this;
        } catch (e) {
            console.error(`[ERR] SETUP CUSTOM ROUTER ${path} ${e.message}`);
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
        console.log("[ √ ] SETUP SESSION (path)");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupCORS() {
        this._app.use(cors());
        console.log("[ √ ] SETUP CROSS ORIGIN REQUESTS");
        return this;
    }

    /**
     *
     * @return {Server}
     */
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

            console.log(`[ √ ] SETUP FILE UPLOAD HANDLER IN ${this.getShortPWD(dest)} `);
            this.serviceSetupEnd(SERVICE_FILE_UPLOAD);
            return this;
        } catch (e) {
            console.log(`[ERR] FILE UPLOAD HANDLER ${e.message}`);
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
        console.log("[ √ ] GRAPHQL AUTHENTICATION SERVER");
        return this;
    }

    /**
     * Start a graphQL server payload
     * @return {Server}
     */
    setupGraphQLServer(entry) {
        this._app.use(
            entry || '/api',
            bodyParser.json(),
            bodyParser.text({type: 'application/graphql'}),
            //Normaliza o usuário pelo token (joga ele para o context)
            Authentication.authMiddleware({blockResponse: process.env.NODE_ENV === "production"}),
            //Verifica se o usuário está authenticado
            Authentication.checkTokenMiddleware({blockResponse: process.env.NODE_ENV === "production"}),
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
                },
                formatError: error => console.error(error) || ({
                    message: error.message,
                    state: error.originalError && error.originalError.state,
                    locations: error.locations,
                    path: error.path,
                })
            })));
        this.serviceSetupEnd(SERVICE_GRAPHQL_SERVER);
        console.log("[ √ ] GRAPHQL SERVER ");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupBody() {
        this._app.use(bodyParser.json());
        this._app.use(bodyParser.urlencoded({extended: true}));
        console.log("[ √ ] SETUP BODY PARSER");
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

        console.log(`[ √ ] SETUP VIEW ENGINE ${this.getShortPWD(views)}`);
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
        console.log("[ √ ] SETUP GZIP (compression)");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupMorgan() {
        this._app.use(morgan("tiny"));
        console.log("[ √ ] SETUP MORGAN");
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
                        console.log(`[ √ ] HTTP START AT: ${this._app.get("host")}:${this._app.get("port")}`);
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

    async startDatabase(useGlobalConnection) {
        return await  Database.init(useGlobalConnection);
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

    /**
     * Return application pure server manager like a express
     * or koa or restify
     * @return {Express}
     */
    getPureServer() {
        return this.app;
    }

    /**
     *
     * @return {Server}
     */
    async reboot() {
        Server.APP = null;
        this.app = null;
        this.httpServer = null;
        this.httpsServer = null;
        this.events = [];
        this.servicesEnabled = [];
        this.ready = false;

        await Database.close();

        return Server.getInstance(this._appName);
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

    getLastCommit() {
        const git = path.join(this.PWD, '.git');
        if (!fs.existsSync(git)) {
            return '-'
        }
        const head = fs.readFileSync(path.join(git, 'HEAD')).toString().replace('ref: ', '').trim();
        const commit = fs.readFileSync(path.join(git, head)).toString().trim();
        return `${head.split('heads')[1].replace(/^\//, '')} [${commit.slice(0, 9)}]`
    }
}
