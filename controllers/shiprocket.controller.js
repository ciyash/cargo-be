import axios from "axios";

import ShiprocketOrder from "../models/ship.rocket.order.model.js";

import getShiprocketToken from "../config/shiprocket.service.js";

const createOrder = async (req, res) => {
  try {

    const subadminId = req.user?.id;

    // if (!subadminId) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Unauthorized user"
    //   });
    // }

    const token = await getShiprocketToken();

    const response = await axios.post("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      req.body,
      {
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const savedOrder = await ShiprocketOrder.create({
      ...req.body,
      subadminId, // ✅ storing logged-in user
      shiprocket_order_id: response.data.order_id,
      shipment_id: response.data.shipment_id
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: savedOrder
    });

  } catch (error) {
    console.error("Shiprocket Error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Order creation failed",
      error: error.response?.data || error.message
    });
  }
};

export default {
  createOrder
};
