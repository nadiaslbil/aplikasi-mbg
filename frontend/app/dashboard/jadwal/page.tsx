'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2, X as CloseIcon, Search, Calendar, Clock, Truck, Zap, AlertCircle, PlayCircle, Filter, CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface Jadwal {
  id: number;
  dapur_id: number;
  sekolah_id: number;
  tanggal: string;
  waktu_kirim: string;
  jumlah_porsi: number;
  status: string;
  catatan: string;
  dapur_nama: string;
  sekolah_nama: string;
  kurir_nama: string | null;
  pengiriman_id: number | null;
}

interface JadwalForm {
  dapur_id: number;
  sekolah_id: number;
  tanggal: string;
  waktu_kirim: string;
  jumlah_porsi: number;
  catatan: string;
  kurir_id: number;
}

interface Dapur { id: number; nama: string; }
interface Sekolah { id: number; nama: string; }
interface Kurir { id: number; nama: string; email: string; }

const statusBadge: Record<string, string> = {
  dalam_pengiriman: 'badge-orange',
  terjadwal: 'badge-blue',
  diterima: 'badge-green',
  gagal: 'badge-red',
};

const statusLabel: Record<string, string> = {
  dalam_pengiriman: 'Dalam Pengiriman',
  terjadwal: 'Terjadwal',
  diterima: 'Diterima',
  gagal: 'Gagal',
};

const statusIcon: Record<string, typeof Truck> = {
  dalam_pengiriman: Truck,
  terjadwal: Calendar,
  diterima: CheckCircle2,
  gagal: AlertTriangle,
};

