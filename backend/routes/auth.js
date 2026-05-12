const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../database"); // Use 'db' which is the knex instance
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi" });
    }

    const user = await db("users").where({ email }).first();

    if (!user) {
      return res.status(401).json({ error: "Email atau password salah" });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Email atau password salah" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        nama: user.nama,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      message: "Login berhasil",
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
    console.error("Login error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Register
router.post("/register", authenticateToken, requireRole(["admin_bgn"]), async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;

    if (!nama || !email || !password) {
      return res.status(400).json({ error: "Nama, email, dan password wajib diisi" });
    }

    const existingUser = await db("users").where({ email }).first();

    if (existingUser) {
      return res.status(409).json({ error: "Email sudah terdaftar" });
    }

    const hashPassword = bcrypt.hashSync(password, 10);

    const [userId] = await db("users").insert({
      nama,
      email,
      password_hash: hashPassword,
      role: role || "admin_daerah"
    }).returning("id");

    res.status(201).json({
      message: "User berhasil didaftarkan",
      userId: typeof userId === 'object' ? userId.id : userId,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Get current user
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await db("users")
      .select("id", "nama", "email", "role", "created_at", "avatar", "no_telp")
      .where({ id: req.user.id })
      .first();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

module.exports = router;
