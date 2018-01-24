import numeral from "numeral";

export const toFloat = function (v) {
    v = v + '';
    if (v.length === 1) {
        v = '00' + v
    }
    v = v.replace(/\D/g, ""); //Remove tudo o que não é dígito
    v = v.replace(/(\d{2})$/, ".$1"); //Coloca a virgula
    v = v.replace(/^(0)(\d)/g, "$2"); //Coloca hífen entre o quarto e o quinto dígitos
    return Number(v);
};


/**
 *
 * @param {Number} value
 * @param {String} [mask]
 */
export const formatMoney = ({value, mask = '0,0.00'}) => {
    const money = toFloat(value);
    return numeral(money).format(mask)
};