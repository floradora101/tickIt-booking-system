import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./utils/db";
import seatRoutes from "./routes/seatRoutes";
import { clearExpiredLocks } from "./tasks/clearExpiredLocks";
import session from "express-session";
import MongoStore from "connect-mongo";
import cron from "node-cron";

cron.schedule("0 * * * *", clearExpiredLocks); // runs at minute 0 of every hour

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error(" MONGODB_URI is not defined in your environment");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 10 * 60, // Session TTL in seconds
    }),
  })
);

connectDB(mongoUri);

app.use("/api/seats", seatRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
