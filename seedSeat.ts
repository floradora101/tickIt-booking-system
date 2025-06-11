import mongoose from "mongoose";

import Seat from "./src/models/Seat";

const MONGODB_URI =
  "mongodb+srv://tickit_admin:tickitpass123@cluster0.lapzzha.mongodb.net/tickitdb?retryWrites=true&w=majority";

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is not defined in the environment variables");
}
async function addSeat() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const seat = new Seat({
      eventID: new mongoose.Types.ObjectId(),
      name: "A1",
      isTaken: false,
      status: "available",
      lockUntil: null,
      lockedBy: null,
    });

    await seat.save();
    console.log("🎉 Seat created:", seat);
  } catch (err) {
    console.error("❌ Error adding seat:", err);
  } finally {
    await mongoose.disconnect();
  }
}

addSeat();
