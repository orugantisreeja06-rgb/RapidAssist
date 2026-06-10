const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
{
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    worker:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Worker"
    },

    booking:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Booking"
    },

    complaintText:{
        type:String,
        required:true
    },

    status:{
        type:String,
        enum:[
            "Pending",
            "Under Review",
            "Resolved"
        ],
        default:"Pending"
    }
},
{
    timestamps:true
}
);

module.exports = mongoose.model("Complaint",complaintSchema);