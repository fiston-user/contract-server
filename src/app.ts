import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";
import contractRoutes from "./routes/contracts";
import paymentRoutes from "./routes/payments";
import { handleWebhook } from "./controllers/paymentController";
import "./config/passport";

dotenv.config();

const app = express();

// Update the CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use(helmet());
app.use(morgan("dev"));

// Handle Stripe webhook separately, before body parsing middleware
app.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// Apply JSON body parsing to all other routes
app.use(express.json());

// Update the session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// health check endpoint
app.get("/health", (req, res) => {
  res.send("OK");
});

app.use("/auth", authRoutes);
app.use("/api", contractRoutes);
app.use("/payments", paymentRoutes);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
