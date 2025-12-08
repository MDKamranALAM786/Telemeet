import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import "./App.css";
import {AuthProvider} from "./contexts/AuthContext.jsx";
import LandingPage from "./pages/landing.jsx";
import Authentication from "./pages/authentication.jsx";
import VideoMeetComponent from "./pages/VideoMeet.jsx";
import HomeComponent from "./pages/home.jsx";
import HistoryComponent from "./pages/history.jsx";

export default function App() {
  return(
    <div>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage/>}/>
            <Route path="/auth" element={<Authentication/>}/>
            <Route path="/home" element={<HomeComponent/>}/>
            <Route path="/history" element={<HistoryComponent/>}/>
            <Route path="/:url" element={<VideoMeetComponent/>}/>
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
};
