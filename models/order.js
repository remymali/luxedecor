const mongoose = require("mongoose");
const userModel = require('./user');


const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: userModel
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: userModel
    },
    status: {
        type: String,
        default: "Processing"
    },
    orderCancleRequest: {
        type: Boolean,
        default: false
    },
    orderReturnRequest: {
        type: Boolean,
        default: false
    },
    products: [{
        productID: {
            type: String,
          },
        p_name: {
            type: String,
            require: true
        },
        realPrice: {
            type: String,
            require: true
        },
        price: {
            type: Number
        },
        description: {
            type: String,
            require: true
        },
        image: [{
            type: String,
            require: true
        }],
        category: [{
            type: String,
            require: true
        }],
        productStock: {
            type: Number,
        },   
        productOffer: {
            type: String,
            require: true
        },
        quantity: {
            type: Number
        },
        productStatus:{
            type:Boolean,   
            default:true
        }
    }],
    payment: {
        method: {
            type: String,
        },
        amount: {
            type: String,
        }     
    },
    // proCartDetail: {
    //     type: Array
    // },
    // cartProduct: {
    //     type: Array
    // },
    createdAt: {
        type: Date,
        immutable: true,
        default: () => Date.now()
    },
    expectedDelivery: {
        type: Date,
    }
});

const orderModel = mongoose.model('order', orderSchema);
module.exports = orderModel;
