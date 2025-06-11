import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  customerID: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  status: {
    type: String,
    enum: ["unpaid", "paid", "cancelled"],
    default: "unpaid"
  }
});

export default mongoose.model("Order", orderSchema);
