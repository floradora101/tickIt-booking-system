import mongoose from "mongoose";
import Seat from "../models/Seat";

export const clearExpiredLocks = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.warn("[CLEANUP] DB connection is not ready.");
      return;
    }

    const sessionsCollection = db.collection("sessions");

    // Fetch all active session IDs as strings
    const activeSessions = await sessionsCollection
      .find({}, { projection: { _id: 1 } })
      .toArray();
    const activeSessionIDs = new Set(
      activeSessions.map((s) => s._id.toString())
    );

    const now = new Date();

    // Unlock seats locked by non-active sessions
    const result1 = await Seat.updateMany(
      {
        lockedBy: { $ne: null, $nin: Array.from(activeSessionIDs) },
      },
      { $set: { lockUntil: null, lockedBy: null, status: "available" } }
    );

    // Unlock seats with expired lockUntil timestamp
    const result2 = await Seat.updateMany(
      { lockUntil: { $lt: now } },
      { $set: { lockUntil: null, lockedBy: null, status: "available" } }
    );

    if (result1.modifiedCount + result2.modifiedCount === 0) {
      console.log("[CLEANUP] No expired or orphaned locks found.");
    } else {
      console.log(
        ` [CLEANUP] Cleared ${result1.modifiedCount} locks from expired sessions and ${result2.modifiedCount} expired locks.`
      );
    }
  } catch (error) {
    console.error("[CLEANUP ERROR]", error);
  }
};
