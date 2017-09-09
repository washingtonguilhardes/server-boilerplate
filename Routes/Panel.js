const Router = require("express").Router;
const favicon = require('serve-favicon');
const path = require("path");
const panelRouter = new Router();
const Company = require("./../Models/Company");


panelRouter.use(favicon(path.join(__dirname,  'favicon.png')));

panelRouter.post("/login", (req, res) => {
    console.log("SAVE LOGIN", req.body);
    req.session.user = req.body.user;
    req.session.token = req.body.token;
    res.status(200).send(req.session);
});

panelRouter
    .get('*', (req, res, next) => {
        if ((/socket\.io/ig).test(req.url)) {
            return next();
        }
        const company = req.session.company;
        res.status(200).render("index.pug", {company, companyStr: JSON.stringify(company)});
    });

module.exports = exports = panelRouter;