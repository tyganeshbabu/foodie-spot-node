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
    "unitprice":String
});
const Products = mongoose.model("products", productSchema);

mongoose.connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true });


app.use(express.json());

app.get('/products',authenticateToken, (req, res)=> {
    Products.find().then(products => {
        if (products !== null && products.length > 0) {
            res.write(JSON.stringify(products));
        } else {
            res.write("No Products found");
        }
        res.end();
    });
    
});

function authenticateToken (req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Get from BEARER TOKEN
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, user)=>{
        if(err) return res.sendStatus(403);

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