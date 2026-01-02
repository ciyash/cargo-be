import express from "express";

import shiprocketController from "../controllers/shiprocket.controller.js";


const router = express.Router();

router.post("/create-order", shiprocketController.createOrder);

export default router;
