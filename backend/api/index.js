const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { uploadsDir } = require("../middleware/upload");

dotenv.config();
const app = express();

// Jamin CORS dari Theta
app.use(
  cors({
    origin: "https://aplikasi-mbg-theta.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  }),
);

app.use(express.json());
app.use("/uploads", express.static(uploadsDir));
app.use("/api/uploads", express.static(uploadsDir));

// Import database secara langsung
const { get, run, all, isPostgres } = require("../database");

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
  res.status(200).json({
    status: "ok",
    database: isPostgres ? "postgres" : "sqlite",
    env: process.env.NODE_ENV,
  });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Pastikan database siap
    const user = await get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) {
      return res.status(401).json({ error: "User tidak ditemukan" });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Password salah" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, nama: user.nama }, process.env.JWT_SECRET || "secret123", { expiresIn: "24h" });

    res.json({
      token,
      user: { 
        id: user.id, 
        nama: user.nama, 
        email: user.email, 
        role: user.role,
        avatar: user.avatar,
        no_telp: user.no_telp
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Database Error: " + error.message });
  }
});

module.exports = app;
