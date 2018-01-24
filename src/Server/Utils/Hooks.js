const Constants = require("./../Constants");
const Hooks = {
    PRE_SAVE_EVENT: "PRE_SAVE_EVENT",
    POS_SAVE_EVENT: "POS_SAVE_EVENT",
    PRE_UPDATE_EVENT: "PRE_UPDATE_EVENT",
    POS_UPDATE_EVENT: "POS_UPDATE_EVENT",
    initialized: false,
    __pre: [],
    __pos: [],
    /**
     *
     * @return {Hooks}
     */
    init() {
        if (!this.initialized) {
            this.initialized = true;
        }

        Date.prototype.getWeekDay = function () {
            return Constants.WEEK_DAYS[this.getDay()];
        };

        return this;
    },
    addEventPreUpdate(func, customParams) {
        if (!this.initialized) {
            this.init();
        }
        try {
            this.__pre.push({
                __func: func,
                type: Hooks.PRE_UPDATE_EVENT,
                customParams: customParams || {},
                _time: Date.now()
            });
        } catch (e) {
            throw e;
        }
    },
    async preUpdate(appParams) {
        let _toCall = this.__pre.filter(p => p.type === Hooks.PRE_UPDATE_EVENT);
        _toCall = _toCall.length > 1 ? _toCall.sort((a, b) => a._time > b._time ? 1 : -1) : _toCall;
        const results = [];
        _toCall.map(payload => {
            const result = payload.__func(Object.assign({}, payload.customParams, {
                appParams,
                resultQueue: results
            }));
            return result ? results.push(result) : null;
        });
        return await Promise.all(results);
    },
    postUpdate() {

    }
};
(typeof global === "undefined" ? window : global).Hooks = Hooks.init();
/**
 *
 * @type {Hooks}
 */
module.exports = exports = Hooks;