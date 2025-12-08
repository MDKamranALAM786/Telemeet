import {Schema} from "mongoose";
import mongoose from "mongoose";

const meetingSchema = new Schema({
    user_id : {
        type : String,
        required : true
    },
    meetingCode : {
        type : String,
        required : true
    },
    date : {
        type : Date,
        default : Date.now(),
        required : true
    }
});

export const Meeting = mongoose.model("Meeting", meetingSchema);
