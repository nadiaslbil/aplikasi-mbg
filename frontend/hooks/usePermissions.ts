import { useAuth } from '@/context/AuthContext';

/**
 * Hook for checking user permissions based on role.
 * Returns helper functions to determine what actions the user can perform.
 */
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || '';

  const isAdmin = role === 'admin_bgn' || role === 'admin_daerah';
  const isSuperAdmin = role === 'admin_bgn';
  const isKurir = role === 'kurir';
  const isSupplier = role === 'supplier';

  // Sekolah: Admin only (create, update, delete)
  const canCreateSekolah = isAdmin;
  const canEditSekolah = isAdmin;
  const canDeleteSekolah = isAdmin;

  // Dapur: Admin (create, update, delete), Supplier (update own)
  const canCreateDapur = isAdmin;
  const canEditDapur = isAdmin || isSupplier; // Supplier bisa edit dapur sendiri
  const canDeleteDapur = isAdmin;

  // Jadwal: Admin only
  const canCreateJadwal = isAdmin;
  const canEditJadwal = isAdmin;
  const canDeleteJadwal = isAdmin;

  // Pengiriman: Admin (create, update), Admin+Kurir (update status)
  const canCreatePengiriman = isAdmin;
  const canEditPengiriman = isAdmin;
  const canUpdateStatusPengiriman = isAdmin || isKurir;

  // Stok: Admin (create, update, delete), Supplier (create, update own)
  const canCreateStok = isAdmin || isSupplier;
  const canEditStok = isAdmin || isSupplier;
  const canDeleteStok = isAdmin;

  // Insiden: All roles can create, Admin only can update status
  const canCreateInsiden = true;
  const canUpdateInsiden = isAdmin;

  // Users: Admin only
  const canManageUsers = isAdmin;

  return {
    user,
    role,
    isAdmin,
    isSuperAdmin,
    isKurir,
    isSupplier,
    canCreateSekolah,
    canEditSekolah,
    canDeleteSekolah,
    canCreateDapur,
    canEditDapur,
    canDeleteDapur,
    canCreateJadwal,
    canEditJadwal,
    canDeleteJadwal,
    canCreatePengiriman,
    canEditPengiriman,
    canUpdateStatusPengiriman,
    canCreateStok,
    canEditStok,
    canDeleteStok,
    canCreateInsiden,
    canUpdateInsiden,
    canManageUsers,
  };
}
