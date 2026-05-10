'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Plus, X as CloseIcon, AlertTriangle, Calendar, School, Store, Edit, CheckCircle, Clock, XCircle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface Insiden {
  id: number;
  sekolah_id: number | null;
  dapur_id: number | null;
  tipe: string;
  deskripsi: string;
  tanggal: string;
  status: string;
  sekolah_nama: string;
  dapur_nama: string;
}

interface InsidenForm {
  sekolah_id: number;
  dapur_id: number;
  tipe: string;
  deskripsi: string;
  tanggal: string;
}

interface Sekolah { id: number; nama: string; }
interface Dapur { id: number; nama: string; }

const statusBadge: Record<string, string> = {
  laporan_masuk: 'badge-yellow',
  ditindaklanjuti: 'badge-blue',
  selesai: 'badge-green',
};

const statusLabel: Record<string, string> = {
  laporan_masuk: 'Laporan Masuk',
  ditindaklanjuti: 'Ditindaklanjuti',
  selesai: 'Selesai',
};

export default function InsidenPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { canCreateInsiden, canUpdateInsiden } = usePermissions();
  const router = useRouter();
  const [insidenList, setInsidenList] = useState<Insiden[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [dapurList, setDapurList] = useState<Dapur[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [userDapurId, setUserDapurId] = useState<number | null>(null);

  // Check if user is kurir or supplier
  const isKurir = user?.role === 'kurir';
  const isSupplier = user?.role === 'supplier';
  const isAdmin = user?.role === 'admin_bgn' || user?.role === 'admin_daerah';

  const { register, handleSubmit, reset } = useForm<InsidenForm>();

  // Auto-set dapur_id for kurir & supplier
  useEffect(() => {
    if ((isKurir || isSupplier) && user && dapurList.length > 0) {
      const myDapur = dapurList.find(d => {
        // For supplier, match user_id
        if (isSupplier) return (d as any).user_id === user.id;
        // For kurir, we'll set it after fetching
        return false;
      });
      if (myDapur) {
        setUserDapurId(myDapur.id);
      }
    }
  }, [dapurList, isKurir, isSupplier, user]);

  // Update status modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedInsiden, setSelectedInsiden] = useState<Insiden | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchAll();
  }, [user, authLoading, filterStatus]);

  const fetchAll = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const [insidenRes, sekolahRes, dapurRes] = await Promise.all([
        api.get('/insiden', { params }),
        api.get('/sekolah'),
        api.get('/dapur'),
      ]);
      
      setInsidenList(Array.isArray(insidenRes.data) ? insidenRes.data : []);
      
      // Handle paginated response for sekolah
      const sekolahData = sekolahRes.data.data || (Array.isArray(sekolahRes.data) ? sekolahRes.data : []);
      setSekolahList(sekolahData);
      
      setDapurList(Array.isArray(dapurRes.data) ? dapurRes.data : []);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const onSubmit = async (data: InsidenForm) => {
    try {
      await api.post('/insiden', data);
      toast.success('Laporan insiden berhasil dibuat');
      fetchAll();
      handleCloseForm();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Terjadi kesalahan'); }
  };

  const handleUpdateStatus = (insiden: Insiden) => {
    setSelectedInsiden(insiden);
    setUpdateStatus(insiden.status);
    setShowUpdateModal(true);
  };

  const handleSubmitUpdate = async () => {
    if (!selectedInsiden) return;
    try {
      await api.put(`/insiden/${selectedInsiden.id}`, { status: updateStatus });
      toast.success('Status insiden berhasil diupdate');
      setShowUpdateModal(false);
      fetchAll();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal update status');
    }
  };

  const handleCloseForm = () => { setShowForm(false); reset(); };

  return (
    <AdminLayout currentPage="/dashboard/insiden" title="Laporan Insiden" description="Kelola laporan masalah dan tindak lanjut">
      {/* Filter bar */}
      <div className="filter-bar">
        {canCreateInsiden && (
          <button onClick={() => {
            // Auto-find dapur for kurir/supplier
            let autoDapurId = 0;
            if (isKurir || isSupplier) {
              // Find user's dapur from existing insiden or dapur list
              const userDapur = dapurList.find(d => {
                if (isSupplier) return (d as any).user_id === user?.id;
                // For kurir, we'll let backend handle it
                return false;
              });
              autoDapurId = userDapur?.id || 0;
            }
            
            reset({ 
              sekolah_id: sekolahList[0]?.id || 0, 
              dapur_id: autoDapurId, 
              tipe: 'Keterlambatan', 
              deskripsi: '', 
              tanggal: new Date().toISOString().split('T')[0] 
            }); 
            setShowForm(true); 
          }} className="btn-danger">
            <Plus size={16} /> Lapor Insiden
          </button>
        )}
        <div className="ml-auto">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="select">
            <option value="">Semua Status</option>
            <option value="laporan_masuk">Laporan Masuk</option>
            <option value="ditindaklanjuti">Ditindaklanjuti</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
      </div>

      {/* Info Banner for Non-Admin */}
      {(isKurir || isSupplier) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <Store size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">Mode Tampilan: Insiden Dapur Anda</h3>
            <p className="text-sm text-blue-700 mt-1">
              Anda hanya melihat insiden dari dapur Anda. Dapur sudah otomatis dipilih saat melapor.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="panel animate-fadeIn">
          <div className="panel-header">
            <h2 className="panel-title">Lapor Insiden Baru</h2>
            <button onClick={handleCloseForm} className="btn-icon"><CloseIcon size={18} /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-grid">
              <div>
                <label className="form-label">Sekolah</label>
                <select {...register('sekolah_id', { valueAsNumber: true })} className="select">
                  <option value={0}>-- Pilih Sekolah --</option>
                  {sekolahList.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Dapur</label>
                {isKurir || isSupplier ? (
                  <>
                    <input
                      type="hidden"
                      {...register('dapur_id', { valueAsNumber: true })}
                    />
                    <div className="input bg-zinc-50 text-zinc-600 cursor-not-allowed">
                      {dapurList.find(d => d.id === (isSupplier ? dapurList.find(sd => (sd as any).user_id === user?.id)?.id : 0))?.nama || 'Otomatis dari dapur Anda'}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Dapur sudah otomatis dipilih</p>
                  </>
                ) : (
                  <select {...register('dapur_id', { valueAsNumber: true })} className="select">
                    <option value={0}>-- Pilih Dapur --</option>
                    {dapurList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="form-label">Tipe Insiden</label>
                <select {...register('tipe', { required: true })} className="select">
                  <option value="Keterlambatan">Keterlambatan</option>
                  <option value="Kualitas">Kualitas Makanan</option>
                  <option value="Kuantitas">Jumlah Kurang</option>
                  <option value="Kerusakan">Kerusakan Kemasan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="form-label">Tanggal</label>
                <input {...register('tanggal', { required: true })} type="date" className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Deskripsi</label>
                <textarea {...register('deskripsi', { required: true })} rows={3} className="textarea" placeholder="Jelaskan detail insiden..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5 pt-5 border-t border-zinc-200/80">
              <button type="button" onClick={handleCloseForm} className="btn-secondary">Batal</button>
              <button type="submit" className="btn-danger">Laporkan</button>
            </div>
          </form>
        </div>
      )}

      {/* Insiden list - card style */}
      <div className="space-y-3">
        {loading ? (
          <div className="card p-12"><div className="loading-spinner"><div className="loading-spinner-inner"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="text-sm text-zinc-500">Memuat data...</p></div></div></div>
        ) : insidenList.length === 0 ? (
          <div className="card p-12"><div className="empty-state"><div className="empty-state-icon"><AlertTriangle size={24} /></div><p className="empty-state-title">Tidak ada insiden</p><p className="empty-state-text">Semua distribusi berjalan lancar</p></div></div>
        ) : (
          insidenList.map((insiden) => (
            <div key={insiden.id} className="card p-4 hover:border-zinc-300/80 transition-colors animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-900">{insiden.tipe}</h3>
                      <p className="text-sm text-zinc-600 mt-1">{insiden.deskripsi}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge ${statusBadge[insiden.status] || 'badge-gray'}`}>
                        {statusLabel[insiden.status] || insiden.status}
                      </span>
                      {canUpdateInsiden && (
                        <button
                          onClick={() => handleUpdateStatus(insiden)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Update Status"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {new Date(insiden.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {insiden.sekolah_nama && (
                      <div className="flex items-center gap-1.5">
                        <School size={12} />
                        {insiden.sekolah_nama}
                      </div>
                    )}
                    {insiden.dapur_nama && (
                      <div className="flex items-center gap-1.5">
                        <Store size={12} />
                        {insiden.dapur_nama}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Update Status Modal */}
      {showUpdateModal && selectedInsiden && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative z-[2100]">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Update Status Insiden</h2>
                <p className="text-sm text-zinc-500">{selectedInsiden.tipe}</p>
              </div>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current status */}
              <div className="p-3 bg-zinc-50 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Status Saat Ini:</p>
                <span className={`badge ${statusBadge[selectedInsiden.status] || 'badge-gray'}`}>
                  {statusLabel[selectedInsiden.status] || selectedInsiden.status}
                </span>
              </div>

              {/* New status selector */}
              <div>
                <label className="form-label">Status Baru</label>
                <div className="space-y-2">
                  {[
                    { value: 'laporan_masuk', label: 'Laporan Masuk', icon: Clock, color: 'text-yellow-700', bg: 'hover:bg-yellow-50 border-yellow-200' },
                    { value: 'ditindaklanjuti', label: 'Ditindaklanjuti', icon: Edit, color: 'text-blue-700', bg: 'hover:bg-blue-50 border-blue-200' },
                    { value: 'selesai', label: 'Selesai', icon: CheckCircle, color: 'text-green-700', bg: 'hover:bg-green-50 border-green-200' },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isSelected = updateStatus === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setUpdateStatus(option.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                          isSelected
                            ? `${option.bg} ${option.color} border-current`
                            : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-white/50' : 'bg-zinc-100'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <span className="font-medium">{option.label}</span>
                        {isSelected && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 rounded-full bg-current flex items-center justify-center">
                              <CheckCircle size={12} className="text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmitUpdate}
                  className="btn-primary flex-1"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
