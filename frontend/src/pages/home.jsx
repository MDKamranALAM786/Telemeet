import {useState, useContext} from "react";
import {useNavigate} from "react-router-dom";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import RestoreIcon from "@mui/icons-material/Restore";
import Button from "@mui/material/Button";

import "../../public/style/home.css";
import withAuth from "../utils/withAuth.jsx";
import {AuthContext} from "../contexts/AuthContext.jsx";

function HomeComponent() {
    const router = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const {addToHistory} = useContext(AuthContext);

    const handleJoinMeeting = async () => {
        await addToHistory(meetingCode);
        router(`/${meetingCode}`);
    };
    const handleLogout = () => {
        localStorage.removeItem("token");
        router("/auth");
    };
    const handleShowHistory = () => {
        router("/history");
    };

    return(
        <div className="home-page">
            <div className="navbar">
                <div className="title">
                    <h2>Apna College</h2>
                </div>

                <div className="options">
                    <IconButton onClick={handleShowHistory}>
                        <RestoreIcon/>
                        <p>History</p>
                    </IconButton>

                    <Button onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
            </div>
            <div className="go-to-meeting">
                <div className="left-panel">
                    <p className="meeting-desc">Connect to your loved one's</p>
                    <div className="meeting-details">
                        <TextField variant="outlined" label="Meeting Code" value={meetingCode} onChange={(event) => (setMeetingCode(event.target.value))}/>
                        <Button variant="contained" onClick={handleJoinMeeting}>Join Meeting</Button>
                    </div>
                </div>
                <div className="right-panel">
                    <img src="../../public/assets/video_call.png" alt="video call" />
                </div>
            </div>
        </div>
    );
}

export default withAuth(HomeComponent);
