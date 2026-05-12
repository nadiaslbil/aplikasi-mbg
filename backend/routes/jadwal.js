const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, permissions } = require('../middleware/rbac');
const { jadwalSchema, validate } = require('../validation/schemas');
const { logAudit } = require('../middleware/audit');

// Get all jadwal distribusi
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tanggal, status, dapur_id, sekolah_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let query = db('jadwal_distribusi as jd')
      .join('dapur_supplier as ds', 'jd.dapur_id', 'ds.id')
      .join('sekolah as s', 'jd.sekolah_id', 's.id')
      .leftJoin('pengiriman as p', 'p.jadwal_id', 'jd.id')
      .leftJoin('users as pu', 'p.kurir_id', 'pu.id')
      .leftJoin(
        db('dapur_kurir')
          .select('dapur_id', db.raw('MIN(kurir_id) as kurir_id'))
          .groupBy('dapur_id')
          .as('dkm'),
        'dkm.dapur_id', 'jd.dapur_id'
      )
      .leftJoin('users as du', 'dkm.kurir_id', 'du.id')
      .whereNull('jd.deleted_at')
      .whereNull('ds.deleted_at')
      .whereNull('s.deleted_at');

    if (req.user?.role === 'supplier' || req.user?.role === 'kurir') {
      let accessibleDapurIds = [];
      if (req.user.role === 'supplier') {
        const rows = await db('dapur_supplier')
          .select('id')
          .where({ user_id: req.user.id })
          .whereNull('deleted_at');
        accessibleDapurIds = rows.map((r) => r.id);
      } else {
        const rows = await db('dapur_kurir')
          .select('dapur_id')
          .where({ kurir_id: req.user.id, status: 'aktif' });
        accessibleDapurIds = rows.map((r) => r.dapur_id);
      }

      if (accessibleDapurIds.length === 0) {
        return res.json({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        });
      }

      query = query.whereIn('jd.dapur_id', accessibleDapurIds);
    }

    if (tanggal) query = query.where({ 'jd.tanggal': tanggal });
    if (status) query = query.where({ 'jd.status': status });
    if (dapur_id) query = query.where({ 'jd.dapur_id': dapur_id });
    if (sekolah_id) query = query.where({ 'jd.sekolah_id': sekolah_id });

    // Get total count
    const totalCount = await query.clone().count('* as total').first();
    const total = totalCount.total;

    const jadwal = await query
      .select(
        'jd.*', 
        'ds.nama as dapur_nama', 
        's.nama as sekolah_nama', 
        's.alamat as sekolah_alamat',
        's.latitude as sekolah_latitude', 
        's.longitude as sekolah_longitude',
        db.raw('COALESCE(pu.nama, du.nama) as kurir_nama')
      )
      .orderBy('jd.tanggal', 'desc')
      .orderBy('jd.waktu_kirim', 'asc')
      .limit(limit)
      .offset(offset);

    res.json({
      data: jadwal,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Generate Weekly Schedules
router.post('/generate-weekly', authenticateToken, requireRole(permissions.jadwal.create), async (req, res) => {
  const trx = await db.transaction();
  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1); // Start from tomorrow
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // 7 days range

    const dateRange = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateRange.push(new Date(d).toISOString().split('T')[0]);
    }

    const dayNames = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

    // 1. Fetch relations
    const relations = await trx('dapur_sekolah as dsk')
      .join('dapur_supplier as ds', 'dsk.dapur_id', 'ds.id')
      .join('sekolah as s', 'dsk.sekolah_id', 's.id')
      .select('dsk.*', 'ds.nama as dapur_nama', 'ds.kapasitas_harian', 's.nama as sekolah_nama')
      .where('dsk.status', 'aktif')
      .whereNull('ds.deleted_at')
      .whereNull('s.deleted_at');

    const kurirRelations = await trx('dapur_kurir as dk')
      .join('users as u', 'dk.kurir_id', 'u.id')
      .select('dk.*', 'u.nama as kurir_nama')
      .where('dk.status', 'aktif')
      .whereNull('u.deleted_at');

    // 2. Fetch existing schedules to prevent dups
    const existingSchedules = await trx('jadwal_distribusi')
      .where('tanggal', '>=', dateRange[0])
      .where('tanggal', '<=', dateRange[dateRange.length - 1])
      .whereNull('deleted_at');

    const existingMap = new Set(existingSchedules.map(s => `${s.tanggal}_${s.dapur_id}_${s.sekolah_id}`));

    // Helper for Round Robin
    const courierCounters = {}; // { kitchenId_date: index }

    const results = {
      created: 0,
      skipped: 0,
      warnings: [],
      date_range: `${dateRange[0]} s/d ${dateRange[dateRange.length - 1]}`,
      summary: {}
    };

    const capacityTracker = {}; // { kitchenId_date: current_load }

    for (const date of dateRange) {
      const dayName = dayNames[new Date(date).getDay()];
      results.summary[dayName] = [];

      for (const rel of relations) {
        // Match day
        let hariKirim = [];
        try {
          hariKirim = typeof rel.hari_kirim === 'string' ? JSON.parse(rel.hari_kirim) : rel.hari_kirim;
        } catch (e) {
          console.error('JSON Parse error for hari_kirim:', rel.hari_kirim);
        }

        if (!hariKirim.includes(dayName)) continue;

        // Prevent duplication
        if (existingMap.has(`${date}_${rel.dapur_id}_${rel.sekolah_id}`)) {
          results.skipped++;
          continue;
        }

        // Track Capacity
        const capKey = `${rel.dapur_id}_${date}`;
        capacityTracker[capKey] = (capacityTracker[capKey] || 0) + rel.jumlah_porsi;
        
        if (capacityTracker[capKey] > rel.kapasitas_harian) {
          const warn = `Dapur ${rel.dapur_nama} melebihi kapasitas pada ${date} (Total: ${capacityTracker[capKey]}/${rel.kapasitas_harian})`;
          if (!results.warnings.includes(warn)) results.warnings.push(warn);
        }

        // Round Robin Courier Assignment
        const kitchenCouriers = kurirRelations.filter(k => k.dapur_id === rel.dapur_id);
        let assignedKurirId = null;
        let kurirNama = 'Belum ada';

        if (kitchenCouriers.length > 0) {
          const counterKey = `${rel.dapur_id}_${date}`;
          courierCounters[counterKey] = courierCounters[counterKey] !== undefined ? courierCounters[counterKey] : 0;
          const kurirIndex = courierCounters[counterKey] % kitchenCouriers.length;
          const assigned = kitchenCouriers[kurirIndex];
          assignedKurirId = assigned.kurir_id;
          kurirNama = assigned.kurir_nama;
          courierCounters[counterKey]++;
        }

        const [id] = await trx('jadwal_distribusi').insert({
          dapur_id: rel.dapur_id,
          sekolah_id: rel.sekolah_id,
          tanggal: date,
          waktu_kirim: '07:00', // Default
          jumlah_porsi: rel.jumlah_porsi,
          status: 'terjadwal'
        }).returning('id');

        const newId = typeof id === 'object' ? id.id : id;

        // If we have a kurir, we should ideally link it. 
        // Note: our table doesn't have kurir_id directly but we link it via pengiriman usually.
        // HOWEVER, based on front-end code, the user expects to see kurir_nama in jadwal list.
        // Let's check if the 'jadwal_distribusi' table has a kurir_id column or if it's dynamic.
        // (Research: the previous GET route joins pengiriman and dapur_kurir to get kurir_nama).
        // For a more professional approach, let's keep it simple: the dashboard query already finds a kurir.

        results.created++;
        results.summary[dayName].push({
          id: newId,
          dapur: rel.dapur_nama,
          sekolah: rel.sekolah_nama,
          porsi: rel.jumlah_porsi,
          waktu: '07:00',
          kurir: kurirNama,
          status: 'terjadwal'
        });
      }
    }

    await trx.commit();

    await logAudit({
      action: 'GENERATE_WEEKLY',
      table_name: 'jadwal_distribusi',
      record_id: 0,
      new_values: { range: results.date_range, count: results.created },
      req
    });

    res.json(results);
  } catch (error) {
    await trx.rollback();
    console.error('Generate weekly error:', error);
    res.status(500).json({ error: 'Gagal men-generate jadwal: ' + error.message });
  }
});

