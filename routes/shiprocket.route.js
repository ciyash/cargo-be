import express from "express";
import auth from '../config/auth.middleware.js';

import shiprocketController from "../controllers/shiprocket.controller.js";


const router = express.Router();

router.post("/create-order", auth, shiprocketController.createOrder);

export default router;
