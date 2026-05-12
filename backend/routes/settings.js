const express = require('express');
const router = express.Router();
const { all, run, get } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

// Get all settings (Public - needed for branding on login page)
router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings');
    // Convert array to object { key: value }
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update settings (Admin only)
router.put('/', authenticateToken, requireRole(['admin_bgn']), async (req, res) => {
  try {
    const updates = req.body; // Expecting { key: value, key2: value2 }
    
    // Fetch old settings for audit
    const oldSettings = {};
    const rows = await all('SELECT key, value FROM settings');
    rows.forEach(r => oldSettings[r.key] = r.value);

    for (const [key, value] of Object.entries(updates)) {
      // Use UPSERT logic (INSERT or UPDATE)
      const existing = await get('SELECT key FROM settings WHERE key = ?', [key]);
      if (existing) {
        await run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [String(value), key]);
      } else {
        await run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
      }
    }

    // Log audit
    await logAudit({
      action: 'UPDATE_SETTINGS',
      table_name: 'settings',
      old_values: oldSettings,
      new_values: updates,
      req
    });

    res.json({ message: 'Pengaturan berhasil diperbarui' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
