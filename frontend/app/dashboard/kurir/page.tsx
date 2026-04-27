'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { usePermissions } from '@/hooks/usePermissions';
import PengirimanUpdateForm from '@/components/PengirimanUpdateForm';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Navigation,
  X,
  Package,
  School,
  Store,
  StopCircle,
  Calendar,
} from 'lucide-react';

interface TugasPengiriman {
  id: number;
  jadwal_id: number;
  kurir_id: number;
  status: string;
  catatan: string;
  bukti_foto: string | null;
  latitude: number | null;
  longitude: number | null;
  tanggal: string;
  waktu_kirim: string;
  dapur_nama: string;
  sekolah_nama: string;
  sekolah_alamat: string;
  sekolah_latitude: number;
  sekolah_longitude: number;
}

interface SekolahInfo {
  id: number;
  nama: string;
  alamat: string;
  kecamatan: string;
  hari_kirim: string;
  jumlah_porsi: number;
}

export default function KurirPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isKurir } = usePermissions();
  const router = useRouter();
  const { sendLocation, isConnected } = useLiveTracking();

  const [tugasList, setTugasList] = useState<TugasPengiriman[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [dapurSekolahList, setDapurSekolahList] = useState<SekolahInfo[]>([]);
  const [dapurInfo, setDapurInfo] = useState<{ id: number; nama: string } | null>(null);

  // Location state
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Update modal
  const [selectedTugas, setSelectedTugas] = useState<TugasPengiriman | null>(null);
  const [updateStatus, setUpdateStatus] = useState('dalam_perjalanan');
  const [updateCatatan, setUpdateCatatan] = useState('');
  const [updateFoto, setUpdateFoto] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // View foto modal
  const [viewFoto, setViewFoto] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchTugas();
  }, [user, authLoading, filterStatus]);

  const activeTask = useMemo(
    () => tugasList.find((t) => t.status === 'dalam_perjalanan') || null,
    [tugasList]
  );

  // Auto-send location every 15s when tracking.
  // Always use the active task status from task list to avoid accidental status changes from modal state.
  useEffect(() => {
    if (!isTracking || currentLat === null || currentLng === null) return;
    const interval = setInterval(async () => {
      if (activeTask) {
        try {
          await sendLocation(
            activeTask.id,
            currentLat,
            currentLng,
            activeTask.status || 'dalam_perjalanan'
          );
          setLastUpdate(new Date().toLocaleTimeString('id-ID'));
        } catch (err) { console.error('Auto-send error:', err); }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isTracking, currentLat, currentLng, activeTask, sendLocation]);

  // Cleanup geolocation on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  const fetchTugas = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      
      // Backend sudah filter otomatis berdasarkan kurir_id yang login
      const response = await api.get('/pengiriman', { params });
      setTugasList(response.data);

      // Fetch info dapur dan sekolah yang terkait dengan kurir ini
      if (user?.id) {
        try {
          // Get dapur that this kurir is assigned to
          const dapurKurirRes = await api.get('/dapur-kurir', { params: { kurir_id: user.id } });
          if (dapurKurirRes.data.length > 0) {
            const firstDapur = dapurKurirRes.data[0];
            setDapurInfo({ id: firstDapur.dapur_id, nama: firstDapur.dapur_nama });

            // Get sekolah for this dapur
            const sekolahRes = await api.get(`/dapur/${firstDapur.dapur_id}/sekolah`);
            setDapurSekolahList(sekolahRes.data);
          }
        } catch (err) {
          console.error('Error fetching dapur/sekolah info:', err);
        }
      }
    } catch (error) { 
      console.error('Error:', error); 
    }
    finally { setLoading(false); }
  };

  // Geolocation functions
  const startTracking = useCallback(() => {
    if (isTracking || watchId !== null) return;
    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung di browser ini');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLat(position.coords.latitude);
        setCurrentLng(position.coords.longitude);
        setLocationError(null);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi.');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Lokasi tidak tersedia');
            break;
          case err.TIMEOUT:
            setLocationError('Timeout saat mengambil lokasi');
            break;
          default:
            setLocationError('Error lokasi tidak diketahui');
        }
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    setWatchId(id);
    setIsTracking(true);
  }, [isTracking, watchId]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); setWatchId(null); }
    setIsTracking(false);
  }, [watchId]);

  // Auto-start GPS when courier has an active delivery.
  // Browser still enforces permission rules; this only removes manual button dependency in normal flow.
  useEffect(() => {
    if (!activeTask) return;
    if (isTracking || watchId !== null) return;
    if (locationError?.toLowerCase().includes('izin lokasi ditolak')) return;
    startTracking();
  }, [activeTask, isTracking, watchId, locationError, startTracking]);

  // Auto-stop GPS when no active deliveries remain.
  useEffect(() => {
    if (activeTask) return;
    if (!isTracking) return;
    stopTracking();
  }, [activeTask, isTracking, stopTracking]);

  const sendLocationOnce = useCallback(async (pengirimanId: number) => {
    if (currentLat === null || currentLng === null) {
      setLocationError('Lokasi GPS belum tersedia');
      return;
    }
    try {
      await sendLocation(pengirimanId, currentLat, currentLng, updateStatus, updateCatatan || undefined);
      setLastUpdate(new Date().toLocaleTimeString('id-ID'));
      setLocationError(null);
    } catch (err: any) {
      setLocationError(err.message || 'Gagal mengirim lokasi');
    }
  }, [currentLat, currentLng, sendLocation, updateStatus, updateCatatan]);

  const handleUpdate = async (tugas: TugasPengiriman) => {
    setSelectedTugas(tugas);
    setUpdateStatus(tugas.status);
    setUpdateCatatan(tugas.catatan || '');
    setUpdateFoto(tugas.bukti_foto);
    setShowModal(true);
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTugas) return;

    try {
      // If status is changing to diterima/gagal, use the regular update
      if (updateStatus !== 'dalam_perjalanan' || updateFoto) {
        await api.put(`/pengiriman/${selectedTugas.id}`, {
          status: updateStatus,
          catatan: updateCatatan,
          bukti_foto: updateFoto,
          latitude: currentLat,
          longitude: currentLng,
        });
      } else {
        // Just send location
        await sendLocationOnce(selectedTugas.id);
      }

      alert('Pengiriman berhasil diupdate');
      setShowModal(false);
      fetchTugas();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal update pengiriman');
    }
  };

  const handleQuickStatus = async (tugas: TugasPengiriman, status: string) => {
    if (!confirm(`Tandai pengiriman sebagai "${status.replace('_', ' ')}"?`)) return;
    try {
      await api.put(`/pengiriman/${tugas.id}`, {
        status,
        catatan: updateCatatan || tugas.catatan,
        bukti_foto: tugas.bukti_foto,
        latitude: currentLat,
        longitude: currentLng,
      });
      alert(`Pengiriman ditandai: ${status.replace('_', ' ')}`);
      fetchTugas();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal update status');
    }
  };

  const getFotoUrl = (filename: string | null) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    // API_URL includes /api suffix, remove it for static file access
    const baseUrl = API_URL.replace(/\/api$/, '');
    return `${baseUrl}/uploads/${filename}`;
  };

  const statusConfig: Record<string, { badge: string; icon: typeof Truck; label: string }> = {
    dalam_perjalanan: { badge: 'badge-orange', icon: Truck, label: 'Dalam Perjalanan' },
    diterima: { badge: 'badge-green', icon: CheckCircle2, label: 'Diterima' },
    gagal: { badge: 'badge-red', icon: AlertTriangle, label: 'Gagal' },
  };

  const filterOptions = [
    { value: '', label: 'Semua' },
    { value: 'dalam_perjalanan', label: 'Dalam Perjalanan' },
    { value: 'diterima', label: 'Diterima' },
    { value: 'gagal', label: 'Gagal' },
  ];

  const aktifCount = tugasList.filter(t => t.status === 'dalam_perjalanan').length;

  return (
    <AdminLayout currentPage="/dashboard/kurir" title="Dashboard Kurir" description={`Selamat datang, ${user?.nama}`}>
      {/* Status bar */}
      <div className="filter-bar">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`filter-btn ${filterStatus === opt.value ? 'filter-btn-active' : ''}`}
          >
            {opt.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {/* GPS Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-zinc-500">{isConnected ? 'Online' : 'Offline'}</span>
          </div>
          {isTracking && (
            <span className="text-xs text-green-600 font-medium animate-pulse">
              📍 GPS Aktif
            </span>
          )}
        </div>
      </div>

      {/* GPS Control */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Navigation size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Kontrol Lokasi GPS</h3>
              {currentLat !== null && currentLng !== null ? (
                <p className="text-sm text-zinc-600 font-mono">
                  {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                </p>
              ) : (
                <p className="text-sm text-zinc-500">Lokasi belum tersedia</p>
              )}
              {lastUpdate && (
                <p className="text-xs text-zinc-500">Update: {lastUpdate}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isTracking ? (
              <button onClick={startTracking} className="btn-primary text-sm">
                <Navigation size={14} /> Mulai GPS
              </button>
            ) : (
              <button onClick={stopTracking} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition flex items-center gap-1.5">
                <StopCircle size={14} /> Stop GPS
              </button>
            )}
          </div>
        </div>
        {locationError && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-2 mt-3">
            <AlertTriangle size={14} />
            <span>{locationError}</span>
          </div>
        )}
      </div>

      {/* Sekolah Binaan Info */}
      {dapurSekolahList.length > 0 && dapurInfo && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <School size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Sekolah Binaan - {dapurInfo.nama}</p>
              <p className="text-xs text-green-600">{dapurSekolahList.length} sekolah yang dilayani</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dapurSekolahList.map((s) => (
              <div key={s.id} className="bg-white/60 rounded-lg px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">🏫 {s.nama}</p>
                  <p className="text-xs text-green-600">{s.kecamatan}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-700 font-medium">{s.jumlah_porsi} porsi</p>
                  <p className="text-[10px] text-green-500">
                    {(() => {
                      try {
                        const hari = JSON.parse(s.hari_kirim);
                        return hari.slice(0, 3).map((h: string) => h.charAt(0).toUpperCase() + h.slice(1, 3)).join(', ');
                      } catch { return ''; }
                    })()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active deliveries summary */}
      {aktifCount > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-orange-800">{aktifCount} pengiriman aktif</p>
              <p className="text-xs text-orange-600">Klik tombol ✏️ untuk update lokasi & status</p>
            </div>
          </div>
        </div>
      )}

      {/* Tugas List */}
      {loading ? (
        <div className="card p-12">
          <div className="loading-spinner">
            <div className="loading-spinner-inner">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-zinc-500">Memuat data...</p>
            </div>
          </div>
        </div>
      ) : tugasList.length === 0 ? (
        <div className="card p-12">
          <div className="empty-state">
            <div className="empty-state-icon"><Package size={24} /></div>
            <p className="empty-state-title">Tidak ada tugas pengiriman</p>
            <p className="empty-state-text">Belum ada pengiriman yang ditugaskan kepada Anda</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tugasList.map((tugas) => {
            const config = statusConfig[tugas.status] || statusConfig.dalam_perjalanan;
            const StatusIcon = config.icon;
            const fotoUrl = getFotoUrl(tugas.bukti_foto);
            const isAktif = tugas.status === 'dalam_perjalanan';

            return (
              <div key={tugas.id} className="card p-4 hover:border-zinc-300/80 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isAktif ? 'bg-orange-100' : tugas.status === 'diterima' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <StatusIcon size={20} className={
                      isAktif ? 'text-orange-600' : tugas.status === 'diterima' ? 'text-green-600' : 'text-red-600'
                    } />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                          <School size={14} className="text-blue-600" />
                          {tugas.sekolah_nama}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-zinc-600">
                          <Store size={12} className="text-green-600" />
                          <span>{tugas.dapur_nama}</span>
                        </div>
                      </div>
                      <span className={`badge ${config.badge} flex-shrink-0`}>
                        <StatusIcon size={10} />
                        {config.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        {new Date(tugas.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {tugas.waktu_kirim && ` • ${tugas.waktu_kirim}`}
                      </div>
                      {tugas.sekolah_alamat && (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} />
                          {tugas.sekolah_alamat}
                        </div>
                      )}
                    </div>

                    {/* Foto bukti */}
                    {fotoUrl && (
                      <div className="mt-2">
                        <button
                          onClick={() => setViewFoto(fotoUrl)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                        >
                          <Camera size={12} /> Lihat Foto Bukti
                        </button>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      {isAktif && (
                        <>
                          <button
                            onClick={() => handleUpdate(tugas)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 transition"
                          >
                            <Navigation size={12} />
                            Update Lokasi & Status
                          </button>
                          <button
                            onClick={() => handleQuickStatus(tugas, 'diterima')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition"
                          >
                            <CheckCircle2 size={12} />
                            Diterima
                          </button>
                          <button
                            onClick={() => handleQuickStatus(tugas, 'gagal')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition"
                          >
                            <AlertTriangle size={12} />
                            Gagal
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Update Modal */}
      {showModal && selectedTugas && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-[2100]">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Update Pengiriman</h2>
                <p className="text-sm text-zinc-500">{selectedTugas.sekolah_nama}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 rounded-lg transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitUpdate} className="p-6 space-y-4">
              {/* Send Location */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation size={16} className="text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Kirim Lokasi</h4>
                </div>
                {currentLat !== null && currentLng !== null && (
                  <p className="text-sm text-blue-700 font-mono mb-2">
                    📍 {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                  </p>
                )}
                <div className="flex gap-2">
                  {!isTracking ? (
                    <button
                      type="button"
                      onClick={startTracking}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                    >
                      <Navigation size={14} /> Live Mode
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopTracking}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                    >
                      <StopCircle size={14} /> Stop Live
                    </button>
                  )}
                </div>
                {isTracking && (
                  <p className="text-xs text-green-600 mt-2">
                    Live tracking aktif - mengirim lokasi setiap 15 detik
                  </p>
                )}
              </div>

              <PengirimanUpdateForm
                status={updateStatus}
                catatan={updateCatatan}
                foto={updateFoto}
                onStatusChange={setUpdateStatus}
                onCatatanChange={setUpdateCatatan}
                onFotoUpload={setUpdateFoto}
                onCancel={() => setShowModal(false)}
              />
            </form>
          </div>
        </div>
      )}

      {/* View Foto Modal */}
      {viewFoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewFoto(null)}>
          <div className="relative max-w-4xl w-full z-[2100]">
            <button onClick={() => setViewFoto(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300 flex items-center gap-2">
              <X size={20} />
              <span className="text-sm">Tutup</span>
            </button>
            <img src={viewFoto} alt="Bukti Pengiriman" className="w-full rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
