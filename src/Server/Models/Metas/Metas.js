import mongoose from "mongoose";
import MetaSchema from "./MetaSchema";

const MetaModel = mongoose.model("Metas", MetaSchema, "Metas");

export default class Metas {


    constructor({_id, value, name, description, _type, owner}) {
        this._item = {
            _id, value, name, description, _type, owner
        };
        if (!_id) {
            this._item = new MetaModel(this._item);
        }
    }

    /**
     * @return {mongoose.model}
     */
    static getModel() {
        return MetaModel;
    }

    async save(meta) {
        let toInsert = meta;
        if (meta instanceof Metas) {
            toInsert = meta.item;
        }
        const _item = new MetaModel(toInsert || this.item);
        this.setId(_item._id);
        console.log({toInsert, _item});
        return _item.save();
    }

    async saveAsync(meta) {
        return this.save(meta);
    }

    async update(_id = this.getId(), meta) {
        let toUpdate = meta;
        if (meta instanceof Metas) {
            toUpdate = meta.item;
        }
        return MetaModel.update({_id}, {$set: toUpdate || this.item});
    }

    //async get(filter) {
    //    if (filter instanceof String) {
    //        filter = {_id: filter};
    //    }
    //    return await MetaModel.findOne(filter);
    //}
    //
    //async list(filter) {
    //    if (!filter) {
    //        throw new Error("Invalid filter parse to __(meta instance).list");
    //    }
    //    if (filter.constructor === String) {
    //        filter = {name: new RegExp(filter, "ig")};
    //    }
    //    return await MetaModel.find(filter);
    //}

    async remove(filter = String(this.getId())) {
        if (filter.constructor === String) {
            filter = {_id: filter};
        }
        return await MetaModel.remove(filter).exec();
    }

    /**
     *
     * @param data
     * @return {Metas}
     */
    static getInstance(data) {
        return new Metas(data);
    }


    setId(_id) {
        this._item._id = _id;
        return this;
    }

    getId() {
        return this.item._id;
    }

    setValue(val) {
        this._item.value = val;
        return this;
    }

    getValue() {
        return this._item.value;
    }

    setType(_type) {
        this._item._type = _type;
        return this;
    }

    getType() {
        return this._item._type;
    }

    setName(name) {
        this._item.name = name;
    }

    getName() {
        return this._item.name;
    }

    setOwner(owner) {
        this._item.owner = owner;
    }

    getOwner() {
        return this._item.owner;
    }

    setDescription(description) {
        this._item.description = description;
    }

    getDescription() {
        return this._item.description;
    }


    get item() {
        return this._item;
    }

    set item(value) {
        this._item = value;
    }


}
