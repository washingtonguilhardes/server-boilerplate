import mongoose from "mongoose";
import Settings from "./../../../Settings";
import Meta from "./../Models/Metas";
import ErrorHandler from "./../Utils/ErrorHandler";

const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;


export default class DatabaseManager extends ErrorHandler {

    static modelsRegitered = {};

    /**
     *
     * @param {Schema|Object} schema
     * @param {String} collection
     * @param [itemId]
     */
    constructor({schema, collection, itemId = null}) {
        super();

        if (Object.keys(schema).length === 0) {
            throw this.throwable(new Error("Schema não definido para " + collection));
        }
        this.itemId = itemId;
        this.schema = schema instanceof Schema ? schema : new Schema(schema);
        this.collection = collection;
        this.model = null;
        this._item = null;
        this.metaHandler = new Meta({});
        this.inialized = false;
    }


    init(data, withQuery = true) {
        if (typeof window !== "undefined") {
            this.item = data;
            return this;
        }
        this.inialized = true;
        this.setupDefaultFields();
        this.model = DatabaseManager.getCollection(this.collection, this.schema);
        if (!withQuery) {
            return this;
        }
        if (data) {
            if (Object.keys(data || {}).length) {
                this.item = data;
                this.get()
                    .then(_item => {
                        _item = _item === null ? this.toJSON() : Object.assign({}, _item, this.item || {});
                        this.item = _item;
                    })
                    .catch(e => {
                        console.warn("Cant load item for " + this.collection, e.toString());
                    });
            } else this.item = Object.assign({}, this.item || {});

        } else {
            this.item = Object.assign({}, this.item || {});
        }
    }

    getInitialized() {
        return this.inialized;
    }

    toJSON() {
        return JSON.parse(JSON.stringify(this.item));
    }

    /**
     * @description keyword $splice & $push only work with a simple array like [1,2,3], not work with [{number: 1}, {number: 2}, {number: 3}]
     * @param toSet
     * @param item
     * @return {*}
     */
    setData(toSet, item = null) {
        if (!toSet || Object.keys(toSet || {}).length === 0) {
            throw this.throwable(new Error("Invalid object to set data"));
        }
        try {

            item = item || this.item || {};
            Object.keys(toSet).map(k => {
                const data = toSet[k];
                if (data) {
                    if (data.constructor === Object) {
                        const keys = Object.keys(data);
                        keys.map(l => {
                            switch (l) {
                                case "$push":
                                    if (data[l].constructor === Array) {
                                        item[k].concat(data[l]);
                                    } else item[k].push(data[l]);
                                    break;
                                case "$splice":
                                    if (data[l].constructor === Array) {
                                        item[k] = item[k].filter(o => data[l].indexOf(o) === -1);
                                    } else {
                                        const toSplice = item[k].findIndex(e => data[l].indexOf(e) > -1);
                                        item[k].splice(toSplice, 1);
                                    }
                                    break;
                                default:
                                    item[k] = toSet[k];
                                    break;
                            }
                        });
                    } else item[k] = toSet[k];
                } else item[k] = toSet[k];
            });
            this.item = item;
            return this;
        } catch (e) {
            this.throwable(e);
        }
    }

    getId() {
        return String(this.item._id || "") || null;
    }

    getData(key) {
        if (!key) {
            return this._item;
        }
        if (this._item[key] === undefined || typeof this._item[key] === "undefined") {
            return undefined;
        }
        return this._item[key];
    }

    setupDefaultFields() {
        this.schema.add({
            oid: {type: Schema.Types.ObjectId, required: true, unique: true},
            dataVersion: {type: String, default: null},
            createOn: {type: Date, default: null},
            lastUpdate: {type: Date, default: null},
            metas: {type: Array, default: [], ref: "Metas"},
            history: {type: Array, default: []}
        });
        return this;
    }

    writeHistory({date, event, description, metas}) {
        const history = this.getData("history") || [];
        history.push({date, event, description, metas});
        this.setData({history});
        return this;
    }

