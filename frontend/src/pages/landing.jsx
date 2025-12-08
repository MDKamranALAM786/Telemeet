import { Link } from "react-router-dom";
import {useState, useEffect} from "react";

import "../App.css";

export default function LandingPage() {
    const [loggedIn, setLoggedIn] = useState();

    useEffect(() => {
        if(localStorage.getItem("token")) {
            setLoggedIn(true);
        } else {
            setLoggedIn(false);
        }
    }, []);

    return(
        <div className="landingPageContainer">
            <div className="navbar">
                <div className="nav-header">
                    <h2>Apna Video Call</h2>
                </div>
                <div className="nav-list">
                    {
                        loggedIn ?
                        <p className="nav-list-item" onClick={() => {localStorage.removeItem("token"); setLoggedIn(false);}}><Link className="auth-link">Sign Out</Link></p> :
                        <>
                            <p className="nav-list-item"><Link className="auth-link" to="/auth">Register</Link></p>
                            <div className="nav-list-item"><Link className="auth-link" to="/auth">Login</Link></div>
                        </>
                    }
                </div>
            </div>
            <div className="landingPageContent">
                <div className="content-text">
                    <p className="title"><span style={{color : "#FF9839"}}>Connect</span> with your Loved Ones</p>
                    <p className="desc">Cover a distance by apna video call</p>
                    <div role="button">
                        <Link to="/home">Get Started</Link>
                    </div>
                </div>
                <div className="content-image">
                    <img src="../../public/assets/meeting.png" alt="meeting photo"/>
                </div>
            </div>
        </div>
    );
};
