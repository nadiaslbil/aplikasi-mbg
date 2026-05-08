const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { all, get, run } = require("../database");
const { authenticateToken } = require("../middleware/auth");
const { requireRole, permissions } = require("../middleware/rbac");

// List users (supports ?search= & ?role=)
router.get("/", authenticateToken, requireRole(permissions.users.read), async (req, res) => {
  try {
    const { search, role } = req.query;
    let query = "SELECT id, nama, email, role, created_at FROM users WHERE 1=1";
    const params = [];

    if (role) {
      query += " AND role = ?";
      params.push(role);
    }

    if (search) {
      query += " AND (nama LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY created_at DESC";

    const users = await all(query, params);
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Create user
router.post("/", authenticateToken, requireRole(permissions.users.create), async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    if (!nama || !email || !password || !role) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    const existing = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) return res.status(409).json({ error: "Email sudah terdaftar" });

    const hashPassword = bcrypt.hashSync(password, 10);
    const result = await run("INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)", [nama, email, hashPassword, role]);

    res.status(201).json({ message: "User berhasil ditambahkan", id: result.lastID });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Update user
router.put("/:id", authenticateToken, requireRole(permissions.users.updateOwn), async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    const { id } = req.params;

    const existing = await get("SELECT id, role FROM users WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "User tidak ditemukan" });

    // Security check: only admin_bgn can change other people's roles or details
    // Except for themselves
    if (req.user.role !== "admin_bgn" && parseInt(id) !== req.user.id) {
      return res.status(403).json({ error: "Hanya Admin BGN yang bisa mengupdate user lain" });
    }
    if (password) {
      const hashPassword = bcrypt.hashSync(password, 10);
      await run("UPDATE users SET nama = ?, email = ?, role = ?, password_hash = ? WHERE id = ?", [nama, email, role, hashPassword, id]);
    } else {
      await run("UPDATE users SET nama = ?, email = ?, role = ? WHERE id = ?", [nama, email, role, id]);
    }

    res.json({ message: "User berhasil diupdate" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Delete user (protect id=1 default admin)
router.delete("/:id", authenticateToken, requireRole(permissions.users.delete), async (req, res) => {
  try {
    const { id } = req.params;
    if (String(id) === "1") return res.status(400).json({ error: "User ini tidak boleh dihapus" });

    const existing = await get("SELECT id FROM users WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "User tidak ditemukan" });

    await run("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User berhasil dihapus" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

module.exports = router;
