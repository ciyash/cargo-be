import express from "express";
import ShipRocketController from "../controllers/ShipRocket.controller.js";


const router = express.Router();

router.post("/create-order", ShipRocketController.createOrder);

export default router;
