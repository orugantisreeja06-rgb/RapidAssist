const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
{
    receiverId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },

    receiverType:{
        type:String,
        enum:[
            "User",
            "Worker"
        ]
    },

    message:{
        type:String,
        required:true
    },

    isRead:{
        type:Boolean,
        default:false
    }
},
{
    timestamps:true
}
);

module.exports = mongoose.model("Notification",notificationSchema);