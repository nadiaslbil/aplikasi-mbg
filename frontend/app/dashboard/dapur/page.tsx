'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2, X as CloseIcon, Search, Store } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface Dapur {
  id: number;
  nama: string;
  alamat: string;
  latitude: number;
  longitude: number;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kapasitas_harian: number;
  kontak: string;
  penanggung_jawab: string;
  status: string;
  user_id: number | null;
  sekolahList?: SekolahDapur[];
}

interface SekolahDapur {
  id: number;
  nama: string;
  alamat: string;
  kecamatan: string;
  jumlah_porsi: number;
  hari_kirim: string;
}

interface DapurForm {
  nama: string;
  alamat: string;
  latitude: number;
  longitude: number;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kapasitas_harian: number;
  kontak: string;
  penanggung_jawab: string;
  status: string;
  user_id: number;
}

interface Supplier { id: number; nama: string; email: string; }

export default function DapurPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { canCreateDapur, canEditDapur, canDeleteDapur } = usePermissions();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<Dapur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);

  const { register, handleSubmit, reset, setValue } = useForm<DapurForm>();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchDapur();
  }, [user, authLoading]);

  const fetchDapur = async () => {
    try {
      const fetchPromises: Promise<any>[] = [api.get('/dapur')];

      // Only fetch supplier list if user is admin (supplier can't assign users)
      if (user?.role === 'admin_bgn' || user?.role === 'admin_daerah') {
        fetchPromises.push(api.get('/users', { params: { role: 'supplier' } }));
      } else {
        fetchPromises.push(Promise.resolve({ data: [] }));
      }

      const [dapurRes, supplierRes] = await Promise.all(fetchPromises);
      const dapurs = dapurRes.data;

      // Fetch sekolah for each dapur
      const dapurWithSekolah = await Promise.all(
        dapurs.map(async (d: Dapur) => {
          try {
            const sekolahRes = await api.get(`/dapur/${d.id}/sekolah`);
            return { ...d, sekolahList: sekolahRes.data };
          } catch {
            return { ...d, sekolahList: [] };
          }
        })
      );

      setDapurList(dapurWithSekolah);
      setSupplierList(supplierRes.data);
    } catch (error) {
      console.error('Error fetching dapur:', error);
    }
    finally { setLoading(false); }
  };

  const onSubmit = async (data: DapurForm) => {
    try {
      const payload = { ...data, user_id: data.user_id === 0 ? null : data.user_id };
      if (editingId) await api.put(`/dapur/${editingId}`, payload);
      else await api.post('/dapur', payload);
      fetchDapur();
      handleCloseForm();
    } catch (error: any) { alert(error.response?.data?.error || 'Terjadi kesalahan'); }
  };

  const handleEdit = (dapur: Dapur) => {
    setEditingId(dapur.id);
    Object.keys(dapur).forEach(key => {
      setValue(key as keyof DapurForm, (dapur as any)[key]);
    });
    // Set user_id untuk edit mode
    setValue('user_id', (dapur as any).user_id || 0);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus dapur ini?')) return;
    try { await api.delete(`/dapur/${id}`); fetchDapur(); }
    catch (error: any) { alert(error.response?.data?.error || 'Terjadi kesalahan'); }
  };

  const handleCloseForm = () => { setShowForm(false); setEditingId(null); reset(); };

  const filteredDapur = dapurList.filter((d) =>
    d.nama.toLowerCase().includes(search.toLowerCase()) ||
    d.kecamatan.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout currentPage="/dashboard/dapur" title="Data Dapur Supplier" description="Kelola data dapur pemasok MBG di Banjarnegara">
      {/* Filter bar */}
      <div className="filter-bar">
        {canCreateDapur && (
          <button onClick={() => { setEditingId(null); reset({ nama: '', alamat: '', latitude: 0, longitude: 0, kecamatan: '', kabupaten: 'Banjarnegara', provinsi: 'Jawa Tengah', kapasitas_harian: 0, kontak: '', penanggung_jawab: '', status: 'aktif', user_id: 0 }); setShowForm(true); }} className="btn-primary">
            <Plus size={16} /> Tambah Dapur
          </button>
        )}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Cari dapur..."
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
            <h2 className="panel-title">{editingId ? 'Edit Dapur' : 'Tambah Dapur Baru'}</h2>
            <button onClick={handleCloseForm} className="btn-icon"><CloseIcon size={18} /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-grid">
              <div>
                <label className="form-label">Nama Dapur</label>
                <input {...register('nama', { required: true })} className="input" placeholder="Dapur MBG Banjarnegara" />
              </div>
              <div>
                <label className="form-label">Penanggung Jawab</label>
                <input {...register('penanggung_jawab')} className="input" placeholder="Nama PJ" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Alamat</label>
                <input {...register('alamat', { required: true })} className="input" placeholder="Jl. Contoh No. 123" />
              </div>
              {(user?.role === 'admin_bgn' || user?.role === 'admin_daerah') && (
                <div>
                  <label className="form-label">Supplier (User)</label>
                  <select {...register('user_id', { valueAsNumber: true })} className="select">
                    <option value={0}>-- Pilih Supplier (Opsional) --</option>
                    {supplierList.map((s) => (
                      <option key={s.id} value={s.id}>{s.nama} ({s.email})</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Pilih user supplier yang akan mengelola dapur ini</p>
                </div>
              )}
              <div>
                <label className="form-label">Kecamatan</label>
                <input {...register('kecamatan', { required: true })} className="input" placeholder="Banjarnegara" />
              </div>
              <div>
                <label className="form-label">Kapasitas Harian (porsi)</label>
                <input {...register('kapasitas_harian', { valueAsNumber: true })} type="number" className="input" placeholder="1000" />
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
                <label className="form-label">Kontak</label>
                <input {...register('kontak')} className="input" placeholder="08123456789" />
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
                <th>Nama Dapur</th>
                <th>Sekolah Binaan (4)</th>
                <th className="hidden md:table-cell">Kecamatan</th>
                <th className="text-right">Kapasitas</th>
                <th className="hidden lg:table-cell">Penanggung Jawab</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="loading-spinner"><div className="loading-spinner-inner"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="text-sm text-zinc-500">Memuat data...</p></div></div></td></tr>
              ) : filteredDapur.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="empty-state"><div className="empty-state-icon"><Store size={24} /></div><p className="empty-state-title">Tidak ada data dapur</p><p className="empty-state-text">Klik &quot;Tambah Dapur&quot; untuk menambahkan data baru</p></div></td></tr>
              ) : (
                filteredDapur.map((dapur) => (
                  <tr key={dapur.id}>
                    <td className="font-medium text-zinc-900">{dapur.nama}</td>
                    <td>
                      <div className="space-y-1">
                        {dapur.sekolahList && dapur.sekolahList.length > 0 ? (
                          dapur.sekolahList.map((s) => (
                            <div key={s.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              🏫 {s.nama} <span className="text-blue-500">• {s.kecamatan}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-amber-600 italic">Belum ada sekolah</span>
                        )}
                      </div>
                    </td>
                    <td className="text-zinc-600">{dapur.kecamatan}</td>
                    <td className="text-right font-medium">{dapur.kapasitas_harian.toLocaleString('id-ID')} <span className="text-zinc-400 font-normal">porsi/hari</span></td>
                    <td className="hidden lg:table-cell text-zinc-500">{dapur.penanggung_jawab || '-'}</td>
                    <td><span className={`badge ${dapur.status === 'aktif' ? 'badge-green' : 'badge-red'}`}>{dapur.status}</span></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEditDapur && (
                          <button onClick={() => handleEdit(dapur)} className="btn-icon" title="Edit"><Edit size={16} /></button>
                        )}
                        {canDeleteDapur && (
                          <button onClick={() => handleDelete(dapur.id)} className="btn-icon-danger" title="Hapus"><Trash2 size={16} /></button>
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
    </AdminLayout>
  );
}
