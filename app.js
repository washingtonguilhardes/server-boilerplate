import Server from "./src/Server";

global.Promise = Promise;

const start = function () {


    const myApp = Server.getInstance("myApp");

    myApp
        .setupGZIP()
        .setupStaticFolders([{route: `/my-custom-route`, path: '/Application/MAMP/htdocs'}])
        .setupViewEngine()
        .setupMorgan()
        .setupCORS()
        .setupFileHandler()
        .setupGraphQLAuth()
        .setupGraphQLServer()
        .setupBody()
        .app
        .get('*', (_, res) => res.render("index.pug", {user: _.user}));

    const initialize = async () => {
        try {
            await  myApp.startDatabase();
            return await  myApp.startServer();
        } catch (e) {
            console.error(`${myApp.getAppName()} APP INITIALIZE ERROR`, e);
            throw e;
        }
    };

    initialize()
        .then(() => console.log(`>>>>>> WAITING FOR CONNECTIONS <<<<<<`))
        .catch((e) => {
            console.error(`${myApp.getAppName()} APP INITIALIZE ERROR`, e);
            process.exit(1);
        });
};
module.exports = exports = {
    start: start
};