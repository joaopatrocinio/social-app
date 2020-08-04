const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
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

const passportMysql = require('./authentication/passport-mongo');
const authenticationRoutes = require('./authentication/routes');

var options = {
    url: 'mongodb://localhost/chat'
};

const store = new MongoStore(options)

const sessionMiddleware = session({
    key: 'connect.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    saveUninitialized: false,
    resave: false
})

app.use(sessionMiddleware);

io.use(passportSocketIo.authorize({       
    key: 'connect.sid',
    secret: process.env.SESSION_SECRET,
    store: store
}));

app.use(passport.initialize());
app.use(passport.session());
passportMysql(passport);



app.use('/authentication', authenticationRoutes);

app.get("/", (req, res) => {
    res.send("Server is running.")
})

database.connectToServer((err) => {
    if (err) return console.log(err)

    console.log("DatabaseConnect")
    http.listen(port, () => console.log(`HTTPServerStart`))
    io.on('connection', client => {

        console.log("UserConnect")
        
        const db = database.getDb()
        const messages = db.collection("messages")
        console.log("DatabaseUserSessionStart")

        client.on("chatConnect", () => {
            messages.find({}).toArray((err, results) => {
                if (err) throw err
                client.emit("previousMessages", results)
                console.log("SendPreviousMessages")
            })
        })

        client.on('chatMessage', msg => {
            let newMessage = {
                user: client.request.user.email,
                message: msg
            }
            messages.insertOne(newMessage, (err, result) => {
                if (err) throw err

                console.log("UserSendMessage")
                console.log("SaveMessageDB")

                io.emit("chatMessage", newMessage)
                console.log("MessageBroadcast")
            })
            
        })

        io.on('disconnect', (reason) => {
            console.log("UserDisconnect")
            db.close()
        });
    })
})