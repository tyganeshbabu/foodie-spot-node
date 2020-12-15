require('dotenv').config()

const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')

const bcrypt = require('bcrypt');
const mongoose = require("mongoose");

const cors = require('cors');

app.use(cors());

const Schema = mongoose.Schema;
const userSchema = new Schema({
    "username": String,
    "password": String,
    "firstName": String,
    "lastName": String
});
const User = mongoose.model("users", userSchema);

// const tokenSchema = new Schema({
//     "token": String,
//     "createdAt": Date
// });
// const Token = mongoose.model("tokens", tokenSchema);

const productSchema = new Schema({
    "imgUrl": String,
    "title": String,
    "type": String,
    "unitprice": Schema.Types.Decimal128
});
const Products = mongoose.model("products", productSchema);

const orderSchema = new Schema({
    "userId": {
        "type": mongoose.Schema.Types.ObjectId,
        "ref": "users"
    },
    "orderId": Number,
    "products": [{
        "title": String,
        "unit": Number
    }],
    "createdAt": { "type": Date, "default": Date.now },
    "total": Schema.Types.Decimal128
});
const Orders = mongoose.model("orders", orderSchema);

mongoose.connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json())

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

// app.post('/auth/token', (req, res) => {
//     const refreshToken = req.body.token;
//     if (refreshToken == null) return res.status(401).json({ status: res.statusCode, method: req.method, message: process.env.MSG_401 });
//     Token.findOne({ "token": refreshToken }).then((result) => {
//         if (!result) return res.status(403).json({ status: res.statusCode, method: req.method, message: process.env.MSG_403 });
//         jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
//             if (err) return res.status(403).json({ status: res.statusCode, method: req.method, message: process.env.MSG_403 });
//             const accessToken = generateAccessToken({ name: user.name })
//             res.json({ status: res.statusCode, method: req.method, message: 'Success', accessToken: accessToken });
//         })
//     });
// })

// app.delete('/auth/logout', (req, res) => {
//     Token.deleteOne({ "token": req.body.token }).then(result => {

//     });
//     res.status(204).json({ status: res.statusCode, method: req.method, message: 'Deleted Successfully' });
// })

app.post('/auth/login', async (req, res) => {
    await User.findOne({ "username": req.body.username }).then(user => {
        if (user !== null) {
            bcrypt.compare(req.body.password, user.password).then(result => {
                if (!result) return res.status(401).json({ status: res.statusCode, method: req.method, message: process.env.MSG_401 });
                const username = req.body.username;
                const userdet = { name: username, id: user._id }
                const accessToken = generateAccessToken(userdet);
                const userDetails = { username: user.username, firstname: user.firstName, lastname: user.lastName, id: user.id };
                res.json({ user: userDetails, accessToken: accessToken, message: 'Success' });
            })
        } else {
            res.status(401).json({ status: res.statusCode, method: req.method, message: process.env.MSG_401 });
        }
    }).catch(err => res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500 }));
});


app.get('/products', authenticateToken, (req, res) => {
    try {
        Products.find().then(products => {
            if (products !== null && products.length > 0) {
                res.status(200).json({ status: res.statusCode, method: req.method, data: products, message: "Success" });
            } else {
                res.status(200).json({ status: res.statusCode, method: req.method, data: products, message: "No Products found" });
            }
        }).catch(err => {
            res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500, data: err });
        });
    } catch {
        res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500 });
    }
});

app.get('/orders/:userId', authenticateToken, (req, res) => {
    try {
        Orders.find({ "userId": req.params.userId }).sort({ "createdAt": -1 }).then(orders => {
            if (orders !== null && orders.length > 0) {
                let orderData = orders.map(item => {
                    // return {
                    //     total: parseFloat(item.total)
                    // }
                    // console.log(parseFloat(item.total));
                    // item['total'] = 9000;
                    // console.log(item);
                    if (item.total) {
                        item.total = item.total.toString();
                    } else {
                        item.total = 0;
                    }
                    return item;
                });
                // console.log(orderData);
                res.status(200).json({ status: res.statusCode, method: req.method, data: orderData, message: "Success" });
            } else {
                res.status(200).json({ status: res.statusCode, method: req.method, data: orders, message: "No orders found" });
            }
        }).catch(err => {
            res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500, data: err });
        });
    } catch {
        res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500 });
    }
});


app.post('/orders/:userId', authenticateToken, async (req, res) => {
    try {
        let order = { orderId: Math.floor(Math.random() * 1000000000), products: req.body.products, total: req.body.total, userId: mongoose.Types.ObjectId(req.params.userId) };
        let orderObj = new Orders(order);
        await orderObj.save()
            .then(item => {
                res.status(200).json({ status: res.statusCode, method: req.method, message: "Order Saved to Database" });
            })
            .catch(err => {
                res.status(400).json({ status: res.statusCode, method: req.method, message: err });
            });
    } catch {
        res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500 });
    }
})

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Get from BEARER TOKEN
    if (!token) return res.status(401).json({ status: res.statusCode, method: req.method, message: process.env.MSG_401 });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ status: res.statusCode, method: req.method, message: process.env.MSG_403 });

        req.user = user;
        next();
    });
}

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: parseInt(process.env.TOKEN_EXPIRY_TIME) })
}

app.get('*', (req, res) => {
    res.status(404).json({ status: res.statusCode, method: req.method, message: process.env.MSG_404 });
});

app.post('*', (req, res) => {
    res.status(404).json({ status: res.statusCode, method: req.method, message: process.env.MSG_404 });
});

app.listen(process.env.AUTH_PORT || 9000);