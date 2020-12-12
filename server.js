require('dotenv').config();
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const productSchema = new Schema({
    "imgUrl":String,
    "title":String,
    "type":String,
    "unitprice": Schema.Types.Decimal128
});
const Products = mongoose.model("products", productSchema);

const userSchema = new Schema({
    "username": String,
    "password": String,
    "firstName": String,
    "lastName": String
});
const User = mongoose.model("users", userSchema);

const orderSchema = new Schema({
    "userId":  {
        "type": mongoose.Schema.Types.ObjectId,
        "ref": "users"
    },
    "orderId": Number,
    "products":[{
        "title": String,
        "unit": Number
    }],
    "createdAt":{ "type": Date, "default": Date.now },
    "total":Schema.Types.Decimal128
});
const Orders = mongoose.model("orders", orderSchema);

mongoose.connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true });


app.use(express.json());

app.get('/products',authenticateToken, (req, res)=> {
    try {
        Products.find().then(products => {
            if (products !== null && products.length > 0) {
                res.status(200).json({ status: res.statusCode, method: req.method,data: products,message: "Success" });
            } else {
                res.status(200).json({ status: res.statusCode, method: req.method,data: products,message: "No Products found" });
            }
        }).catch(err=>{
            res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500, data:err });
        });
    } catch {
        res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500 });
    }
});

app.get('/orders/:userId',authenticateToken, (req, res)=> {
    try {
        Orders.find({"userId": req.params.userId}).sort({"createdAt":-1}).then(orders => {
            if (orders !== null && orders.length > 0) {
                res.status(200).json({ status: res.statusCode, method: req.method,data: orders,message: "Success" });
            } else {
                res.status(200).json({ status: res.statusCode, method: req.method,data: orders,message: "No orders found" });
            }
        }).catch(err=>{
            res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500, data:err });
        });
    } catch {
        res.status(500).json({ status: res.statusCode, method: req.method, message: process.env.MSG_500 });
    }
});


app.post('/orders/:userId',authenticateToken, async (req, res) => {
    try {
        let order = { orderId: Math.floor(Math.random() * 1000000000), products: req.body.products, total: req.body.total, userId: mongoose.Types.ObjectId(req.params.userId)};
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

function authenticateToken (req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Get from BEARER TOKEN
    if (!token) return res.status(401).json({ status: res.statusCode, method: req.method, message: process.env.MSG_401 });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, user)=>{
        if(err) return res.status(403).json({ status: res.statusCode, method: req.method, message: process.env.MSG_403 });

        req.user = user;
        next();
    });
}

app.get('*', (req, res) => { 
    res.status(404).json({status:res.statusCode, method: req.method, message: process.env.MSG_404});
});

app.post('*', (req, res) => { 
    res.status(404).json({status:res.statusCode, method: req.method, message: process.env.MSG_404});
});

app.listen(process.env.SERVER_PORT || 8000);