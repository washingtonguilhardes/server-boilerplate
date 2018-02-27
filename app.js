import Server from "./src/Server";
import { Router } from "express";
import clear from "clear";
//import { legacy } from "./v0";

const MyApp = Server.getInstance("MyApp");
const start = function () {

    const PingRouter = new Router();
    PingRouter.get('/:n1/:n2', (req, res) => {
        //console.log(req.params);
        const {n1, n2} = req.params;
        res.status(200).send(`RESULT: ${Number(n1) + Number(n2)}`);
    });
    if (MyApp.isReady()) {
        return true;
    }
    MyApp
        .setupGZIP()
        .setupStaticFolders()
        .setupViewEngine()
        .setupMorgan()
        .setupCORS()
        .setupFileHandler()
        .setupCustomRouter('/sun', PingRouter)
        .setupGraphQLAuth()
        .setupGraphQLServer('/graphql')
        .setupBody()
        .notifyDone()
        .get('/test', (_, res) => res.status(200).send("OK"))
        .get('*', (_, res) => res.render("index.pug", {user: _.user}));

    const initialize = async () => {
        try {
            await  MyApp.startDatabase(true);
            return await  MyApp.startServer();
        } catch (e) {
            console.error(`${MyApp.getAppName()} APP INITIALIZE ERROR`, e);
            throw e;
        }
    };

    initialize()
        .then(() => {
            console.log(`[ √ ] DONE SETUP`);
            setInterval(() => {
                clear();
                MyApp.initLog();
                console.log('::: LISTEN FOR CONNECTIONS :::')
            }, 1000)
        })
        .catch((e) => {
            console.error(`${MyApp.getAppName()} APP INITIALIZE ERROR`, e);
            process.exit(1);
        });
};

const reboot = async function () {
    await  MyApp.reboot();
    start();
};
export default MyApp.getPureServer();

export {
    start,
    reboot
}