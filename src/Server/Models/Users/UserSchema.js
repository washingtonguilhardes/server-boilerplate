export default {
    email: {type: String, required: [true, "Informe um email"]},
    login: {type: String},
    password: {type: String, required: [true, "Informe uma senha"]},
    token: {type: String}
};