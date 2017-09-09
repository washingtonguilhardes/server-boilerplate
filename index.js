const http = require('http');
const https = require("https");
const fs = require('fs');
const path = require('path');
const pug = require('pug');
const Express = require("express");
const session = require("express-session");
const bodyParser = require('body-parser');
const FileStore = require('session-file-store')(session);
const ms = require('ms');
const morgan = require('morgan');
const compression = require("compression");
const privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'your_private.key'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'your_private.crt'), 'utf8');
const credentials = {key: privateKey, cert: certificate};

const settings = require('../settings.json')
class Server {
    constructor() {

        this._app = Express();
        this.httpServer = null;
        this.httpsServer = null;
        this.settings = settings[process.env.NODE_ENV || "development"];

        this.events = [];
    }

    /**
     *
     * @return {Server}
     */
    setupStaticFolders() {
        const publicDir = path.join(__dirname, '..', 'public');
        this._app.use(Express.static(path.join(publicDir, 'build')));
        this._app.use(Express.static(publicDir));
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupSession() {
        const _sessionsPath = path.join(__dirname, '..', 'sessions');
        fs.existsSync(_sessionsPath) || fs.mkdirSync(_sessionsPath, 0o777);
        this._app.use(session({
            store: new FileStore,
            secret: 'keyboard cat',
            resave: false,
            saveUninitialized: true,
            cookie: {maxAge: 24 * 60 * 60 * 1000}
        }));
        console.log("SETUP SESSION");
        return this
    }

    /**
     *
     * @return {Server}
     */
    setupCORS() {
        this._app.use((req, res, next) => {
            res.header('Cache-Control', `max-age=2592000`);
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Authorization, Content-Type, Accept, ETag,Transfer-Encoding");
            res.header("Access-Control-Expose-Headers", "Origin, Etag, Authorization, Origin, X-Requested-With, Content-Type, Accept, If-None-Match, Access-Control-Allow-Origin, Transfer-Encoding");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.header('X-Powered-By', 'YOUR_COMPANY_NAME');
            res.header('Expires', new Date(Date.now() + ms('1h')));
            res.header('Transfer-Encoding', 'chunked');
            res.header('Access-Control-Allow-Origin', '*');
            next();
        });
        console.log("SETUP CROSS ORIGIN REQUESTS");
        return this;
    }

    setupBody() {
        this._app.use(bodyParser.json());
        this._app.use(bodyParser.urlencoded({extended: true}));
        console.log("SETUP BODY PARSER");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupViewEngine() {
        const views = path.join(__dirname, 'Views');
        this._app.set('views', views);
        this._app.engine('pug', pug.__express);
        this._app.set('pug', 'pug');

        console.log("SETUP VIEW ENGINE");
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
        console.log("SETUP GZIP (compression)");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    setupMorgan() {
        this._app.use(morgan('tiny'));
        console.log("SETUP MORGAN");
        return this;
    }

    /**
     *
     * @return {Server}
     */
    defaults() {
        this._app.enable('trust proxy');
        this._app.set('port', this.settings.port);
        this._app.set('ssl_port', 30011);
        this._app.set('host', this.settings.host.replace('http://', ''));
        return this;
    }

    /**
     *
     * @return {Promise}
     */

    start() {
        return new Promise((resolve, reject) => {
            this.defaults();
            const pre = this.events.filter(l => l.event === Server.PRE_START).map(pE => pE.callback(this));
            const pos = this.events.filter(l => l.event === Server.POS_START).map(poE => poE.callback(this));
            Promise
                .all(pre)
                .then(() => {
                    const date = new Date();
                    this.https.listen(this._app.get('ssl_port'), this._app.get('host'), () => {
                        console.log(`${date} CTRL-C =>  to quit \nHTTPS START AT: ${this._app.get('host')}:${this._app.get('ssl_port')}`);
                    });
                    this.http.listen(this._app.get('port'), this._app.get('host'), () => {
                        console.log(`${date} CTRL-C => to quit\nHTTP START AT: ${this._app.get('host')}:${this._app.get('port')}`);
                        Promise.all(pos);
                    });
                    resolve()
                })
                .catch(error => {
                    console.error(error);
                    process.exit(1);
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

    get app() {
        return this._app;
    }
}

Server.PRE_START = "SERVER_PRE_LISTEM";
Server.POS_START = "SERVER_POS_LISTEM";
Server.Express = Express;
module.exports = exports = Server;

/**
 * useage
 * 
 * 
 * 
 */