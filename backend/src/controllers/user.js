import bcrypt from "bcrypt";
import httpStatus from "http-status";
import crypto from "crypto";

import {User} from "../models/user.js";
import {Meeting} from "../models/meeting.js";

export const loginUser = async (req, res) => {
    try {
        let {username, password} = req.body;
        if(!username || !password) {
            return(res.status(httpStatus.BAD_REQUEST).json({message : "Missing credentials"}));
        }
        let user = await User.findOne({username});
        if(!user) {
            return(res.status(httpStatus.NOT_FOUND).json({message : "User doesn't exists"}));
        }
        let validPass = await bcrypt.compare(password, user.password);
        if(validPass) {
            let token = crypto.randomBytes(20).toString("hex");
            user.token = token;
            await user.save();
            res.status(httpStatus.OK).json({
                message : "User logged in successfully",
                token : token
            });
        } else {
            res.status(httpStatus.UNAUTHORIZED).json({message : "Invalid credentials"});
        }
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message : `Error : ${error.message}`});
    }
};

export const registerUser = async (req, res) => {
    try {
        let {name, username, email, password} = req.body;
        let existingUser = await User.findOne({username});
        if(existingUser) {
            return(res.status(httpStatus.FOUND).json({message : "User already exisits"}));
        }
        const hash = await bcrypt.hash(password, 10);
        const newUser = new User({
            name : name,
            username : username,
            email : email,
            password : hash
        });
        let result = await newUser.save();
        console.log(`Registered User : ${result}`);
        res.status(httpStatus.CREATED).json({message : "User Registered"});
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: error.message});
    }
};

export const getUserHistory = async (req, res) => {
    const {token} = req.body;
    try {
        let user = await User.findOne({token : token});
        let meetings = await Meeting.find({user_id : user.username});
        res.status(httpStatus.OK).json({meetings : meetings});
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: error.message});
    }
};

export const addToHistory = async (req, res) => {
    const {token, meetingCode} = req.body;
    // console.log("Request to add to history received");
    // console.log(req.body);
    // console.log(`Token : ${token}, Meeting Code : ${meetingCode}`);
    try {
        let user = await User.findOne({token : token});
        // console.log(`User found : ${user}`);
        let newMeeting = new Meeting({
            user_id : user.username,
            meetingCode : meetingCode,
        });
        await newMeeting.save();
        // console.log(`Added Meeting to history : ${newMeeting}`);
        res.status(httpStatus.CREATED).json({message: "Meeting added to history"});
    } catch(error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: error.message});
    }
};