export default function JadwalPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { canCreateJadwal, canEditJadwal, canDeleteJadwal, isKurir } = usePermissions();
  const router = useRouter();
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dapurList, setDapurList] = useState<Dapur[]>([]);
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [kurirList, setKurirList] = useState<Kurir[]>([]);
  const [filterTanggal, setFilterTanggal] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateResult, setGenerateResult] = useState<any>(null);
  const [startingDelivery, setStartingDelivery] = useState<number | null>(null);

  const { register, handleSubmit, reset } = useForm<JadwalForm>();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchAll();
  }, [user, authLoading, filterTanggal, filterStatus]);

  const fetchAll = async () => {
    try {
      const params: any = {};
      if (filterTanggal) params.tanggal = filterTanggal;
      if (filterStatus) params.status = filterStatus;
      
      const fetchPromises: Promise<any>[] = [
        api.get('/jadwal', { params }),
        api.get('/dapur'),
        api.get('/sekolah'),
      ];

      // Only fetch kurir list if user has permission (admin roles)
      const isAdmin = user?.role === 'admin_bgn' || user?.role === 'admin_daerah';
      if (isAdmin) {
        fetchPromises.push(api.get('/kurir'));
      } else {
        fetchPromises.push(Promise.resolve({ data: [] }));
      }

      const [jadwalRes, dapurRes, sekolahRes, kurirRes] = await Promise.all(fetchPromises);
      setJadwalList(jadwalRes.data);
      setDapurList(dapurRes.data);
      setSekolahList(sekolahRes.data);
      setKurirList(kurirRes.data);
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); }
  };

  const onSubmit = async (data: JadwalForm) => {
    try {
      const payload = { ...data, kurir_id: data.kurir_id === 0 ? undefined : data.kurir_id };
      if (editingId) await api.put(`/jadwal/${editingId}`, payload);
      else await api.post('/jadwal', payload);
      fetchAll();
      handleCloseForm();
    } catch (error: any) { alert(error.response?.data?.error || 'Terjadi kesalahan'); }
  };

  const handleEdit = (jadwal: Jadwal) => {
    setEditingId(jadwal.id);
    reset({
      dapur_id: jadwal.dapur_id,
      sekolah_id: jadwal.sekolah_id,
      tanggal: jadwal.tanggal,
      waktu_kirim: jadwal.waktu_kirim,
      jumlah_porsi: jadwal.jumlah_porsi,
      catatan: jadwal.catatan,
      kurir_id: 0,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus jadwal ini?')) return;
    try { await api.delete(`/jadwal/${id}`); fetchAll(); }
    catch (error: any) { alert(error.response?.data?.error || 'Terjadi kesalahan'); }
  };

  const handleCloseForm = () => { setShowForm(false); setEditingId(null); reset(); };

  const handleGenerateWeekly = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/jadwal/generate-weekly', {
        auto_assign_kurir: true
      });
      setGenerateResult(response.data);
      setShowGenerateModal(true);
      fetchAll(); // Refresh jadwal
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Gagal generate jadwal. Pastikan penugasan sekolah ke dapur dan kurir ke dapur sudah dibuat.';
      alert(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleStartDelivery = async (jadwalId: number, kurirId?: number) => {
    try {
      setStartingDelivery(jadwalId);
      
      // Jika user adalah kurir, otomatis pakai ID mereka
      // Jika admin, prompt untuk ID kurir (jika tidak disediakan)
      let finalKurirId = kurirId;
      if (user?.role === 'kurir') {
        finalKurirId = user.id;
      } else if (!finalKurirId) {
        const kurirInput = prompt('Masukkan ID Kurir:');
        if (!kurirInput) return;
        finalKurirId = parseInt(kurirInput);
      }

      await api.post('/pengiriman', { jadwal_id: jadwalId, kurir_id: finalKurirId });
      fetchAll();
      alert('✅ Pengiriman berhasil dimulai! Status berubah menjadi "Dalam Pengiriman"');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal mulai pengiriman');
    } finally {
      setStartingDelivery(null);
    }
  };

  return (
    <AdminLayout currentPage="/dashboard/jadwal" title="Jadwal Distribusi" description="Kelola jadwal pengiriman MBG ke sekolah">
      {/* Filter bar */}
      <div className="filter-bar flex-wrap gap-2">
        {canCreateJadwal && (
          <button onClick={() => { setEditingId(null); reset({ dapur_id: dapurList[0]?.id || 0, sekolah_id: sekolahList[0]?.id || 0, tanggal: new Date().toISOString().split('T')[0], waktu_kirim: '07:00', jumlah_porsi: 100, catatan: '', kurir_id: 0 }); setShowForm(true); }} className="btn-primary">
            <Plus size={16} /> Tambah Jadwal
          </button>
        )}
        {canCreateJadwal && (
          <button 
            onClick={handleGenerateWeekly} 
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
          >
            <Zap size={16} />
            {generating ? 'Generating...' : 'Generate Jadwal Mingguan'}
          </button>
        )}
        
        {/* Filters */}
        <div className="flex items-center gap-2 ml-auto">
          <Filter size={14} className="text-zinc-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input text-sm"
          >
            <option value="">Semua Status</option>
            <option value="dalam_pengiriman">Dalam Pengiriman</option>
            <option value="terjadwal">Terjadwal</option>
            <option value="diterima">Diterima</option>
            <option value="gagal">Gagal</option>
          </select>
          
          <Calendar size={16} className="text-zinc-400" />
          <input type="date" value={filterTanggal} onChange={(e) => setFilterTanggal(e.target.value)} className="input" />
          
          {(filterStatus || filterTanggal) && (
            <button 
              onClick={() => { setFilterStatus(''); setFilterTanggal(''); }}
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel animate-fadeIn">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</h2>
            <button onClick={handleCloseForm} className="btn-icon"><CloseIcon size={18} /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-grid">
              <div>
                <label className="form-label">Dapur</label>
                <select {...register('dapur_id', { required: true, valueAsNumber: true })} className="select">
                  {dapurList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Sekolah</label>
                <select {...register('sekolah_id', { required: true, valueAsNumber: true })} className="select">
                  {sekolahList.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Tanggal</label>
                <input {...register('tanggal', { required: true })} type="date" className="input" />
              </div>
              <div>
                <label className="form-label">Waktu Kirim</label>
                <input {...register('waktu_kirim')} type="time" className="input" />
              </div>
              <div>
                <label className="form-label">Jumlah Porsi</label>
                <input {...register('jumlah_porsi', { required: true, valueAsNumber: true })} type="number" className="input" placeholder="100" />
              </div>
              <div>
                <label className="form-label">Kurir (Opsional)</label>
                <select {...register('kurir_id', { valueAsNumber: true })} className="select">
                  <option value={0}>-- Pilih Kurir --</option>
                  {kurirList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Catatan</label>
                <textarea {...register('catatan')} rows={2} className="textarea" placeholder="Catatan tambahan..." />
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
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Dapur</th>
                <th>Sekolah</th>
                <th className="text-right">Porsi</th>
                <th>Kurir</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><div className="loading-spinner"><div className="loading-spinner-inner"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="text-sm text-zinc-500">Memuat data...</p></div></div></td></tr>
              ) : jadwalList.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12"><div className="empty-state"><div className="empty-state-icon"><Calendar size={24} /></div><p className="empty-state-title">Tidak ada jadwal</p><p className="empty-state-text">Klik &quot;Tambah Jadwal&quot; untuk membuat jadwal baru</p></div></td></tr>
              ) : (
                jadwalList.map((jadwal) => (
                  <tr key={jadwal.id}>
                    <td className="font-medium text-zinc-900">{new Date(jadwal.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td><div className="flex items-center gap-1.5 text-zinc-500"><Clock size={14} />{jadwal.waktu_kirim || '-'}</div></td>
                    <td className="text-zinc-600">{jadwal.dapur_nama}</td>
                    <td className="font-medium text-zinc-900">{jadwal.sekolah_nama}</td>
                    <td className="text-right font-medium">{jadwal.jumlah_porsi.toLocaleString('id-ID')}</td>
                    <td className="text-zinc-500 text-sm">{jadwal.kurir_nama || <span className="text-amber-600 italic">Belum ada</span>}</td>
                    <td>
                      <span className={`badge ${statusBadge[jadwal.status] || 'badge-gray'}`}>
                        {(() => {
                          const IconComponent = statusIcon[jadwal.status] || Calendar;
                          return <IconComponent size={12} />;
                        })()}
                        {statusLabel[jadwal.status] || jadwal.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Tombol Mulai Pengiriman - Admin & Kurir bisa mulai */}
                        {jadwal.status === 'terjadwal' && (canCreateJadwal || isKurir) && (
                          <button
                            onClick={() => handleStartDelivery(jadwal.id)}
                            disabled={startingDelivery === jadwal.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
                            title="Mulai Pengiriman"
                          >
                            {startingDelivery === jadwal.id ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                Mulai...
                              </>
                            ) : (
                              <>
                                <PlayCircle size={14} />
                                Mulai
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Status badge dengan info */}
                        {jadwal.status === 'dalam_pengiriman' && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium flex items-center gap-1">
                            <Truck size={12} />
                            Sedang Jalan
                          </span>
                        )}
                        {jadwal.status === 'diterima' && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Selesai
                          </span>
                        )}
                        
                        {canEditJadwal && jadwal.status === 'terjadwal' && (
                          <button onClick={() => handleEdit(jadwal)} className="btn-icon" title="Edit"><Edit size={16} /></button>
                        )}
                        {canDeleteJadwal && jadwal.status === 'terjadwal' && (
                          <button onClick={() => handleDelete(jadwal.id)} className="btn-icon-danger" title="Hapus"><Trash2 size={16} /></button>
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

      {/* Modal Hasil Generate */}
      {showGenerateModal && generateResult && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8 relative z-[2100]">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Hasil Generate Jadwal</h2>
                  <p className="text-sm text-gray-500">{generateResult.date_range}</p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <CloseIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Berhasil Dibuat</p>
                  <p className="text-2xl font-bold text-green-700">{generateResult.created}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Dilewati (Duplikat)</p>
                  <p className="text-2xl font-bold text-gray-700">{generateResult.skipped}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 col-span-2 md:col-span-1">
                  <p className="text-sm text-blue-600">Total Jadwal</p>
                  <p className="text-2xl font-bold text-blue-700">{generateResult.jadwal?.length || 0}</p>
                </div>
              </div>

              {/* Schedule by Day */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Detail Jadwal per Hari</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(generateResult.summary || {}).map(([day, schedules]: [string, any]) => (
                    <div key={day} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900 capitalize">{day} ({schedules.length} jadwal)</h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {(schedules as any[]).map((s: any) => (
                          <div key={s.id} className="px-4 py-2 text-sm flex items-center justify-between">
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">{s.dapur}</span>
                              <span className="text-gray-500"> → </span>
                              <span className="font-medium text-gray-900">{s.sekolah}</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {s.waktu}
                              </span>
                              <span className="font-medium">{s.porsi} porsi</span>
                              <span className="text-blue-600 flex items-center gap-1">
                                <Truck size={14} />
                                {s.kurir}
                              </span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                                {s.status === 'terjadwal' ? (
                                  <>
                                    <Calendar size={12} />
                                    Terjadwal
                                  </>
                                ) : (
                                  s.status
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning if no kurir */}
              {generateResult.jadwal?.some((j: any) => j.kurir === 'Belum ada') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Beberapa jadwal belum ada kurir</p>
                    <p className="text-xs text-amber-700 mt-1">Lakukan penugasan kurir ke dapur terlebih dahulu di menu &quot;Penugasan Kurir&quot;</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                Lihat Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
