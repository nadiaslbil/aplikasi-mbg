'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Users,
  Building2,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  X as CloseIcon,
  Search,
  Download,
  UserCheck,
  Filter,
} from 'lucide-react';
import { exportToExcel } from '@/lib/export';

interface Dapur {
  id: number;
  nama: string;
  kecamatan: string;
}

interface Kurir {
  id: number;
  nama: string;
  email: string;
}

interface DapurKurir {
  id: number;
  dapur_id: number;
  kurir_id: number;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  status: string;
  dapur_nama: string;
  kurir_nama: string;
  kurir_email: string;
}

export default function AssignKurirPage() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions(); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [relations, setRelations] = useState<DapurKurir[]>([]);
  const [dapurs, setDapurs] = useState<Dapur[]>([]);
  const [kurirs, setKurirs] = useState<Kurir[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<DapurKurir | null>(null);

  const [formData, setFormData] = useState({
    dapur_id: '',
    kurir_id: '',
    tanggal_mulai: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
    fetchOptions();
  }, [page, search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dapur-kurir', {
        params: {
          page,
          limit: 10,
          search: search || undefined
        }
      });
      setRelations(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal mengambil data penugasan');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [dapurRes, kurirRes] = await Promise.all([
        api.get('/dapur'),
        api.get('/kurir'),
      ]);
      setDapurs(Array.isArray(dapurRes.data) ? dapurRes.data : dapurRes.data.data || []);
      setKurirs(Array.isArray(kurirRes.data) ? kurirRes.data : kurirRes.data.data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dapur_id || !formData.kurir_id) {
      toast.error('Pilih dapur dan kurir terlebih dahulu');
      return;
    }

    try {
      setSaving(true);
      await api.post('/dapur-kurir', formData);
      toast.success('Kurir berhasil ditugaskan ke dapur');
      setShowForm(false);
      setFormData({
        dapur_id: '',
        kurir_id: '',
        tanggal_mulai: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menambahkan penugasan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/dapur-kurir/${id}`);
      toast.success('Penugasan berhasil dihapus');
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menghapus penugasan');
    }
  };

  const handleToggleStatus = async (relation: DapurKurir) => {
    const newStatus = relation.status === 'aktif' ? 'nonaktif' : 'aktif';
    
    try {
      await api.put(`/dapur-kurir/${relation.id}`, {
        status: newStatus,
        tanggal_selesai: newStatus === 'nonaktif' ? new Date().toISOString().split('T')[0] : null,
      });

      toast.success(`Status penugasan kurir ${newStatus === 'aktif' ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal update status');
    }
  };

  const handleExport = () => {
    if (relations.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const exportData = relations.map(r => ({
      Dapur: r.dapur_nama,
      Kurir: r.kurir_nama,
      Email: r.kurir_email,
      'Tanggal Mulai': new Date(r.tanggal_mulai).toLocaleDateString('id-ID'),
      Status: r.status
    }));

    const success = exportToExcel(exportData, 'Data_Penugasan_Kurir_MBG', 'Penugasan');
    if (success) toast.success('Data berhasil diexport ke Excel');
    else toast.error('Gagal mengexport data');
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
      currentPage="/dashboard/assign-kurir" 
      title="Penugasan Kurir" 
      description="Kelola penugasan kurir ke dapur untuk operasional harian"
    >
      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Total Dapur</p>
            <p className="text-xl font-bold text-zinc-900">{dapurs.length}</p>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Total Kurir</p>
            <p className="text-xl font-bold text-zinc-900">{kurirs.length}</p>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Relasi Aktif</p>
            <p className="text-xl font-bold text-zinc-900">
              {relations.filter(r => r.status === 'aktif').length}
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="filter-bar">
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            Tambah Penugasan
          </button>
        )}

        <button
          onClick={handleExport}
          className="btn-secondary flex items-center gap-2"
        >
          <Download size={16} />
          <span>Export Excel</span>
        </button>

        <div className="relative flex-1 max-w-xs ml-auto">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Cari dapur atau kurir..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input pl-10!"
          />
        </div>
      </div>

      {/* Form Panel */}
      {showForm && (
        <div className="panel animate-fadeIn">
          <div className="panel-header">
            <h2 className="panel-title">Tambah Penugasan Kurir</h2>
            <button onClick={() => setShowForm(false)} className="btn-icon">
              <CloseIcon size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label className="form-label">Dapur Supplier</label>
                <select
                  value={formData.dapur_id}
                  onChange={(e) => setFormData({ ...formData, dapur_id: e.target.value })}
                  className="select"
                  required
                >
                  <option value="">Pilih Dapur</option>
                  {dapurs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama} ({d.kecamatan})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Kurir</label>
                <select
                  value={formData.kurir_id}
                  onChange={(e) => setFormData({ ...formData, kurir_id: e.target.value })}
                  className="select"
                  required
                >
                  <option value="">Pilih Kurir</option>
                  {kurirs.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama} ({k.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Tanggal Mulai Tugas</label>
                <input
                  type="date"
                  value={formData.tanggal_mulai}
                  onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                  className="input"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-5 pt-5 border-t border-zinc-200/80">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="btn-secondary"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Penugasan'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table Container */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Dapur</th>
                <th>Kurir</th>
                <th>Tanggal Mulai</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-zinc-500">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : relations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Users size={24} />
                      </div>
                      <p className="empty-state-title">Belum ada penugasan</p>
                      <p className="empty-state-text">Klik &quot;Tambah Penugasan&quot; untuk menugaskan kurir ke dapur.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                relations.map((rel) => (
                  <tr key={rel.id}>
                    <td className="font-medium text-zinc-900">{rel.dapur_nama}</td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium">{rel.kurir_nama}</span>
                        <span className="text-xs text-zinc-500">{rel.kurir_email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Calendar size={14} className="text-zinc-400" />
                        {new Date(rel.tanggal_mulai).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${rel.status === 'aktif' ? 'badge-green' : 'badge-zinc'}`}>
                        {rel.status === 'aktif' ? (
                          <CheckCircle size={10} className="mr-1" />
                        ) : (
                          <XCircle size={10} className="mr-1" />
                        )}
                        {rel.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(rel)}
                              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                rel.status === 'aktif'
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {rel.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button 
                              onClick={() => setDeleteTarget(rel)} 
                              className="btn-icon-danger"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
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
      {!loading && relations.length > 0 && (
        <div className="mt-4 px-1 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm text-zinc-500">
            Menampilkan <span className="font-medium text-zinc-700">{relations.length}</span> dari <span className="font-medium text-zinc-700">{total}</span> data
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1 border border-zinc-200 rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
            >
              Prev
            </button>
            <div className="flex items-center gap-1">
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative z-[2100]">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">Konfirmasi Hapus</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Hapus penugasan <span className="font-medium text-zinc-700">{deleteTarget.kurir_nama}</span> di <span className="font-medium text-zinc-700">{deleteTarget.dapur_nama}</span>?
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
