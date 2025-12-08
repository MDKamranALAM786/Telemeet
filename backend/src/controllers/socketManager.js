import {Server} from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors : {
            origin : "*",
            methods : ["GET", "POST"],
            allowedHeaders : ["*"],
            credentials : true
        }
    });

    io.on("connection", (socket) => {
        console.log(`New client connected: ${socket.id}`);
        io.to(socket.id).emit("connection-success", socket.id);

        socket.on("join-call", (path) => {
            if(connections[path] === undefined) {
                connections[path] = [];
            }
            connections[path].push(socket.id);
            timeOnline[socket.id] = new Date();
            for(let i=0;i<connections[path].length;i++) {
                io.to(connections[path][i]).emit("user-connected", socket.id, connections[path]);
            }
            if(messages[path] !== undefined) {
                for(let i=0;i<messages[path].length;i++) {
                    io.to(socket.id).emit("chat-message", messages[path][i]["data"], messages[path][i]["sender"], messages[path][i]["socket-id-sender"]);
                }
            }
        });

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            console.log(`Message from ${sender} : ${data}`);
            let [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if(!isFound && roomValue.includes(socket.id)) {
                        return([roomKey, true]);
                    }
                    return([room, isFound]);
                }, ["", false]
            );
            if(found) {
                if(messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }
                messages[matchingRoom].push({"sender" : sender, "data" : data, "socket-id-sender" : socket.id});
                connections[matchingRoom].forEach((client) => {
                    io.to(client).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        socket.on("disconnect", () => {
            let roomKey;
            for(const [key, roomClients] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                let flag = 0;
                for(let i=0;i<roomClients.length;i++) {
                    if(roomClients[i] === socket.id) {
                        roomKey = key;
                        flag++;
                        break;
                    }
                }
                if(flag != 0) {
                    break;
                }
            }
            if(roomKey !== undefined) {
                let index = connections[roomKey].indexOf(socket.id);
                connections[roomKey].splice(index, 1);
                connections[roomKey].forEach((client) => {
                    io.to(client).emit("user-disconnected", socket.id);
                });
                if(connections[roomKey].length === 0) {
                    delete connections[roomKey];
                    delete messages[roomKey];
                }
                console.log(`Client disconnected: ${socket.id}, Time Online: ${(new Date() - timeOnline[socket.id]) / 1000} seconds`);
                delete timeOnline[socket.id];
            }
        });
    });

    return(io);
};
