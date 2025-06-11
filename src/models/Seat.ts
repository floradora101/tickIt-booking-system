import mongoose, { Types } from "mongoose";

const seatSchema = new mongoose.Schema({
  eventID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  name: { type: String, required: true }, // e.g., "A1"
  isTaken: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["available", "locked", "confirmed"],
    default: "available",
  },
  lockUntil: { type: Date, default: null },
  lockedBy: {
    type: String,
    default: null,
  },
});

export default mongoose.model("Seat", seatSchema);