    async add(data = this.item) {
        const Model = DatabaseManager.getCollection(this.collection);
        data.createOn = new Date();
        data.lastUpdate = data.createOn;
        data.dataVersion = Settings.getVersion();
        data.oid = data.oid || new ObjectId();
        if (!data._id || data._id === null) {
            delete data._id;
        }
        const _data = new Model(data);
        this.item = _data.toJSON();
        return _data.save();
    }

    /**
     *
     * @param metaData
     * @return {DatabaseManager}
     */
    async addMeta(metaData) {
        try {
            if (metaData.constructor !== Array) {
                metaData = [metaData];
            }
            await  this.save();
            const _metas = metaData.map(meta => {
                const _meta = Meta.getInstance(meta);
                _meta.setOwner(this.getId());
                this.item.metas.push(_meta.getId());
                return _meta.save();
            });
            await Promise.all(_metas);
            const metas = await this.getMetas();
            this.setData({metas});
            return this;
        } catch (e) {
            throw  this.throwable(e);
        }
    }

    async getMeta(filter = {}) {
        const query = Object.assign({}, {_id: {$in: this.item.metas}}, filter);
        return new Promise((resolve, reject) => {
            this.metaHandler
                .list(query)
                .then(metas => resolve(metas[0] || null))
                .catch(e => reject(e));
        });
    }

    async getMetas() {
        return new Promise((resolve, reject) => {
            this.metaHandler
                .list({_id: {$in: this.item.metas}})
                .then(items => resolve(items.map(m => m.toJSON())))
                .catch(e => reject(e));
        });
    }

    /**
     * save a instance and another instaces changes, just set a valid data.
     *
     * @param _id
     * @param toUpdate
     * @return {Query|Promise}
     */
    async update(_id, toUpdate) {
        if (!toUpdate) {
            throw  new Error("Invalid data to save");
        }
        const Model = DatabaseManager.getCollection(this.collection);
        toUpdate = DatabaseManager.parseDataToUpdate(toUpdate);
        return new Promise((resolve, reject) => {
            delete toUpdate._id;
            Model
                .update({_id: String(_id)}, {$set: toUpdate}, {upsert: true})
                .exec()
                .then(result => resolve(result))
                .catch(e => reject(e));
        });
    }

    /**
     * Save a instance changes
     * @param {Object} [query] query before save to get obj and exec insert or update
     * @param a
     * @return {Promise}
     */
    async save(query, a) {
        if (this.item === null) {
            throw new Error("Any default item has loaded. Try load one using #loadItem() parsing a valid object id");
        }
        console.log("WILL SAVE", this.item);
        return new Promise((resolve, reject) => {
            this
                .get(query || {_id: this.item._id})
                .then(item => item ? this.findOneAndUpdate(this.item._id || item._id, this.item) : this.add(this.item))
                .then(_item => {
                    this.item = JSON.parse(JSON.stringify(_item));
                    resolve(this.item);
                })
                .catch(e => reject(this.throwable(e)));
        });
    }

    /**
     *
     * @param _id
     * @param toUpdate
     * @param {{populates: String}} [options]
     * @return {Promise}
     */
    async findOneAndUpdate(_id, toUpdate = {}, options = {}) {
        //return new Promise((resolve, reject) => {
        delete toUpdate._id;
        delete toUpdate.oid;
        delete toUpdate.code;

        const Model = DatabaseManager.getCollection(this.collection);
        toUpdate = DatabaseManager.parseDataToUpdate(toUpdate);
        //const _change = await Hooks.preUpdate({
        //    toUpdate,
        //    collection: this.collection,
        //    context: this,
        //    currentCollection: Model,
        //    collections: DatabaseManager.modelsRegitered
        //});
        return Model
            .findOneAndUpdate({_id}, {$set: toUpdate}, {new: true, upsert: true, lean: true})
            .lean()
            .populate(options.populates || "")
            .exec();
        //})
    }

