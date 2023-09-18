const mongoose = require("mongoose");

const productModel = require('./products');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        //unique:true,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
   
    password: {
        type: String,
        required: true
    },
    is_verified:{
        type: Boolean,
        default:false,
        required: true
    },
    status:{
        type: Boolean,
        default:false,
        required:true
    },
    created_at:
    {
        type: Date,
        required:true
    },
    cart:  [{
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: productModel
            },
            prod_ID: {
                type: String,
              },
            p_name:{
                type: String,
            },
            quantity: {
                type: Number,
                default: 1
            },
            productStock: {
                type: Number,
            
              },
            originalprice: {
                type: Number,
            },
            price: {
                type: Number,
                require: true
            },
            totalPrice:{
                type:Number,
            },
            couponDisc:{
                type:Number,
            },
            disc_Amount:{
                type: String,
                require: true,
              }
        }]
    ,
    wishlist: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: productModel
        }
    }],
    walletBalance:{
        type:Number,
        default:0
    },
    wallethistory: [
        {   
            process:{
                type: String // Payment or TopUp or Refund
            },  
            amount: {
                type:Number
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ],
    referralCode: {
        type: String,
        unique: true, 
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    address: [{
        name: {
            type: String,
            required: true
        },
        houseName: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        phone: {
            type: Number,
            required: true
        },
        postalCode: {
            type: Number,
            required: true
        }
    }]
}, { timestamps: true });
    


const user = mongoose.model('user',userSchema)
module.exports =user 