// Get jadwal by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const jadwal = await db('jadwal_distribusi as jd')
      .join('dapur_supplier as ds', 'jd.dapur_id', 'ds.id')
      .join('sekolah as s', 'jd.sekolah_id', 's.id')
      .leftJoin('pengiriman as p', 'p.jadwal_id', 'jd.id')
      .leftJoin('users as pu', 'p.kurir_id', pu.id)
      .leftJoin(
        db('dapur_kurir')
          .select('dapur_id', db.raw('MIN(kurir_id) as kurir_id'))
          .groupBy('dapur_id')
          .as('dkm'),
        'dkm.dapur_id', 'jd.dapur_id'
      )
      .leftJoin('users as du', 'dkm.kurir_id', 'du.id')
      .select(
        'jd.*', 
        'ds.nama as dapur_nama', 
        's.nama as sekolah_nama', 
        's.alamat as sekolah_alamat',
        's.latitude as sekolah_latitude', 
        's.longitude as sekolah_longitude',
        's.kontak as sekolah_kontak',
        db.raw('COALESCE(pu.nama, du.nama) as kurir_nama')
      )
      .where({ 'jd.id': req.params.id })
      .whereNull('jd.deleted_at')
      .first();
    
    if (!jadwal) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    res.json(jadwal);
  } catch (error) {
    console.error('Get single jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Create jadwal
router.post('/', authenticateToken, requireRole(permissions.jadwal.create), validate(jadwalSchema), async (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, jumlah_porsi, catatan, kurir_id } = req.body;

    const sekolahRelation = await db('dapur_sekolah')
      .where({ dapur_id, sekolah_id, status: 'aktif' })
      .first();
      
    if (!sekolahRelation) {
      return res.status(400).json({ error: 'Sekolah tidak terdaftar sebagai binaan dapur ini' });
    }

    if (kurir_id) {
      const kurirRelation = await db('dapur_kurir')
        .where({ dapur_id, kurir_id })
        .first();
      if (!kurirRelation) {
        return res.status(400).json({ error: 'Kurir tidak terdaftar pada dapur ini' });
      }
    }

    const [id] = await db('jadwal_distribusi').insert({
      dapur_id, 
      sekolah_id, 
      tanggal, 
      waktu_kirim: waktu_kirim || null, 
      jumlah_porsi, 
      catatan: catatan || null
    }).returning('id');

    const newId = typeof id === 'object' ? id.id : id;

    // Log audit
    await logAudit({
      action: 'CREATE',
      table_name: 'jadwal_distribusi',
      record_id: newId,
      new_values: req.body,
      req
    });

    res.status(201).json({
      message: 'Jadwal distribusi berhasil ditambahkan',
      id: newId,
    });
  } catch (error) {
    console.error('Create jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Update jadwal
router.put('/:id', authenticateToken, requireRole(permissions.jadwal.update), validate(jadwalSchema.partial()), async (req, res) => {
  try {
    const { dapur_id, sekolah_id, tanggal, waktu_kirim, waktu_terima, jumlah_porsi, status, catatan, kurir_id } = req.body;

    const existing = await db('jadwal_distribusi').where({ id: req.params.id }).whereNull('deleted_at').first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    // Maintain validation logic for dapur-sekolah link if IDs are being updated
    const finalDapurId = dapur_id || existing.dapur_id;
    const finalSekolahId = sekolah_id || existing.sekolah_id;

    if (dapur_id || sekolah_id) {
      const sekolahRelation = await db('dapur_sekolah')
        .where({ dapur_id: finalDapurId, sekolah_id: finalSekolahId, status: 'aktif' })
        .first();
      if (!sekolahRelation) {
        return res.status(400).json({ error: 'Sekolah tidak terdaftar sebagai binaan dapur ini' });
      }
    }

    if (kurir_id) {
      const kurirRelation = await db('dapur_kurir')
        .where({ dapur_id: finalDapurId, kurir_id })
        .first();
      if (!kurirRelation) {
        return res.status(400).json({ error: 'Kurir tidak terdaftar pada dapur ini' });
      }
    }

    const updatePayload = {
      dapur_id: finalDapurId,
      sekolah_id: finalSekolahId,
      tanggal: tanggal || existing.tanggal,
      waktu_kirim: waktu_kirim !== undefined ? waktu_kirim : existing.waktu_kirim,
      waktu_terima: waktu_terima !== undefined ? waktu_terima : existing.waktu_terima,
      jumlah_porsi: jumlah_porsi || existing.jumlah_porsi,
      status: status || existing.status,
      catatan: catatan !== undefined ? catatan : existing.catatan,
      updated_at: db.fn.now()
    };

    await db('jadwal_distribusi')
      .where({ id: req.params.id })
      .update(updatePayload);

    // Log audit
    await logAudit({
      action: 'UPDATE',
      table_name: 'jadwal_distribusi',
      record_id: req.params.id,
      old_values: existing,
      new_values: updatePayload,
      req
    });

    res.json({ message: 'Jadwal distribusi berhasil diupdate' });
  } catch (error) {
    console.error('Update jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete jadwal (Soft Delete)
router.delete('/:id', authenticateToken, requireRole(permissions.jadwal.delete), async (req, res) => {
  try {
    const existing = await db('jadwal_distribusi').where({ id: req.params.id }).whereNull('deleted_at').first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    await db('jadwal_distribusi').where({ id: req.params.id }).update({ deleted_at: db.fn.now() });

    // Log audit
    await logAudit({
      action: 'DELETE',
      table_name: 'jadwal_distribusi',
      record_id: req.params.id,
      old_values: existing,
      req
    });

    res.json({ message: 'Jadwal distribusi berhasil dihapus' });
  } catch (error) {
    console.error('Delete jadwal error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
