/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Membatasi akses endpoint berdasarkan role user.
 * 
 * Role Hierarchy:
 * - admin_bgn: Super admin (akses semua)
 * - admin_daerah: Regional admin (akses data daerah)
 * - kurir: Petugas pengiriman (upload bukti & update status)
 * - supplier: Dapur/catering (kelola stok & dapur sendiri)
 */

// Middleware untuk check role
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Anda tidak memiliki akses ke fitur ini. Role tidak diizinkan.' 
      });
    }

    next();
  };
};

// Middleware untuk check ownership (user hanya bisa akses data sendiri)
const requireOwnership = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField];
    
    if (resourceUserId && parseInt(resourceUserId) !== req.user.id && req.user.role !== 'admin_bgn') {
      return res.status(403).json({ 
        error: 'Anda hanya bisa mengakses data sendiri' 
      });
    }

    next();
  };
};

// Permission matrix untuk setiap endpoint
const permissions = {
  // ============ SEKOLAH ============
  sekolah: {
    read: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'],
    create: ['admin_bgn', 'admin_daerah'],
    update: ['admin_bgn', 'admin_daerah'],
    delete: ['admin_bgn', 'admin_daerah'],
  },

  // ============ DAPUR ============
  dapur: {
    read: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'],
    create: ['admin_bgn', 'admin_daerah'],
    updateOwn: ['supplier'], // Supplier bisa update dapur sendiri
    update: ['admin_bgn', 'admin_daerah'],
    delete: ['admin_bgn', 'admin_daerah'],
  },

  // ============ JADWAL ============
  jadwal: {
    read: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'],
    create: ['admin_bgn', 'admin_daerah'],
    update: ['admin_bgn', 'admin_daerah'],
    delete: ['admin_bgn', 'admin_daerah'],
  },

  // ============ PENGIRIMAN ============
  pengiriman: {
    read: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'],
    readAll: ['admin_bgn', 'admin_daerah'],
    readOwn: ['kurir', 'supplier'],
    create: ['admin_bgn', 'admin_daerah', 'kurir'],
    update: ['admin_bgn', 'admin_daerah'],
    updateStatus: ['admin_bgn', 'admin_daerah', 'kurir'], // Kurir bisa update status & upload foto
    delete: ['admin_bgn', 'admin_daerah'],
  },

  // ============ STOK ============
  stok: {
    read: ['admin_bgn', 'admin_daerah', 'supplier'],
    readAll: ['admin_bgn', 'admin_daerah'],
    readOwn: ['supplier'],
    create: ['admin_bgn', 'admin_daerah', 'supplier'],
    createOwn: ['supplier'],
    update: ['admin_bgn', 'admin_daerah', 'supplier'],
    delete: ['admin_bgn', 'admin_daerah'],
  },

  // ============ INSIDEN ============
  insiden: {
    read: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'],
    create: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'],
    update: ['admin_bgn', 'admin_daerah'],
    delete: ['admin_bgn', 'admin_daerah'],
  },

  // ============ USERS ============
  users: {
    read: ['admin_bgn', 'admin_daerah'],
    create: ['admin_bgn', 'admin_daerah'],
    update: ['admin_bgn', 'admin_daerah'],
    updateOwn: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'], // User bisa update profile sendiri
    delete: ['admin_bgn'],
  },

  // ============ DASHBOARD ============
  dashboard: {
    read: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'],
  },

  // ============ UPLOAD ============
  upload: {
    create: ['admin_bgn', 'admin_daerah', 'kurir'],
  },
};

module.exports = {
  requireRole,
  requireOwnership,
  permissions,
};
