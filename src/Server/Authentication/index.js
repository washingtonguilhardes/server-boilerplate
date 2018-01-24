import Utils from "./../Utils/Utils";
import jwt from "jsonwebtoken";
import ms from "ms";

const tokenSecret = "change the premium pendrive pleases mr Sanches";

const tokenParser = req => {
    const token = req.header("authorization") || "";
    return token.replace("Bearer", '').trim() || null
};

class Authentication {

    static isExpired(token) {
        if (token === null) {
            return true;
        }
        if (!token) {
            return true;
        }

        try {
            const decode = jwt.decode(token, tokenSecret);
            if (decode === null) {
                return true;
            }
            return decode.expireOn < Date.now();
        } catch (e) {
            throw e;
        }
    }

    static decode(token) {
        try {
            if (!token) {
                return null;
            }
            return jwt.decode(token, tokenSecret);
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    static checkTokenMiddleware({blockResponse = false}) {
        return (req, res) => {
            const token = tokenParser(req);
            if (token) {
                if (Authentication.isExpired(token)) {
                    req.user = null;
                }
                if (blockResponse && req.user === null) {
                    return res.status(401).send({
                        errors: [
                            {message: "Sua sessão expirou. Faça login novamente para continuar"}
                        ]
                    });
                } else {
                    req.next();
                }
            } else if (blockResponse) {
                res.status(401).send({
                    errors: [
                        {message: "Token de acesso inválido"}
                    ]
                });
            } else {
                req.next();
            }
        }
    }

    static authMiddleware({blockResponse = true}) {
        return (req, res) => {
            const token = tokenParser(req);
            req.token = token;
            if (token) {
                req.user = Authentication.decode(token);
                if (!req.user && blockResponse) {
                    return res.status(401).send({
                        errors: [
                            {
                                name: "InvalidAuthToken",
                                message: "Token de acesso não encontrado"
                            }
                        ]
                    });
                }
            }
            if (blockResponse && !token) {
                return res.status(401).send({
                    errors: [
                        {
                            name: "InvalidAuthToken",
                            message: "Token de acesso não encontrado"
                        }
                    ]
                });
            } else {
                req.next();
            }
        };
    }

    static async getAccessToken({email, password}) {
        try {
            const user = await User.getInstance().get({email, password: Utils.passwordToHash(password)});
            if (user === null) {
                throw new Error("Usuário ou senha inválidos");
            }

            if (!Authentication.isExpired(user.token)) {
                return user;
            }

            const _user = User.getInstance().setData(user);
            const payload = {
                userId: _user.getId(),
                userDetails: _user.getDetails().itemId,
                userPermissions: _user.getPermissions(),
                timer: Date.now(),
                expireOn: Date.now() + ms('1d')
            };
            const token = jwt.sign(payload, tokenSecret, {
                expiresIn: '1d' // a day (24 hours)
            });
            const handle = await User.getInstance().update(_user.getId(), {token});
            const _access = await User.getInstance().get({_id: _user.getId()});


            _access.handle = handle;
            return _access;
        } catch (e) {
            throw  e;
        }
    }

    static async destroy({userId}) {
        try {
            return await User.getInstance().update(userId, {token: null});
        } catch (e) {
            throw e;
        }
    }

}

module.exports = exports = Authentication;