    /**
     *
     * @param [query]
     * @param [options]
     * @return {Promise | Query}
     */
    async get(query, options = {}) {
        try {
            options.lean = true;
            const Model = DatabaseManager.getCollection(this.collection);
            if (!query || query === "undefined") {
                try {
                    const _id = this.item._id || String(this.item);
                    if (_id === "[object Object]") {
                        return Promise.resolve(null);
                    }
                    return new Promise((resolve, reject) => {
                        Model
                            .findOne({_id}, null, options).lean()
                            .exec().then(resolve).catch(reject)
                    });
                } catch (e) {
                    console.warn("Get item error in " + this.collection, e);
                    return Promise.resolve(null);
                }
            }
            return await Model.findOne(query, null, options);
        } catch (e) {
            throw e;
        }
    }

    async list(query, options = {}, fields = null) {
        options.lean = true;
        const Model = DatabaseManager.getCollection(this.collection);
        return new Promise((resolve, reject) => {
            const _fields = fields || options.fields;
            let sort = null;
            if (typeof options.sort === "function") {
                sort = options.sort;
                delete options.sort;
                console.warn("WARNING:", "If you are using a function to sort Mongodb`s array response, the application can get a bad performance and behave more slow. Try use Mongodb native Function");
            }
            delete options.fields;
            Model
                .find(query, _fields || null, options).lean().exec()
                .then(result => resolve(sort ? result.sort(sort) : result))
                .catch(e => reject(this.throwable(e)));
        });
    }

    /**
     *
     * @param [_id]
     * @return {Promise.<Query|*>}
     */
    async loadItem(_id = this._itemId) {
        if (!_id) {
            throw new Error("INVALID _id to load item (" + _id + ")");
        }
        return new Promise((resolve, reject) => {
            DatabaseManager.modelsRegitered[this._collection]
                .findOne({_id})
                .then(item => {
                    this.item = this._item || {};
                    this._item.newItem = true;
                    this._item.dataVersion = Settings.getVersion();
                    this._item.createOn = null;
                    this._item.lastUpdate = null;
                    this._item.metas = [];
                    resolve(item ? item : null);
                })
                .catch(e => reject(e));
        });
    }

    async remove(query = {_id: String(this.item._id || this.item)}) {
        const Model = DatabaseManager.getCollection(this.collection);
        const removeTask = [
            Model.remove(query).exec()
        ];
        if (query._id) {
            if (query._id === String(this.item._id)) {
                removeTask.push(this.metaHandler.remove({owner: this.item._id}));
            }
        }
        return Promise.all(removeTask);
    }

    // GETTERS AND SETTERS

    get collection() {
        return this._collection;
    }

    set collection(value) {
        this._collection = value;
    }

    get schema() {
        return this._schema;
    }

    set schema(value) {
        this._schema = value;
    }

    get itemId() {
        return this._itemId;
    }

    set itemId(value) {
        this._itemId = value;
    }

    get model() {
        return this._model;
    }

    set model(value) {
        this._model = value;
    }

    get item() {
        return this._item;
    }

    set item(value) {
        this._item = value;
    }

    static parseDataToUpdate(toUpdate) {
        if (!toUpdate.createdOn) {
            delete  toUpdate.createdOn;
        }
        if (!toUpdate.dataVersion) {
            toUpdate.dataVersion = Settings.getVersion();
        }
        toUpdate.lastUpdate = new Date();
        return toUpdate;
    }

    /**
     *
     * @param collectionName
     * @param {Schema} [schema]
     * @return {mongoose.model}
     */
    static getCollection(collectionName, schema = new Schema({})) {
        schema = schema instanceof Schema ? schema : new Schema(schema);
        if (DatabaseManager.modelsRegitered[collectionName]) {
            return DatabaseManager.modelsRegitered[collectionName];
        }
        DatabaseManager.modelsRegitered[collectionName] = mongoose.model(collectionName, schema, collectionName);
        return DatabaseManager.modelsRegitered[collectionName];
    }
}