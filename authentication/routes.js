"use strict";

const router = require('express').Router();
const passport = require('passport');

const database = require("../database.js")
const bcrypt = require('bcrypt');

function login(req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            next(err)
        }
        else if (!user) {
            res.status(401);
            if (info) { res.json(info); }
            else { res.json({ message: 'Erro ao fazer login.' }) }
        }
        else {
            req.login(user, function (err) {
                if (err) { next(err); }
                else { res.json({ message: 'Login efetuado com sucesso.', user }); }
            });
        }
    })(req, res, next);
}

function signup(req, res, next) {
    if (req.body.email && req.body.password) {

        const db = database.getDb()
        const users = db.collection("users")

        users.find({email: req.body.email}).toArray((err, results) => {
            if (err) { next(err); }
            else if (results.length) { res.status(409).json({ message: 'Já existe uma conta com este email.' }) }
            else {
                bcrypt.hash(req.body.password, 10, function (err, hash) {
                    if (err) { next(err); }
                    else {
                        users.insertOne({
                            email: req.body.email,
                            password: hash
                        }, function (err, response) {
                            if (err) { next(err); }
                            else { res.json({ message: 'Registo efetuado com sucesso.', user: {
                                _id: response._id,
                                email: req.body.email
                            } }); }
                        })
                    }
                });
            }
        })
    }
    else { res.status(400).json({ message: 'Campos em falta.' }); }
}

function logout(req, res) {
    req.logout();
    res.json({ message: 'Logout efetuado com sucesso' });
}

function verify(req, res) {
    if (req.user) {
        res.json({ message: 'Utilizador está logado.', user: req.user})
    }
    else {
        res.json({ message: 'Utilizador não está logado.' })
    }
}

router.post('/login', login);
router.post('/signup', signup);
router.get('/logout', logout);
router.get('/verify', verify);

module.exports = router;