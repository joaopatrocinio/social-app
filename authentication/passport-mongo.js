"use strict";

const LocalStrategy = require('passport-local').Strategy;
const ObjectId = require('mongodb').ObjectId; 
const database = require("../database.js")
const bcrypt = require('bcrypt');

module.exports = function (passport) {
    passport.serializeUser(function (user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function (id, done) {
        const db = database.getDb()
        const users = db.collection("users")
        console.log(id)
        users.findOne(ObjectId(id), (err, results) => {
            if (err) done(err)
            console.log(results)
            delete results._id;
            delete results.password;
            done(null, results);
        })
    });

    passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    function (req, email, password, done) {

        const db = database.getDb()
        const users = db.collection("users")

        users.findOne({email: email}, (err, results) => {
            if (err) { done(err); }
            else if (!results) { done(null, false, { message: 'Utilizador não encontrado.' }); }
            else {
                bcrypt.compare(password, results.password, function (err, result) {
                    if (err) { done(err); }
                    else if (result) {
                        delete results.password;
                        done(null, results);
                    }
                    else { done(null, false, { message: 'Password errada.' }); }
                });
            }
        })
    }));
};