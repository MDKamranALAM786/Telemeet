import {createContext, useContext, useState} from "react";
import axios from "axios";
import httpStatus from "http-status";
import {useNavigate} from "react-router-dom";

const AuthContext = createContext({});
export { AuthContext };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const client = axios.create({baseURL : `${API_BASE_URL}/api/v1/user`});

export const AuthProvider = ({children}) => {
    const authContext = useContext(AuthContext);

    const [userData, setUserData] = useState(authContext);
    const router = useNavigate();

    const handleRegister = async (name, username, email, password) => {
        try {
            let request = await client.post("/register", {
                name : name,
                username : username,
                email : email,
                password : password
            });
            if(request.status === httpStatus.CREATED) {
                return(request.data.message);
            }
        } catch(error) {
            throw(error);
        }
    };

    const handleLogin = async (username, password) => {
        try {
            let request = await client.post("/login", {
                username : username,
                password : password
            });
            // console.log("Request : ", request);
            // console.log("Request Data : ", request.data);
            // console.log("Request Data Token : ", request.data.token);
            if(request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                router("/home");
            }
        } catch(error) {
            throw(error);
        }
    };

    const getUserHistory = async () => {
        let token = localStorage.getItem("token");
        try {
            let request = await client.post("/getAllActivity", {token : token});
            if(request.status === httpStatus.OK) {
                return(request.data.meetings);
            }
        } catch(error) {
            throw(error);
        }
    };

    const addToHistory = async (meetingCode) => {
        let token = localStorage.getItem("token");
        // console.log("Adding to history : ", meetingCode);
        try {
            let request = await client.post("/addToActivity", {
                token : token,
                meetingCode : meetingCode
            });
            if(request.status === httpStatus.CREATED) {
                return(request.data.message);
            }
        } catch(error) {
            throw(error);
        }
    };

    const data = {userData, setUserData, handleRegister, handleLogin, getUserHistory, addToHistory};

    return(
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};

