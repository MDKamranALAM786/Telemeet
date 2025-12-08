import {useState, useEffect, useContext} from "react";
import {useNavigate} from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import IconButton from "@mui/material/IconButton";

import {AuthContext} from "../contexts/AuthContext.jsx";

export default function HistoryComponent() {
    const [message, setMessage] = useState("");
    const [open, setOpen] = useState(false);

    const [historyData, setHistoryData] = useState([]);
    const router = useNavigate();

    const {getUserHistory} = useContext(AuthContext);

    useEffect(() => {
        let fetchHistory = async () => {
            try {
                let meetings = await getUserHistory();
                setHistoryData(meetings);
            } catch(error) {
                <Snackbar open={open} autoHideDuration={4000} message={message} onClose={() => (setOpen(false), setMessage(""))}/>
            }
        };
        fetchHistory();
    }, []);

    return(
        <div className="history-component">
            <div className="home-icon">
                <IconButton onClick={() => (router("/home"))}>
                    <HomeIcon/>
                </IconButton>
            </div>
            <div className="history-page">{
                historyData.length === 0 ? (
                    <Typography variant="h5" sx={{mt: 4}}>
                        No meeting history found.
                    </Typography>
                ) : (
                    historyData.map((meeting, index) => (
                        <Card key={index} sx={{ minWidth: 275, mb: 2 }}>
                            <CardContent>
                                <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                                    Meeting Code: {meeting.meetingCode}
                                </Typography>
                                <Typography variant="body2">
                                    Joined At: {new Date(meeting.date).toLocaleString()}
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button size="small" onClick={() => router(`/${meeting.meetingCode}`)}>Join Meeting</Button>
                            </CardActions>
                        </Card>
                    ))
                )
            }</div>
        </div>
    );
}
