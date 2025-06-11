import { Request, Response } from "express";
import Seat from "../models/Seat";
import Order from "../models/Order";
import Reservation from "../models/Reservation";
import mongoose from "mongoose";

export const getAvailableSeats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { eventID } = req.params;

  try {
    const cleanEventID = eventID.trim();

    if (!mongoose.Types.ObjectId.isValid(cleanEventID)) {
      res.status(400).json({ message: "Invalid event ID" });
    }

    const objectId = new mongoose.Types.ObjectId(cleanEventID);

    const seats = await Seat.find({ eventID: objectId });

    res.json({ seats });
  } catch (error) {
    console.error("Error fetching seats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const lockSeats = async (req: Request, res: Response): Promise<void> => {
  const { seatIDs, eventID, customerID } = req.body;
  // test
  console.log("HEADERS:", req.headers);
  console.log("METHOD:", req.method);
  console.log("BODY TYPE:", typeof req.body);
  console.log("LOCK REQ BODY:", req.body);

  if (!seatIDs?.length || !eventID || !customerID) {
    res.status(400).json({ message: "Missing data" });
    return;
  }

  const now = new Date();
  const lockUntil = new Date(now.getTime() + 10 * 60000); // 10 minutes

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Fetch seats with lock
    // This query fetches all the currently available and lockable seats
    const seats = await Seat.find({
      _id: { $in: seatIDs },
      eventID,
      isTaken: false,
      $or: [{ lockUntil: null }, { lockUntil: { $lt: now } }],
    }).session(session);

    if (seats.length !== seatIDs.length) {
      await session.abortTransaction();
      res
        .status(409)
        .json({ message: "Some seats are already locked or taken" });
      return;
    }

    // Step 2: Lock seats
    const sessionID = req.sessionID;
    await Seat.updateMany(
      { _id: { $in: seatIDs } },
      { $set: { lockUntil, lockedBy: sessionID, status: "locked" } }
    ).session(session);

    await session.commitTransaction();
    res.status(200).json({ message: "Seats locked", lockUntil });
    return;
  } catch (err) {
    //If any step throws an error, abort the transaction
    await session.abortTransaction();
    console.error("Locking error:", err);
    res.status(500).json({ message: "Server error" });
    return;
  } finally {
    session.endSession();
  }
};

export const confirmSeats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { eventID, seatIDs, customerID, amount, currency } = req.body;

  if (!eventID || !seatIDs?.length || !customerID || !amount || !currency) {
    res.status(400).json({ message: "Missing data" });
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    const seats = await Seat.find({
      _id: { $in: seatIDs },
      eventID,
      isTaken: false,
      lockUntil: { $gt: now },
      lockedBy: req.sessionID,
    }).session(session);

    if (seats.length !== seatIDs.length) {
      await session.abortTransaction();
      res.status(409).json({ message: "Seats unavailable" });
      return;
    }

    const order = await Order.create(
      [{ customerID, amount, currency, status: "paid" }],
      { session }
    );

    await Seat.updateMany(
      { _id: { $in: seatIDs } },
      { $set: { isTaken: true, lockUntil: null, status: "confirmed" } }
    ).session(session);

    const reservation = await Reservation.create(
      [
        {
          eventID,
          customerID,
          status: "confirmed",
          seatIDs,
          orderID: order[0]._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res
      .status(201)
      .json({ message: "Reservation confirmed", reservation: reservation[0] });
  } catch (err) {
    await session.abortTransaction();
    console.error("Reservation error:", err);
    res.status(500).json({ message: "Server error" });
    return;
  } finally {
    session.endSession();
  }
};
export const releaseLocksForSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sessionID = req.sessionID;
    if (!sessionID) {
      res.status(400).json({ message: "No session found" });
      return;
    }

    // Clear locks where lockedBy equals current session
    await Seat.updateMany(
      { lockedBy: sessionID },
      { $set: { lockUntil: null, lockedBy: null, status: "available" } }
    );

    res.status(200).json({ message: "Locks released successfully" });
    return;
  } catch (err) {
    console.error("Release locks error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
