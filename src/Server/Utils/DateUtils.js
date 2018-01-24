import moment from "moment/moment";

export default class DateUtils {
    /**
     *
     * @param hours
     * @param minutes
     * @return {Date}
     */
    static toRangerPattern({hours, minutes}) {
        return moment([2017, 0, 1, hours, minutes, 0, 0]).toDate();
    }
}