import Router from "express";

import {loginUser, registerUser, getUserHistory, addToHistory} from "../controllers/user.js";

const router = Router();
router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/addToActivity").post(addToHistory);
router.route("/getAllActivity").post(getUserHistory);

export default router;
