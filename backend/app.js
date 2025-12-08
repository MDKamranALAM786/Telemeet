import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import {createServer} from "node:http";
import cors from "cors";

import {connectToSocket} from "./src/controllers/socketManager.js";
import userRouter from "./src/routes/user.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", (process.env.PORT || 3000));
app.use(cors());
app.use(express.json({limit : "50kb"}));
app.use(express.urlencoded({limit : "50kb", extended : true}));
app.use("/api/v1/user", userRouter);


const start = async () => {
    const connectionDb = await mongoose.connect(process.env.ATLASDB_URL);
    console.log(`Connected to mongodb at ${connectionDb.connection.host}:${connectionDb.connection.port}`);
    server.listen(app.get("port"), () => {
        console.log(`Server running on port ${app.get("port")}`);
    });
};
start();

app.get("/", (req, res) => {
    res.send("Hello, World!");
});
