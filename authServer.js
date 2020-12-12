require('dotenv').config()

const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')

const bcrypt = require('bcrypt');
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const userSchema = new Schema({
    "username": String,
    "password": String,
    "firstName": String,
    "lastName": String
});
const User = mongoose.model("users", userSchema);

const tokenSchema = new Schema({
    "token":String,
    "createdAt": Date
});
const Token = mongoose.model("tokens", tokenSchema);

mongoose.connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json())

let refreshTokens = []

app.get('/users', (req, res) => {
    User.find({}, 'firstName lastName username').then(users => {
        if (users !== null && users.length > 0) {
            res.write(JSON.stringify(users));
        } else {
            res.write("No Users found");
        }
        res.end();
    });
});


app.post('/users', async (req, res) => {
    console.log('inside');
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        let user = { username: req.body.username, password: hashedPassword, firstName: req.body.firstName, lastName: req.body.lastName };
        let userObj = new User(user);
        await userObj.save()
            .then(item => {
                res.status(200).json({ status: res.statusCode, method: req.method, message: "User Saved to Database" });
            })
            .catch(err => {
                res.status(400).json({ status: res.statusCode, method: req.method, message: err });
            });
    } catch {
        res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500 });
    }
})

app.post('/auth/token', (req, res) => {
    const refreshToken = req.body.token;
    if (refreshToken == null) return res.status(401).json({ status: res.statusCode, method: req.method, message: process.env.MSG_401 });
    // if (!refreshTokens.includes(refreshToken)) return res.status(403).json({ status: res.statusCode, method: req.method, message: process.env.MSG_403 });
    // jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    //     if (err) return res.status(403).json({ status: res.statusCode, method: req.method, message: process.env.MSG_403 });
    //     const accessToken = generateAccessToken({ name: user.name })
    //     res.json({ status: res.statusCode, method: req.method, message: 'Success', accessToken: accessToken });
    // })
    Token.findOne({"token":refreshToken}).then((result)=>{
        if(!result) return res.status(403).json({ status: res.statusCode, method: req.method, message: process.env.MSG_403 });
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) return res.status(403).json({ status: res.statusCode, method: req.method, message: process.env.MSG_403 });
            const accessToken = generateAccessToken({ name: user.name })
            res.json({ status: res.statusCode, method: req.method, message: 'Success', accessToken: accessToken });
        })
    });
})

app.delete('/auth/logout', (req, res) => {
    Token.deleteOne({"token":req.body.token}).then(result=>{
        
    });
    res.status(204).json({ status: res.statusCode, method: req.method, message: 'Deleted Successfully' });
})

app.post('/auth/login', async (req, res) => {
    await User.findOne({"username": req.body.username}).then(user => {
        if (user !== null) {
            bcrypt.compare(req.body.password, user.password).then(result=>{
                if (!result) return res.status(401).json({ status: res.statusCode, method: req.method, message: process.env.MSG_401 });
                
                const username = req.body.username;
                const user = { name: username }
                const accessToken = generateAccessToken(user);
                const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
                // refreshTokens.push(refreshToken);
                saveRefreshTokenToDb(refreshToken);
                const userDetails = {username: username, firstname: user.firstName, lastname: user.lastName};
                res.json({ user: userDetails, status: res.statusCode, method: req.method, accessToken: accessToken, refreshToken: refreshToken, message: 'Success' });
            });
        } else {
            res.status(401).json({ status: res.statusCode, method: req.method, message: process.env.MSG_401 });
        }
    }).catch(err=> res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500 }));
});

function saveRefreshTokenToDb(refreshToken) {
    //db.tokens.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 10 });
    let token = {'token':refreshToken,'createdAt': new Date()};
    let tokenObj = new Token(token);
    tokenObj.save()
        .then(item => {
            return true;
        })
        .catch(err => {
            return false;
        });
}

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: 20 })
}

app.get('*', (req, res) => {
    res.status(404).json({ status: res.statusCode, method: req.method, message: process.env.MSG_404 });
});

app.post('*', (req, res) => {
    res.status(404).json({ status: res.statusCode, method: req.method, message: process.env.MSG_404 });
});

app.listen(process.env.AUTH_PORT || 9000);