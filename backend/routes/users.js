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
    let query = "SELECT id, nama, email, role, avatar, no_telp, created_at FROM users WHERE 1=1";
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
    const { nama, email, password, role, avatar, no_telp } = req.body;
    if (!nama || !email || !password || !role) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    const existing = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) return res.status(409).json({ error: "Email sudah terdaftar" });

    const hashPassword = bcrypt.hashSync(password, 10);
    const result = await run(
      "INSERT INTO users (nama, email, password_hash, role, avatar, no_telp) VALUES (?, ?, ?, ?, ?, ?)", 
      [nama, email, hashPassword, role, avatar || null, no_telp || null]
    );

    res.status(201).json({ message: "User berhasil ditambahkan", id: result.lastID });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Update user
router.put("/:id", authenticateToken, requireRole(permissions.users.updateOwn), async (req, res) => {
  try {
    const { nama, email, password, role, avatar, no_telp } = req.body;
    const { id } = req.params;

    const existing = await get("SELECT id, role FROM users WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "User tidak ditemukan" });

    // Security check: only admin_bgn can change other people's details
    // Except for themselves (all roles can update their own profile)
    const isSelf = parseInt(id) === req.user.id;
    if (req.user.role !== "admin_bgn" && !isSelf) {
      return res.status(403).json({ error: "Hanya Admin BGN yang bisa mengupdate user lain" });
    }

    // Determine final role: 
    // 1. If not admin_bgn updating self, keep existing role
    // 2. If role is provided in body (usually by admin), use that
    // 3. Fallback to existing role
    const finalRole = (req.user.role !== "admin_bgn" && isSelf) ? existing.role : (role || existing.role);

    if (password) {
      const hashPassword = bcrypt.hashSync(password, 10);
      await run(
        "UPDATE users SET nama = ?, email = ?, role = ?, password_hash = ?, avatar = ?, no_telp = ? WHERE id = ?", 
        [nama, email, finalRole, hashPassword, avatar || null, no_telp || null, id]
      );
    } else {
      await run(
        "UPDATE users SET nama = ?, email = ?, role = ?, avatar = ?, no_telp = ? WHERE id = ?", 
        [nama, email, finalRole, avatar || null, no_telp || null, id]
      );
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
