"use strict";

const Promise = require('es6-promise').Promise;
const path = require("path");
const Company = require("./Models/Company");
const Database = require("./Database");
const Server = require("./");
const panelRoutes = require("./Routes/Panel");

const panelServer = new Server();
panelServer.app.get(/(bunble\.js)$/ig, (req, res, next) => {
    const _path = req.url.split('?');
    req.url = _path.join('.gz?');
    res.set('Content-Encoding', 'gzip');
    next();
});


panelServer
    .setupBody()
    .setupCORS()
    .setupGZIP()
    .setupSession()
    .setupStaticFolders()
    .setupViewEngine()
    .setupMorgan()
    .addEventListener(Server.PRE_START, () => new Promise((resolve, reject) => {
        Database()
            .then(() => {
               console.log("PRE START EXEC AND START DATABASE")
                resolve()
            })
            .catch(reject);
    }))
    .start()
    .then(() => {
        panelServer.app.use(panelRoutes);
    })
    .catch(error => console.log("ERROR", error));
