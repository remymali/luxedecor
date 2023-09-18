const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique:true,
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
        type: Boolean
    },
    status:{
        type: String,
        default:false,
        required:true
    },
    created_at:
    {
        type: Date,
        required:true
    }
    // modified_at:
    // {
    //     type: Date,
    //     required:true
    // }
})

const admin = mongoose.model('admin',adminSchema)
module.exports =admin 