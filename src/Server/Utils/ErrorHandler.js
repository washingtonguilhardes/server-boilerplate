import Settings from "../Settings";
import Server from "./../../Server"

class ErrorHandler {
    set collection(collection) {
        this._collection = collection;
    }

    get collection() {
        return this._collection;
    }

    /**
     * paternify all errors response
     * @param {Error|Object|String} e
     * @return {Error}
     */
    throwable(e) {
        try {
            if (typeof e === "string") {
                e = new Error(e);
            }
            let error = e;

            //let error = e;
            e.message = e.message || "Houve um error";
            let _collection = this.collection;
            if (e.constructor !== Error && e.constructor === Object) {
                error = new Error(`${e.message}\nCONTEXT: [_collection]`);
                for (const key in e) {
                    if (e.hasOwnProperty(key)) {
                        error[key] = e[key];
                    }
                }
            } else if (e.constructor !== Error) {
                error = new Error(`${e}\nCONTEXT: [_collection]`);
            }
            if (_collection === undefined) {
                _collection = error.stack.split("\n").find(s => !(/(Error)|(throwable)|(CONTEXT)/ig).test(s));
                _collection = _collection.split("/");
                _collection = `${_collection[0]}${_collection[_collection.length - 2]}/${_collection[_collection.length - 1]}`;
            }
            error.message = error.message.replace("[_collection]", _collection);
            error.collection = _collection.trim();
            return error;
        } catch (e) {
            console.error("INVALID ERROR RESPONSE", e);
            process.exit(-1);
        }
    }
}

Error.prototype.toJSON = function () {
    let context = this.message.split("\n");

    if (context.length > 1) {
        const _context = context[context.length - 1].trim();
        this.message = this.message.replace(_context, "").trim();
        context = _context.replace(/(CONTEXT:)/ig, "").trim();
    } else {
        context = undefined;
    }
    if (context === "undefined") {
        context = undefined;
    }
    const ret = {
        name: `'${Server.getInstance().getAppName()}_${Settings.getVersion()} >> ${this.name}`,
        message: this.message,
        context: context || "Global",
        time: new Date(),
        dataVersion: Settings.getVersion(),
        __error__: true
    };

    if (process.env.NODE_ENV === "development") {
        ret.stack = (this.stack || "").split("\n").slice(0, 8);
    } else {
        ret.stack = (this.stack || "").split("\n").slice(0, 3);
    }

    ret.stack = ret.stack.map(s => s.trim());


    // Add any custom properties such as .code in file-system errors
    Object.keys(this).forEach(function (key) {
        if (!ret[key]) {
            ret[key] = this[key];
            if ((ret[key] || {}).message) {
                this.message = `${this.message} | ${ret[key].message}`;
            }
        }
    }, this);
    return ret;
};
//Error.prototype.toString = function () {
//    return JSON.stringify(this.toJSON(), null, 4);
//};


export default ErrorHandler;