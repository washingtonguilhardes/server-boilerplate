const secret = "Hit Below The Belt: Meaning: A boxing term. Also often used to refer to inappropriate words, or comments that are too personal.";
const crypto = require("crypto");

class Utils {
    static positionCalculate(digitos, posicoes = 10, soma_digitos = 0) {

        // Garante que o valor é uma string
        digitos = digitos.toString();

        // Faz a soma dos dígitos com a posição
        // Ex. para 10 posições:
        //   0    2    5    4    6    2    8    8   4
        // x10   x9   x8   x7   x6   x5   x4   x3  x2
        //   0 + 18 + 40 + 28 + 36 + 10 + 32 + 24 + 8 = 196
        for (let i = 0; i < digitos.length; i++) {
            // Preenche a soma com o dígito vezes a posição
            soma_digitos = soma_digitos + (digitos[i] * posicoes);

            // Subtrai 1 da posição
            posicoes--;

            // Parte específica para CNPJ
            // Ex.: 5-4-3-2-9-8-7-6-5-4-3-2
            if (posicoes < 2) {
                // Retorno a posição para 9
                posicoes = 9;
            }
        }

        // Captura o resto da divisão entre soma_digitos dividido por 11
        // Ex.: 196 % 11 = 9
        soma_digitos = soma_digitos % 11;

        // Verifica se soma_digitos é menor que 2
        if (soma_digitos < 2) {
            // soma_digitos agora será zero
            soma_digitos = 0;
        } else {
            // Se for maior que 2, o resultado é 11 menos soma_digitos
            // Ex.: 11 - 9 = 2
            // Nosso dígito procurado é 2
            soma_digitos = 11 - soma_digitos;
        }

        // Concatena mais um dígito aos primeiro nove dígitos
        // Ex.: 025462884 + 2 = 0254628842
        // Retorna
        return digitos + soma_digitos;

    } // calc_digitos_posicoes

    static validatePersonCode(value = "") {
        // Garante que o valor é uma string
        value = value.toString();
        // Remove caracteres inválidos do valor
        value = value.replace(/[^0-9]/g, "");
        // Captura os 9 primeiros dígitos do CPF
        // Ex.: 02546288423 = 025462884
        const digits = value.substr(0, 9);
        // Faz o cálculo dos 9 primeiros dígitos do CPF para obter o primeiro dígito
        let newCPF = Utils.positionCalculate(digits);
        // Faz o cálculo dos 10 dígitos do CPF para obter o último dígito
        newCPF = Utils.positionCalculate(newCPF, 11);
        // Verifica se o novo CPF gerado é idêntico ao CPF enviado
        return newCPF === value;

    } // valida_cpf

    static validateCompanyCode(value = "") {

        // Garante que o value é uma string
        value = value.toString();

        // Remove caracteres inválidos do value
        value = value.replace(/[^0-9]/g, "");


        // O value original
        const cnpj_original = value;

        // Captura os primeiros 12 números do CNPJ
        const primeiros_numeros_cnpj = value.substr(0, 12);

        // Faz o primeiro cálculo
        const primeiro_calculo = Utils.positionCalculate(primeiros_numeros_cnpj, 5);

        // O segundo cálculo é a mesma coisa do primeiro, porém, começa na posição 6
        // Concatena o segundo dígito ao CNPJ
        const cnpj = Utils.positionCalculate(primeiro_calculo, 6);
        // Verifica se o CNPJ gerado é idêntico ao enviado
        if (cnpj === cnpj_original) {
            return true;
        }
        // Retorna falso por padrão
        return false;

    } // valida_cnpj
    /**
     *
     * @param {Number | String} duration
     * @return {{days: Number, hours: Number, minutes: Number, seconds: Number, milliseconds: Number}}
     */
    static millisecondsToTime(duration) {
        const milliseconds = parseInt((duration % 1000) / 100)
            , seconds = parseInt((duration / 1000) % 60)
            , minutes = parseInt((duration / (1000 * 60)) % 60)
            , hours = parseInt((duration / (1000 * 60 * 60)) % 24)
            , days = parseInt((duration / (1000 * 60 * 60 * 24)));
        return {
            days,
            hours,
            minutes,
            seconds,
            milliseconds,
            formated() {
                let message = "";
                if (this.hours) {
                    message += `${this.hours} ${Utils.isPlural(this.hours) ? "horas" : "hora"}`;
                }
                if (this.minutes) {
                    message += ` ${message.length > 1 ? " e " : "" }${this.minutes} ${Utils.isPlural(this.minutes) ? "minutos" : "minuto" }`;
                }
                return message;
            }
        };
    }

    static isPlural(v) {
        return Number(v) > 1;
    }

    static planifyResponse(obj, key) {

        if (obj.constructor === Array) {
            const _res = {};
            _res[key || "_"] = obj[0];
            return _res;
        }

        const keys = Object.keys(obj);
        const _newObj = {};

        keys.map(k => {
            _newObj[k] = Utils.planifyResponse(obj[k], k);
        });
        //const _newObj = {};
        //keys.map(key => {
        //    if (key === "items") {
        //        _newObj.items = holder.items[0].item.map(item => {
        //            const itemKey = Object.keys(item);
        //            const __item = {};
        //            itemKey.map(k => __item[k] = item[k] ? item[k][0] : item[k]);
        //            return __item;
        //        });
        //    } else {
        //        _newObj[key] = holder[key][0];
        //    }
        //});
        //return _newObj;
    }

    /**
     *
     * @param phone
     * @return {{areaCode: String, number: String}}
     */
    static splitPhone(phone) {
        const _phone = String(Number(phone.replace(/\D/ig, "")));

        const areaCode = _phone.slice(0, 2);
        const number = _phone.slice(2, phone.length);
        return {areaCode, number};
    }

    static passwordToHash(password) {
        return crypto
            .createHmac("sha256", secret)
            .update(password)
            .digest('hex');
    }

    static generateReference() {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (let i = 0; i < 8; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text.toUpperCase();
    }
}


module.exports = exports = Utils;