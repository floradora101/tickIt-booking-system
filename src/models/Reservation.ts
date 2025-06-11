import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
  customerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  eventID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  seatIDs: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: true },
  ],
  orderID: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  status: {
    type: String,
    enum: ["locked", "confirmed", "cancelled"],
    default: "locked",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Reservation", reservationSchema);
