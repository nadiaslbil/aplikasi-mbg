const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { db } = require("../database");
const { authenticateToken } = require("../middleware/auth");
const { requireRole, permissions } = require("../middleware/rbac");
const { userUpdateSchema, registerSchema, validate } = require("../validation/schemas");
const { logAudit } = require("../middleware/audit");

// List users (supports ?search= & ?role=)
router.get("/", authenticateToken, requireRole(permissions.users.read), async (req, res) => {
  try {
    const { search, role } = req.query;
    let query = db('users')
      .select("id", "nama", "email", "role", "avatar", "no_telp", "created_at")
      .whereNull('deleted_at');

    if (role) {
      query = query.where({ role });
    }

    if (search) {
      query = query.where(function() {
        this.where('nama', 'LIKE', `%${search}%`)
          .orWhere('email', 'LIKE', `%${search}%`);
      });
    }

    const users = await query.orderBy('created_at', 'desc');
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Create user
router.post("/", authenticateToken, requireRole(permissions.users.create), validate(registerSchema), async (req, res) => {
  try {
    const { nama, email, password, role, avatar, no_telp } = req.body;

    const existing = await db('users').where({ email }).whereNull('deleted_at').first();
    if (existing) return res.status(409).json({ error: "Email sudah terdaftar" });

    const hashPassword = bcrypt.hashSync(password, 10);
    const [id] = await db('users').insert({
      nama, 
      email, 
      password_hash: hashPassword, 
      role, 
      avatar: avatar || null, 
      no_telp: no_telp || null
    }).returning('id');

    const newId = typeof id === 'object' ? id.id : id;

    // Log audit
    await logAudit({
      action: 'CREATE',
      table_name: 'users',
      record_id: newId,
      new_values: { nama, email, role, avatar, no_telp },
      req
    });

    res.status(201).json({ 
      message: "User berhasil ditambahkan", 
      id: newId 
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Update user
router.put("/:id", authenticateToken, requireRole(permissions.users.updateOwn), validate(userUpdateSchema), async (req, res) => {
  try {
    const { nama, email, role, avatar, no_telp, password } = req.body;
    const { id } = req.params;

    const existing = await db('users').where({ id }).whereNull('deleted_at').first();
    if (!existing) return res.status(404).json({ error: "User tidak ditemukan" });

    // Security check: only admin_bgn can change other people's details
    const isSelf = parseInt(id) === req.user.id;
    if (req.user.role !== "admin_bgn" && !isSelf) {
      return res.status(403).json({ error: "Hanya Admin BGN yang bisa mengupdate user lain" });
    }

    const finalRole = (req.user.role !== "admin_bgn" && isSelf) ? existing.role : (role || existing.role);

    const updateData = {
      nama: nama || existing.nama,
      email: email || existing.email,
      role: finalRole,
      avatar: avatar || existing.avatar,
      no_telp: no_telp || existing.no_telp,
      updated_at: db.fn.now()
    };

    if (password) {
      updateData.password_hash = bcrypt.hashSync(password, 10);
    }

    await db('users').where({ id }).update(updateData);

    // Log audit (exclude password_hash from logs)
    const { password_hash, ...loggedOldValues } = existing;
    const { password_hash: _, ...loggedNewValues } = updateData;

    await logAudit({
      action: 'UPDATE',
      table_name: 'users',
      record_id: id,
      old_values: loggedOldValues,
      new_values: loggedNewValues,
      req
    });

    res.json({ message: "User berhasil diupdate" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Delete user (Soft Delete)
router.delete("/:id", authenticateToken, requireRole(permissions.users.delete), async (req, res) => {
  try {
    const { id } = req.params;
    if (String(id) === "1") return res.status(400).json({ error: "User ini tidak boleh dihapus" });

    const existing = await db('users').where({ id }).whereNull('deleted_at').first();
    if (!existing) return res.status(404).json({ error: "User tidak ditemukan" });

    await db('users').where({ id }).update({ deleted_at: db.fn.now() });

    // Log audit
    const { password_hash, ...loggedOldValues } = existing;
    await logAudit({
      action: 'DELETE',
      table_name: 'users',
      record_id: id,
      old_values: loggedOldValues,
      req
    });

    res.json({ message: "User berhasil dihapus" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

module.exports = router;
