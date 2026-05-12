'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Plus,
  Edit,
  Trash2,
  X as CloseIcon,
  Search,
  School,
  Store,
} from 'lucide-react';

interface Sekolah {
  id: number;
  nama: string;
  alamat: string;
  latitude: number;
  longitude: number;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  jumlah_siswa: number;
  kontak: string;
  status: string;
  dapur_pembina: string | null; // NEW: Nama dapur yang membina
}

interface SekolahForm {
  nama: string;
  alamat: string;
  latitude: number;
  longitude: number;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  jumlah_siswa: number;
  kontak: string;
  status: string;
}

export default function SekolahPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { canCreateSekolah, canEditSekolah, canDeleteSekolah } = usePermissions();
  const router = useRouter();
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Sekolah | null>(null);

  // Check if user is kurir or supplier (for info banner)
  const isKurir = user?.role === 'kurir';
  const isSupplier = user?.role === 'supplier';
  const isAdmin = user?.role === 'admin_bgn' || user?.role === 'admin_daerah';

  const { register, handleSubmit, reset, setValue } = useForm<SekolahForm>();

  useEffect(() => {
    fetchSekolah();
  }, [page, search]);

  const fetchSekolah = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sekolah', {
        params: {
          page,
          limit: 10,
          search: search || undefined
        }
      });
      setSekolahList(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching sekolah:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SekolahForm) => {
    try {
      if (editingId) {
        await api.put(`/sekolah/${editingId}`, data);
        toast.success('Data sekolah berhasil diupdate');
      } else {
        await api.post('/sekolah', data);
        toast.success('Data sekolah berhasil ditambahkan');
      }
      fetchSekolah();
      handleCloseForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const handleEdit = (sekolah: Sekolah) => {
    setEditingId(sekolah.id);
    setValue('nama', sekolah.nama);
    setValue('alamat', sekolah.alamat);
    setValue('latitude', sekolah.latitude);
    setValue('longitude', sekolah.longitude);
    setValue('kecamatan', sekolah.kecamatan);
    setValue('kabupaten', sekolah.kabupaten);
    setValue('provinsi', sekolah.provinsi);
    setValue('jumlah_siswa', sekolah.jumlah_siswa);
    setValue('kontak', sekolah.kontak);
    setValue('status', sekolah.status);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/sekolah/${id}`);
      toast.success('Data sekolah berhasil dihapus');
      fetchSekolah();
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    reset();
  };

  const getVisiblePages = () => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    const adjustedStart = Math.max(1, end - maxVisible + 1);

    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
  };

  const visiblePages = getVisiblePages();

  return (
    <AdminLayout
      currentPage="/dashboard/sekolah"
      title="Data Sekolah"
      description={isKurir || isSupplier ? `Sekolah binaan dari dapur Anda (${user?.role === 'kurir' ? 'Kurir' : 'Supplier'})` : "Kelola data sekolah penerima MBG di Banjarnegara"}
    >
      {/* Info Banner for Non-Admin */}
      {(isKurir || isSupplier) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <Store size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">Mode Tampilan: Sekolah Binaan</h3>
            <p className="text-sm text-blue-700 mt-1">
              Anda hanya melihat sekolah yang dibina oleh dapur Anda. Hubungi admin untuk melihat semua sekolah.
            </p>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="filter-bar">
        {canCreateSekolah && (
          <button
            onClick={() => {
              setEditingId(null);
              reset({
                nama: '', alamat: '', latitude: 0, longitude: 0,
                kecamatan: '', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah',
                jumlah_siswa: 0, kontak: '', status: 'aktif',
              });
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} />
            Tambah Sekolah
          </button>
        )}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Cari sekolah..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to page 1 on search
            }}
            className="input pl-10!"
          />
        </div>
      </div>

      {/* Form Panel */}
      {showForm && (
        <div className="panel animate-fadeIn">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? 'Edit Sekolah' : 'Tambah Sekolah Baru'}</h2>
            <button onClick={handleCloseForm} className="btn-icon">
              <CloseIcon size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-grid">
              <div>
                <label className="form-label">Nama Sekolah</label>
                <input {...register('nama', { required: true })} className="input" placeholder="SDN 1 Banjarnegara" />
              </div>
              <div>
                <label className="form-label">Kontak</label>
                <input {...register('kontak')} className="input" placeholder="0286-xxxxxx" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Alamat</label>
                <input {...register('alamat', { required: true })} className="input" placeholder="Jl. Contoh No. 123" />
              </div>
              <div>
                <label className="form-label">Kecamatan</label>
                <input {...register('kecamatan', { required: true })} className="input" placeholder="Banjarnegara" />
              </div>
              <div>
                <label className="form-label">Kabupaten</label>
                <input {...register('kabupaten', { required: true })} className="input" defaultValue="Banjarnegara" />
              </div>
              <div>
                <label className="form-label">Provinsi</label>
                <input {...register('provinsi', { required: true })} className="input" defaultValue="Jawa Tengah" />
              </div>
              <div>
                <label className="form-label">Jumlah Siswa</label>
                <input {...register('jumlah_siswa', { valueAsNumber: true })} type="number" className="input" placeholder="100" />
              </div>
              <div>
                <label className="form-label">Latitude</label>
                <input {...register('latitude', { required: true, valueAsNumber: true })} type="number" step="any" className="input" placeholder="-7.3511" />
              </div>
              <div>
                <label className="form-label">Longitude</label>
                <input {...register('longitude', { required: true, valueAsNumber: true })} type="number" step="any" className="input" placeholder="109.5875" />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select {...register('status')} className="select">
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-5 pt-5 border-t border-zinc-200/80">
              <button type="button" onClick={handleCloseForm} className="btn-secondary">Batal</button>
              <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Sekolah</th>
                <th>Kecamatan</th>
                <th className="hidden md:table-cell">Alamat</th>
                <th className="hidden lg:table-cell">Dapur Pembina</th>
                <th className="text-right">Siswa</th>
                <th className="hidden lg:table-cell">Kontak</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-zinc-500">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : sekolahList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <School size={24} />
                      </div>
                      <p className="empty-state-title">Tidak ada data sekolah</p>
                      <p className="empty-state-text">{isKurir || isSupplier ? 'Tidak ada sekolah yang dibina oleh dapur Anda' : 'Klik "Tambah Sekolah" untuk menambahkan data baru'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sekolahList.map((sekolah) => (
                  <tr key={sekolah.id}>
                    <td className="font-medium text-zinc-900">{sekolah.nama}</td>
                    <td>{sekolah.kecamatan}</td>
                    <td className="hidden md:table-cell max-w-[200px] truncate">{sekolah.alamat}</td>
                    <td className="hidden lg:table-cell">
                      {sekolah.dapur_pembina ? (
                        <div className="flex flex-wrap gap-1">
                          {sekolah.dapur_pembina.split(',').map((dapur, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
                              <Store size={10} />
                              {dapur.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-xs italic">Belum ada</span>
                      )}
                    </td>
                    <td className="text-right font-medium">{sekolah.jumlah_siswa.toLocaleString('id-ID')}</td>
                    <td className="hidden lg:table-cell text-zinc-500">{sekolah.kontak || '-'}</td>
                    <td>
                      <span className={`badge ${sekolah.status === 'aktif' ? 'badge-green' : 'badge-red'}`}>
                        {sekolah.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEditSekolah && (
                          <button onClick={() => handleEdit(sekolah)} className="btn-icon" title="Edit">
                            <Edit size={16} />
                          </button>
                        )}
                        {canDeleteSekolah && (
                          <button onClick={() => setDeleteTarget(sekolah)} className="btn-icon-danger" title="Hapus">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && sekolahList.length > 0 && (
        <div className="mt-4 px-1 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm text-zinc-500">
            Menampilkan <span className="font-medium text-zinc-700">{sekolahList.length}</span> dari <span className="font-medium text-zinc-700">{total}</span> data
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1 border border-zinc-200 rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
            >
              Prev
            </button>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[190px] sm:max-w-none">
              {visiblePages[0] > 1 && (
                <>
                  <button
                    onClick={() => setPage(1)}
                    className="w-8 h-8 flex items-center justify-center rounded text-sm hover:bg-zinc-100 text-zinc-600 transition-colors"
                  >
                    1
                  </button>
                  {visiblePages[0] > 2 && <span className="text-zinc-400 px-0.5">...</span>}
                </>
              )}
              {visiblePages.map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              {visiblePages[visiblePages.length - 1] < totalPages && (
                <>
                  {visiblePages[visiblePages.length - 1] < totalPages - 1 && <span className="text-zinc-400 px-0.5">...</span>}
                  <button
                    onClick={() => setPage(totalPages)}
                    className="w-8 h-8 flex items-center justify-center rounded text-sm hover:bg-zinc-100 text-zinc-600 transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1 border border-zinc-200 rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative z-[2100]">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">Konfirmasi Hapus</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Hapus data sekolah <span className="font-medium text-zinc-700">{deleteTarget.nama}</span>?
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget.id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
