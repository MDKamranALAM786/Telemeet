import {useRef, useState, useEffect} from "react";
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from "@mui/material/IconButton";
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import Badge from "@mui/material/Badge";
import io from "socket.io-client";

import "../../public/style/VideoMeet.css";
import withAuth from "../utils/withAuth.jsx";

const server_url = import.meta.env.VITE_SOCKET_SERVER_URL || "http://localhost:3000";

const connections = {};

const peerConfigConnections = {
    iceServers : [
        {urls : "stun:stun.l.google.com:19302"}
    ]
};

// let no = 1;

function VideoMeetComponent() {
    let socketRef = useRef();
    let socketIdRef = useRef();

    const videoRef = useRef([]);
    let localVideoRef = useRef();
    let [videos, setVideos] = useState([]);

    let [video, setVideo] = useState();
    let [audio, setAudio] = useState();
    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);

    let [screenSharing, setScreenSharing] = useState();
    let [screenSharingAvailable, setScreenSharingAvailable] = useState(true);

    let [showModal, setShowModal] = useState(false);

    let [message, setMessage] = useState("");
    let [chatMessages, setChatMessages] = useState([]);
    let [newMessages, setNewMessages] = useState(0);

    let [username, setUsername] = useState("");
    let [askForUsername, setAskForUsername] = useState(true);

    const getPermissions = async () => {
        try {
            let videoPermission = await navigator.mediaDevices.getUserMedia({video : true});
            if(videoPermission) {
                setVideoAvailable(true);
            } else {
                setVideoAvailable(false);
            }
            let audioPermission = await navigator.mediaDevices.getUserMedia({audio : true});
            if(audioPermission) {
                setAudioAvailable(true);
            } else {
                setAudioAvailable(false);
            }
            if(navigator.mediaDevices.getDisplayMedia) {
                setScreenSharingAvailable(true);
            } else {
                setScreenSharingAvailable(false);
            }

            if(videoAvailable || audioAvailable) {
                let userMediaStream = await navigator.mediaDevices.getUserMedia({video : videoAvailable, audio : audioAvailable});
                if(userMediaStream) {
                    window.localStream = userMediaStream;
                    if(localVideoRef.current) {
                        localVideoRef.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch(error) {
            console.log("Error in getting media permissions : ", error);
        }
    };
    useEffect(() => {
        getPermissions();
    });

    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach((track) => (track.stop()));
            localVideoRef.current.srcObject = null;
        } catch(err) {
            console.log("Error in setting user media : ", err);
        }

        // window.localStream.getVideoTracks().forEach((track) => (track.stop()));

        localVideoRef.current.srcObject = stream;
        window.localStream = stream;
    
        for(let peerId in connections) {
            if(peerId !== socketIdRef.current) {
                connections[peerId].addStream(window.localStream);
                connections[peerId].createOffer()
                    .then((offerDescription) => (
                        connections[peerId].setLocalDescription(offerDescription)
                    ))
                    .then(() => {
                        socketRef.current.emit("signal", peerId, JSON.stringify({"sdp" : connections[peerId].localDescription}));
                    })
                    .catch((err) => {
                        console.log("Error : ", err);
                    });
            }
        };

        stream.getTracks().forEach((track) => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoRef.current.srcObject.getTracks();
                tracks.forEach((track) => (track.stop()));
            } catch(err) {
                console.log("Error : ", err);
            }

            let blackSilence = (...args) => new MediaStream([blackScreen(...args), silence()]);
            window.localStream = blackSilence();
            localVideoRef.current.srcObject = window.localStream;

            for(let peerId in connections) {
                if(peerId !== socketIdRef.current) {
                    connections[peerId].addStream(window.localStream);
                    connections[peerId].createOffer()
                        .then((offerDescription) => (
                            connections[peerId].setLocalDescription(offerDescription)
                        ))
                        .then(() => {
                            socketRef.current.emit("signal", peerId, JSON.stringify({"sdp" : connections[peerId].localDescription}));
                        })
                        .catch((err) => {
                            console.log("Error : ", err);
                        })
                }
            };
        });
    };

    let silence = () => {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return(Object.assign(dst.stream.getAudioTracks()[0], {enabled : false}));
    };
    let blackScreen = ({width = 640, height = 480} = {}) => {
        const canvas = Object.assign(document.createElement("canvas"), {width, height});
        canvas.getContext("2d").fillRect(0, 0, width, height);
        const stream = canvas.captureStream();
        return(Object.assign(stream.getVideoTracks()[0], {enabled : false}));
    };

    let getUserMedia = () => {
        if((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({video : video, audio : audio})
                .then(getUserMediaSuccess)
                .catch((error) => {console.log("Error in getting user media : ", error);});
        } else {
            try {
                let tracks = localVideoRef.current.srcObject.getTracks();
                tracks.forEach((track) => {track.stop();});
            } catch(error) {
                console.log("Error in stopping media tracks : ", error);
            }
        }
    };
    useEffect(() => {
        if(video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [video, audio]);

    let gotMessageFromServer = (fromId, message) => {
        const signal = JSON.parse(message);
        if(fromId !== socketIdRef.current) {
            try {
                if(signal.ice) {
                    connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice))
                        .catch((err) => {
                            console.log("Error in establishing ice candidate : ", err);
                        });
                }
                if(signal.sdp) {
                    // signal.sdp.no = no;
                    // no = no + 1;
                    // console.log(signal.sdp);
                    const desc = new RTCSessionDescription(signal.sdp);
                    if(signal.sdp.type === "offer") {
                        connections[fromId].setRemoteDescription(desc)
                            .then(() => (
                                connections[fromId].createAnswer()
                            ))
                            .then((ansDescription) => (
                                connections[fromId].setLocalDescription(ansDescription)
                            ))
                            .then(() => {
                                socketRef.current.emit("signal", fromId, JSON.stringify({"sdp" : connections[fromId].localDescription}));
                            })
                            .catch((err) => {
                                console.log("Error in handling offer from peer : ", err);
                            })
                    } else if(signal.sdp.type === "answer") {
                        connections[fromId].setRemoteDescription(desc)
                            .catch((err) => {
                                console.log("Error in handling answer from peer", err);
                            });
                    }
                }
            } catch(err) {
                console.log("Some Error : ", err);
            }
        }
    };
    let addMessageToChat = (message, sender, fromId) => {
        setChatMessages((prevChatMessages) => {
            let updatedMessages = [...prevChatMessages, {"message" : message, "sender" : sender, "senderId" : fromId}];
            return(updatedMessages);
        });
        if(fromId !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => (prevNewMessages + 1));
        } else {
            setNewMessages(0);
        }
    };
    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, {secure : false});

        socketRef.current.on("signal", gotMessageFromServer);
        socketRef.current.on("chat-message", addMessageToChat);
        socketRef.current.on("user-connected", (newUserId, clients) => {
            clients.forEach((existingUserId) => {
                connections[existingUserId] = new RTCPeerConnection(peerConfigConnections);
                connections[existingUserId].onicecandidate = (event) => {
                    if(event.candidate) {
                        socketRef.current.emit("signal", existingUserId, JSON.stringify({"ice" : event.candidate}));
                    }
                };
                connections[existingUserId].onaddstream = (event) => {
                    let videoExists = videoRef.current.find((video) => (video.socketId === existingUserId));
                    if(videoExists) {
                        setVideos((videos) => {
                            let updatedVideos = videos.map((video) => ((video.socketId === existingUserId) ? {...video, stream : event.stream} : video));
                            videoRef.current = updatedVideos;
                            return(updatedVideos);
                        });
                    } else {
                        let newVideo = {
                            socketId : existingUserId,
                            stream : event.stream,
                            autoplay : true,
                            playsinline : true
                        };
                        setVideos((videos) => {
                            let updatedVideos = [...videos, newVideo];
                            videoRef.current = updatedVideos;
                            return(updatedVideos);
                        });
                    }
                };

                // if(window.localStream !== undefined && window.localStream !== null) {
                //     connections[existingUserId].addStream(window.localStream);
                // } else {
                //     let blackSilence = (...args) => new MediaStream([blackScreen(...args), silence()]);
                //     window.localStream = blackSilence();
                //     connections[existingUserId].addStream(window.localStream);
                // }
            });

            if(window.localStream === undefined || window.localStream === null) {
                let blackSilence = (...args) => new MediaStream([blackScreen(...args), silence()]);
                window.localStream = blackSilence();
            }
            clients.forEach((existingUserId) => {
                connections[existingUserId].addStream(window.localStream);
            });

            if(newUserId === socketIdRef.current) {
                for(let clientId in connections) {
                    if(clientId === socketIdRef.current) continue;
                    // try {
                    //     connections[clientId].addStream(window.localStream);
                    // } catch(error) {
                    //     console.log("Error in adding stream : ", error);
                    // }
                    connections[clientId].createOffer()
                        .then((offerDescription) => {
                            return(connections[clientId].setLocalDescription(offerDescription));
                        })
                        .then(() => {
                            socketRef.current.emit("signal", clientId, JSON.stringify({"sdp" : connections[clientId].localDescription}));
                        })
                        .catch((error) => {
                            console.log("Error in creating offer : ", error);
                        });
                }
            }
        });
        socketRef.current.on("user-disconnected", (userId) => {
            setVideos((videos) => (
                videos.filter((current) => (current.socketId !== userId))
            ));
            if(connections[userId]) {
                try {
                    connections[userId].close();
                } catch(error) {
                    console.log("Error in closing peer RTC connection : ", error);
                }
                delete connections[userId];
            }
        });

        socketRef.current.on("connection-success", (socketId) => {
            socketIdRef.current = socketId;
            socketRef.current.emit("join-call", window.location.href);
        });
    };
    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    let handleVideo = () => {
        setVideo(!video);
    };
    let handleAudio = () => {
        setAudio(!audio);
    };

    let connect = () => {
        setAskForUsername(false);
        getMedia();
    };

    let getDisplayMediaSuccess = (stream) => {
        try {
            window.localStream.getVideoTracks().forEach((track) => (track.stop()));
        } catch(err) {
            console.log("Error in setting display media : ", err);
        }

        window.localStream = stream;
        localVideoRef.current.srcObject = stream;

        for(let peerId in connections) {
            if(peerId === socketIdRef.current) continue;
            connections[peerId].addStream(window.localStream);
            connections[peerId].createOffer()
                .then((offerDescription) => (
                    connections[peerId].setLocalDescription(offerDescription)
                ))
                .then(() => {
                    socketRef.current.emit("signal", peerId, JSON.stringify({"sdp" : connections[peerId].localDescription}));
                })
                .catch((err) => {
                    console.log("Error : ", err);
                });
        }

        stream.getTracks().forEach((track) => track.onended = () => {
            setScreenSharing(false);

            try {
                let tracks = localVideoRef.current.srcObject.getTracks();
                tracks.forEach((track) => (track.stop()));
            } catch(err) {
                console.log("Error : ", err);
            }

            let blackSilence = (...args) => new MediaStream([blackScreen(...args), silence()]);
            window.localStream = blackSilence();
            localVideoRef.current.srcObject = window.localStream;

            getUserMedia();
        });
    };
    let getDisplayMedia = () => {
        if(screenSharing) {
            if(navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({video : true, audio : true})
                    .then(getDisplayMediaSuccess)
                    .catch((error) => {
                        console.log("Error in getting display media : ", error);
                    });
            }
        }
    };
    useEffect(() => {
        if(screenSharing !== undefined) {
            getDisplayMedia();
        }
    }, [screenSharing]);
    let handleScreenSharing = () => {
        setScreenSharing(!screenSharing);
    };
    // console.log("Screen Sharing :", screenSharing);

    // if(video == false) {
    //     let ownVideoElement = document.querySelector(".meetUserVideo");
    //     ownVideoElement.addClassName("video-off");
    // } else {
    //     let ownVideoElement = document.querySelector(".meetUserVideo");
    //     ownVideoElement.removeClassName("video-off");
    // }
    // const ownVideoElement = document.querySelector(".meetUserVideo");
    // if (ownVideoElement) {
    //   if (video) ownVideoElement.classList.remove("video-off");
    //   else ownVideoElement.classList.add("video-off");
    // }

    let onChatBtnClick = () => {
        setShowModal(!showModal);
        setNewMessages(0);
    };

    let sendMessage = () => {
        socketRef.current.emit("chat-message", message, username);
        setMessage("");
    };

    let handleEndCall = () => {
        try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => {
                track.stop();
            });
        } catch(err) {
            console.log("Error in ending call : ", err);
        }
        setAskForUsername(true);
        window.location.href = "/";
        // socketRef.current.emit("disconnect");
    };

    const style = {color : "white"};

    return(
        <div>
            {
                askForUsername ?
                <div>
                    <p>Enter into lobby</p>
                    <TextField id="outlined-basic" label="enter username" variant="outlined" value={username} onChange={(event) => (setUsername(event.target.value))}/>
                    <Button variant="contained" onClick={connect}>Connect</Button>
                    <div>
                        <video ref={localVideoRef} autoPlay muted></video>
                    </div>
                </div> :
                <div className="meetVideoContainer">
                    {
                        showModal ?
                        <div className="chat-room">
                            <div className="chat-container">
                                <h2>Chat Room</h2>
                                <div className="chat-messages">
                                    <ul>
                                        {
                                            chatMessages.map((chatMessage, index) => (
                                                <li key={index}>
                                                    {chatMessage.senderId === socketIdRef.current ? <b>Me</b> : <b>{chatMessage.sender}</b>} : {chatMessage.message}
                                                </li>
                                            ))
                                        }
                                    </ul>
                                </div>
                                <div className="chatting-area">
                                    <TextField id="standard-basic" label="enter chat message" variant="standard" value={message} onChange={(event) => (setMessage(event.target.value))}/>
                                    <Button style={{marginTop : "10px"}} variant="contained" onClick={sendMessage}>Send</Button>
                                </div>
                            </div>
                        </div> :
                        null
                    }

                    <div className="button-container">
                        <IconButton style={style} onClick={handleVideo}>
                            {(video === true) ? <VideocamIcon/> : <VideocamOffIcon/>}
                        </IconButton>
                        <IconButton style={{color : "red"}} onClick={handleEndCall}>
                            <CallEndIcon/>
                        </IconButton>
                        <IconButton style={style} onClick={handleAudio}>
                            {(audio === true) ? <MicIcon/> : <MicOffIcon/>}
                        </IconButton>
                        <IconButton style={style} onClick={handleScreenSharing}>
                            {(screenSharing === true) ? <StopScreenShareIcon/> : <ScreenShareIcon/>}
                        </IconButton>
                        <Badge badgeContent={newMessages} max={999} color="secondary">
                            <IconButton style={{color : "white"}} onClick={onChatBtnClick}>
                                <ChatIcon/>
                            </IconButton>
                        </Badge>
                    </div>

                    {/* {(video === true) ? <video className="meetUserVideo" ref={localVideoRef} autoPlay muted></video> : null} */}
                    <video className="meetUserVideo" ref={localVideoRef} autoPlay muted></video>
                    <div className="conference-view">
                        {videos.map((video) => (
                            <div key={video.socketId} className="conference-member">
                                <h2 style={{color : "white"}}>{video.socketId}</h2>
                                <video
                                    data-socket={video.socketId}
                                    ref={(ref) => {if(ref && video.stream) ref.srcObject = video.stream;}}
                                    autoPlay
                                    muted
                                ></video>
                            </div>
                        ))}
                    </div>
                </div>
            }
        </div>
    );
}

export default withAuth(VideoMeetComponent);

