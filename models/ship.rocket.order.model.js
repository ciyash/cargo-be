import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  name: String,
  sku: String,
  units: Number,
  selling_price: Number,
  discount: String,
  tax: String,
  hsn: Number
});

const shiprocketOrderSchema = new mongoose.Schema({

  subadminId: { type: mongoose.Schema.Types.ObjectId, ref: "Subadmin" },
  order_id: { type: String, required: true, unique: true },

  billing_customer_name: String,
  billing_last_name: String,
  billing_address: String,
  billing_city: String,
  billing_pincode: Number,
  billing_state: String,
  billing_country: String,
  billing_email: String,
  billing_phone: Number,

  shipping_is_billing: Boolean,

  order_items: [orderItemSchema],

  payment_method: String,
  sub_total: Number,

  length: Number,
  breadth: Number,
  height: Number,
  weight: Number,

  shiprocket_order_id: Number,
  shipment_id: Number,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("ShiprocketOrder", shiprocketOrderSchema);
