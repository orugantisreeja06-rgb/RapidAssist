const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
{
    name:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true,
        unique:true
    },

    phone:{
        type:String,
        required:true
    },

    password:{
        type:String,
        required:true
    },

    skill:{
        type:String,
        required:true
    },

    experience:{
        type:Number,
        default:0
    },

    serviceCharge:{
        type:Number,
        required:true
    },

    availability:{
        type:Boolean,
        default:true
    },

    location:{
        address:String,
        latitude:Number,
        longitude:Number
    },

    rating:{
        type:Number,
        default:0
    },

    totalReviews:{
        type:Number,
        default:0
    },

    profileImage:{
        type:String
    }
},
{
    timestamps:true
}
);

module.exports = mongoose.model("Worker",workerSchema);