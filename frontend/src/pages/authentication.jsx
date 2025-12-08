import {useState, useContext} from "react";
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Snackbar from "@mui/material/Snackbar";

import "../../public/style/authentication.css";
import {AuthContext} from "../contexts/AuthContext.jsx";

const defaultTheme = createTheme();

export default function Authentication() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const [message, setMessage] = useState();
    const [error, setError] = useState();
    const [open, setOpen] = useState(false);

    const [formState, setFormState] = useState(0); // 0 -> login , 1 -> register

    const {handleRegister, handleLogin} = useContext(AuthContext);

    let handleChange = (event) => {
        const {name, value} = event.target;
        if(name === "username") {
            setUsername(value);
        } else if(name === "password") {
            setPassword(value);
        } else if(name === "name") {
            setName(value);
        } else if(name === "email") {
            setEmail(value);
        }
    };

    let handleAuth = async () => {
        let setDefault = () => {
            setError("");
            setUsername("");
            setPassword("");
        };
        try {
            if(formState === 0) {
                // login
                let response = await handleLogin(username, password);
                setDefault();
            } else {
                // register
                let response = await handleRegister(name, username, email, password);
                console.log(response);
                setMessage(response);
                setOpen(true);
                setEmail("");
                setName("");
                setDefault();
                setFormState(0);
            }
        } catch(error) {
            let message = error.response.data.message;
            setError(message);
        }
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            <Grid container component="main">
                <CssBaseline />
                <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square className="login-container">
                    <Box sx={{my: 8, mx: 4, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                            <LockOutlinedIcon />
                        </Avatar>
                        <div>
                            <Button variant={formState === 0 ? "contained" : "text"} onClick={() => {setFormState(0)}}>Sign In</Button>
                            <Button variant={formState === 1 ? "contained" : "text"} onClick={() => {setFormState(1)}}>Sign Up</Button>
                        </div>
                        <Box component="form" noValidate sx={{ mt: 1 }}>
                            {formState === 1 && <>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="name"
                                    label="name"
                                    name="name"
                                    value={name}
                                    onChange={handleChange}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="email"
                                    label="email"
                                    name="email"
                                    value={email}
                                    onChange={handleChange}
                                /> </>
                            }
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="username"
                                name="username"
                                value={username}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                value={password}
                                onChange={handleChange}
                            />
                            <p style={{color : "red"}}>{error}</p>
                            <Button
                                type="button"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                onClick={handleAuth}
                            >
                                {formState === 0 ? "Login" : "Register"}
                            </Button>
                        </Box>
                    </Box>
                </Grid>
            </Grid>
            <Snackbar open={open} autoHideDuration={4000} message={message} onClose={() => (setOpen(false), setMessage(""))}/>
        </ThemeProvider>
    );
}
