'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import {
  Plus,
  Edit,
  Trash2,
  X as CloseIcon,
  Search,
  Package,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface Stok {
  id: number;
  dapur_id: number;
  nama_bahan: string;
  jumlah: number;
  satuan: string;
  expired_date: string;
  created_at: string;
  dapur_nama: string;
}

interface StokForm {
  dapur_id: number;
  nama_bahan: string;
  jumlah: number;
  satuan: string;
  expired_date: string;
}

interface Dapur { id: number; nama: string; user_id?: number; }

const satuanOptions = ['kg', 'gram', 'liter', 'ml', 'pcs', 'buah', 'ikat', 'karung', 'sak', 'dus'];

export default function StokPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { canCreateStok, canEditStok, canDeleteStok, isSupplier } = usePermissions();
  const router = useRouter();
  const [stokList, setStokList] = useState<Stok[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dapurList, setDapurList] = useState<Dapur[]>([]);
  const [search, setSearch] = useState('');
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<StokForm>();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchAll();
  }, [user, authLoading, showExpiredOnly]);

  // Auto-set dapur_id untuk supplier
  useEffect(() => {
    if (isSupplier && user && dapurList.length > 0) {
      const myDapur = dapurList.find(d => d.user_id === user.id);
      if (myDapur) {
        setValue('dapur_id', myDapur.id);
      }
    }
  }, [dapurList, isSupplier, user, setValue]);

  const fetchAll = async () => {
    try {
      const params = showExpiredOnly ? { expired_soon: 'true' } : {};
      const [stokRes, dapurRes] = await Promise.all([
        api.get('/stok', { params }),
        api.get('/dapur'),
      ]);
      setStokList(stokRes.data);
      setDapurList(dapurRes.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const onSubmit = async (data: StokForm) => {
    try {
      if (editingId) {
        await api.put(`/stok/${editingId}`, data);
        toast.success('Data stok berhasil diupdate');
      } else {
        await api.post('/stok', data);
        toast.success('Data stok berhasil ditambahkan');
      }
      fetchAll();
      handleCloseForm();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Terjadi kesalahan'); }
  };

  const handleEdit = (stok: Stok) => {
    setEditingId(stok.id);
    reset({
      dapur_id: stok.dapur_id,
      nama_bahan: stok.nama_bahan,
      jumlah: stok.jumlah,
      satuan: stok.satuan,
      expired_date: stok.expired_date,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus stok ini?')) return;
    try {
      await api.delete(`/stok/${id}`);
      toast.success('Data stok berhasil dihapus');
      fetchAll();
    }
    catch (error: any) { toast.error(error.response?.data?.error || 'Terjadi kesalahan'); }
  };

  const handleCloseForm = () => { setShowForm(false); setEditingId(null); reset(); };

  const isExpired = (date: string) => new Date(date) < new Date();
  const isExpiringSoon = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  };

  // NEW: Helper untuk menentukan status stok
  const getStokStatus = (stok: Stok) => {
    const expired = isExpired(stok.expired_date);
    const expiringSoon = isExpiringSoon(stok.expired_date);
    const habis = stok.jumlah === 0;

    if (expired || habis) {
      if (expired && habis) return { badge: 'badge-red', label: 'Expired & Habis' };
      if (expired) return { badge: 'badge-red', label: 'Expired' };
      return { badge: 'badge-red', label: 'Habis' };
    }
    if (expiringSoon) return { badge: 'badge-yellow', label: 'Hampir Expired' };
    return { badge: 'badge-green', label: 'Aman' };
  };

  const filteredStok = stokList.filter((s) =>
    s.nama_bahan.toLowerCase().includes(search.toLowerCase()) ||
    s.dapur_nama.toLowerCase().includes(search.toLowerCase())
  );

  const expiredCount = stokList.filter(s => isExpiringSoon(s.expired_date) || isExpired(s.expired_date) || s.jumlah === 0).length;

  return (
    <AdminLayout currentPage="/dashboard/stok" title="Stok Bahan Makanan" description="Kelola inventory bahan dapur MBG">
      {/* Alert */}
      {expiredCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">{expiredCount} bahan hampir expired, sudah expired, atau stok habis</p>
            <p className="text-xs text-amber-600 mt-0.5">Segera cek dan ganti bahan yang mendekati tanggal kadaluarsa atau stok yang sudah habis</p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        {canCreateStok && (
          <button onClick={() => { setEditingId(null); reset({ dapur_id: dapurList[0]?.id || 0, nama_bahan: '', jumlah: 0, satuan: 'kg', expired_date: '' }); setShowForm(true); }} className="btn-primary">
            <Plus size={16} /> Tambah Stok
          </button>
        )}
        <button onClick={() => setShowExpiredOnly(!showExpiredOnly)} className={`filter-btn ${showExpiredOnly ? 'filter-btn-active' : ''}`}>
          <AlertTriangle size={14} /> Perlu Perhatian ({expiredCount})
        </button>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Cari bahan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10!"
          />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel animate-fadeIn">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? 'Edit Stok' : 'Tambah Stok Baru'}</h2>
            <button onClick={handleCloseForm} className="btn-icon"><CloseIcon size={18} /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-grid">
              <div>
                <label className="form-label">Dapur</label>
                {isSupplier ? (
                  <input
                    type="hidden"
                    {...register('dapur_id', { required: true, valueAsNumber: true })}
                  />
                ) : null}
                <select
                  {...register('dapur_id', { required: true, valueAsNumber: true })}
                  className="select"
                  disabled={isSupplier}
                >
                  {dapurList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
                {isSupplier && (
                  <p className="text-xs text-zinc-500 mt-1">Dapur sudah otomatis dipilih</p>
                )}
              </div>
              <div>
                <label className="form-label">Nama Bahan</label>
                <input {...register('nama_bahan', { required: true })} className="input" placeholder="Beras, Ayam, dll" />
              </div>
              <div>
                <label className="form-label">Jumlah</label>
                <input {...register('jumlah', { required: true, valueAsNumber: true })} type="number" className="input" placeholder="100" />
              </div>
              <div>
                <label className="form-label">Satuan</label>
                <select {...register('satuan', { required: true })} className="select">
                  {satuanOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Tanggal Kadaluarsa</label>
                <input {...register('expired_date', { required: true })} type="date" className="input" />
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
                <th>Nama Bahan</th>
                <th>Dapur</th>
                <th className="text-right">Jumlah</th>
                <th>Kadaluarsa</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="loading-spinner"><div className="loading-spinner-inner"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="text-sm text-zinc-500">Memuat data...</p></div></div></td></tr>
              ) : filteredStok.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="empty-state"><div className="empty-state-icon"><Package size={24} /></div><p className="empty-state-title">Tidak ada stok bahan</p><p className="empty-state-text">Klik &quot;Tambah Stok&quot; untuk menambahkan bahan baru</p></div></td></tr>
              ) : (
                filteredStok.map((stok) => {
                  const expired = isExpired(stok.expired_date);
                  const expiringSoon = isExpiringSoon(stok.expired_date);
                  return (
                    <tr key={stok.id}>
                      <td className="font-medium text-zinc-900">{stok.nama_bahan}</td>
                      <td className="text-zinc-600">{stok.dapur_nama}</td>
                      <td className="text-right font-medium">{stok.jumlah.toLocaleString('id-ID')} <span className="text-zinc-400 font-normal">{stok.satuan}</span></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-zinc-400" />
                          {new Date(stok.expired_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const status = getStokStatus(stok);
                          return <span className={`badge ${status.badge}`}>{status.label}</span>;
                        })()}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEditStok && (
                            <button onClick={() => handleEdit(stok)} className="btn-icon" title="Edit"><Edit size={16} /></button>
                          )}
                          {canDeleteStok && (
                            <button onClick={() => handleDelete(stok.id)} className="btn-icon-danger" title="Hapus"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
