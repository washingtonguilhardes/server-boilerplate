"use strict";
const Promise = require('es6-promise').Promise;
const mongoose = require("mongoose");
mongoose.Promise = Promise;

const Schema = mongoose.Schema;
const CompanyModel = mongoose.model('companies', new Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    username: {type: String, required: true},
    bloked: {type: Boolean, default: false},
    dir: {type: String, required: true},
    socialMedia: [],
    plugins: [{type: mongoose.Schema.Types.ObjectId, required: false, ref: 'plugins'}]
}));

class Company {

    /**
     *
     * @param filter
     * @return {Query|Promise}
     */
    static get (filter) {
        return CompanyModel.findOne(filter);
    }

    static list(filter) {
        return CompanyModel.find(filter || {});
    }
}

Company.CompanyModel = CompanyModel;
module.exports = exports = Company;