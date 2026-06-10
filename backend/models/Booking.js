const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
{
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    worker:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Worker",
        required:true
    },

    serviceType:{
        type:String,
        required:true
    },

    description:{
        type:String
    },

    bookingDate:{
        type:Date,
        default:Date.now
    },

    address:{
        type:String,
        required:true
    },

    status:{
        type:String,
        enum:[
            "Pending",
            "Accepted",
            "Rejected",
            "Completed"
        ],
        default:"Pending"
    }
},
{
    timestamps:true
}
);

module.exports = mongoose.model("Booking",bookingSchema);