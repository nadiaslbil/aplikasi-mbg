const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { uploadsDir } = require("../middleware/upload");
const { apiLimiter } = require("../middleware/rate-limiter");

dotenv.config();
const app = express();

// Global API Limiter
app.use("/api", apiLimiter);

// Jamin CORS dari Theta & Local
const allowedOrigins = [
  "https://aplikasi-mbg-theta.vercel.app",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  }),
);

app.use(express.json());
app.use("/uploads", express.static(uploadsDir));
app.use("/api/uploads", express.static(uploadsDir));

// Routes (unified for SQLite & Postgres via database.js helpers)
app.use("/api/auth", require("../routes/auth"));
app.use("/api/dashboard", require("../routes/dashboard"));
app.use("/api/sekolah", require("../routes/sekolah"));
app.use("/api/dapur", require("../routes/dapur"));
app.use("/api/jadwal", require("../routes/jadwal"));
app.use("/api/pengiriman", require("../routes/pengiriman"));
app.use("/api/stok", require("../routes/stok"));
app.use("/api/insiden", require("../routes/insiden"));
app.use("/api/users", require("../routes/users"));
app.use("/api/kurir", require("../routes/kurir"));
app.use("/api/dapur-kurir", require("../routes/dapur-kurir"));
app.use("/api/dapur-sekolah", require("../routes/dapur-sekolah"));
app.use("/api/upload", require("../routes/upload"));
app.use("/api/settings", require("../routes/settings"));

app.get("/api/health", (req, res) => {
  const { isPostgres } = require("../database");
  res.status(200).json({
    status: "ok",
    database: isPostgres ? "postgres" : "sqlite",
    env: process.env.NODE_ENV,
  });
});

module.exports = app;