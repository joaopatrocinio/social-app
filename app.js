const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser")
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo')(session);
const app = express()
const http = require("http").createServer(app)
const io = require('socket.io')(http)
const passportSocketIo = require("passport.socketio");
const database = require("./database.js")

require('dotenv').config()

app.use(cors({ origin: 'http://localhost:8080', credentials: true }));
app.use(express.static('www'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT

const passportMongo = require('./authentication/passport-mongo');
const authenticationRoutes = require('./authentication/routes');

var options = {
    url: 'mongodb://localhost/chat'
};

const store = new MongoStore(options)

const sessionMiddleware = session({
    key: 'session_id',
    secret: process.env.SESSION_SECRET,
    store: store,
    saveUninitialized: true,
    resave: false
})

app.use(sessionMiddleware);

io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,    
    key: 'session_id',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
}));

function onAuthorizeSuccess(data, accept){
    console.log('PassportSocketIOConnected');
    accept();
}

function onAuthorizeFail(data, message, error, accept){
    if(error) throw new Error(message);
    console.log('PassportSocketIOError:', message);
    if(error) accept(new Error(message));
}

app.use(passport.initialize());
app.use(passport.session());
passportMongo(passport);

app.use('/authentication', authenticationRoutes);
app.use('/people', require("./routes/people"));

app.get("/", (req, res) => {
    res.send("Server is running.")
})

database.connectToServer((err) => {
    if (err) return console.log(err)

    console.log("DatabaseConnect")
    http.listen(port, () => console.log(`HTTPServerStart`))
    io.on('connection', client => {

        client.on("gameConnect", () => {
            console.log("GameConnect")
            client.join("gameRoom")
            const db = database.getDb()
            const game = db.collection("game")
            
            const gameStore = {
                user: client.request.user._id,
                x: 10,
                y: 10
            }

            game.insertOne(gameStore, (err, result) => {
                if (err) throw err;
                io.to("gameRoom").emit("position", gameStore)
            })
            
            client.on("leave", () => {
                client.disconnect();
            })
    
            client.on('disconnect', (reason) => {
                game.deleteOne(gameStore);
                console.log("UserDisconnect")
            });
        })

        client.on("chatConnect", () => {
            console.log("ChatConnect")
            client.join("chatRoom")
            const db = database.getDb()
            const messages = db.collection("messages")
    
            messages.find({}).toArray((err, results) => {
                if (err) throw err
                client.emit("previousMessages", results)
                console.log("SendPreviousMessages")
            })
    
            client.on('chatMessage', msg => {
                let newMessage = {
                    user: client.request.user.email || "Anon",
                    message: msg,
                }
                messages.insertOne(newMessage, (err, result) => {
                    if (err) throw err
    
                    console.log("UserSendMessage")
                    console.log("SaveMessageDB")
    
                    io.to("chatRoom").emit("chatMessage", newMessage)
                    console.log("MessageBroadcast")
                })
            })
    
            client.on("leave", () => {
                client.disconnect();
            })
    
            client.on('disconnect', (reason) => {
                console.log("UserDisconnect")
            });
        })

    })
})