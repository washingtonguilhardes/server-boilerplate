import DatabaseManager from "./../../Database/DatabaseManager";
import FileSchema from "./FileSchema";


export default class Files extends DatabaseManager {
    constructor(data) {
        super({schema: FileSchema, collection: "File", itemId: data._id || null});
        this.init(data);
    }

    static getInstance(data) {
        return new Files(data || {});
    }

    static async addMultiples(files) {
        try {
            return await Promise.all(files.map(Files.getInstance).map(files => files.save()))
        } catch (e) {
            throw e;
        }
    }
}