import mongoose from "mongoose";
import MetaConstants from "./MetaConstants";

const MetaSchema = new mongoose.Schema({
    name: {type: String, required: true},
    value: {type: mongoose.Schema.Types.Mixed, required: true},
    description: {type: String},
    owner: {type: mongoose.Schema.Types.ObjectId, required: true},
    _type: {type: String, default: MetaConstants.META_TYPE_RAW}
});

export default MetaSchema;