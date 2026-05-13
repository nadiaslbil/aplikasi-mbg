'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { toast } from 'sonner';
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
  Camera,
  X,
  Package,
  School,
  Store,
  StopCircle,
  Calendar,
  History,
  Info,
  ExternalLink,
  Signal,
  User,
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

type TabType = 'tugas' | 'riwayat' | 'info';

export default function KurirPage() {
  const { user } = useAuth();
  const { sendLocation, isConnected } = useLiveTracking();

  const [tugasList, setTugasList] = useState<TugasPengiriman[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('tugas');
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

  const activeTasks = useMemo(() => tugasList.filter(t => t.status === 'dalam_perjalanan'), [tugasList]);
  const historyTasks = useMemo(() => tugasList.filter(t => t.status !== 'dalam_perjalanan'), [tugasList]);
  const activeTaskForGPS = useMemo(() => activeTasks[0] || null, [activeTasks]);

  useEffect(() => {
    fetchTugas();
  }, []);

  // Auto-send location every 15s when tracking.
  useEffect(() => {
    if (!isTracking || currentLat === null || currentLng === null) return;
    const interval = setInterval(async () => {
      if (activeTaskForGPS) {
        try {
          await sendLocation(
            activeTaskForGPS.id,
            currentLat,
            currentLng,
            activeTaskForGPS.status || 'dalam_perjalanan'
          );
          setLastUpdate(new Date().toLocaleTimeString('id-ID'));
        } catch (err) { console.error('Auto-send error:', err); }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isTracking, currentLat, currentLng, activeTaskForGPS, sendLocation]);

  // Cleanup geolocation on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  const fetchTugas = async () => {
    try {
      const response = await api.get('/pengiriman', { params: { limit: 100 } });
      setTugasList(response.data.data);

      if (user?.id) {
        try {
          const dapurKurirRes = await api.get('/dapur-kurir', { params: { kurir_id: user.id } });
          if (Array.isArray(dapurKurirRes.data) && dapurKurirRes.data.length > 0) {
            const firstDapur = dapurKurirRes.data[0];
            setDapurInfo({ id: firstDapur.dapur_id, nama: firstDapur.dapur_nama });
            const sekolahRes = await api.get(`/dapur/${firstDapur.dapur_id}/sekolah`);
            setDapurSekolahList(sekolahRes.data);
          }
        } catch (err) {
          console.error('Error fetching dapur info:', err);
        }
      }
    } catch (error) { 
      console.error('Error:', error); 
    }
    finally { setLoading(false); }
  };

  const startTracking = useCallback(() => {
    if (isTracking || watchId !== null) return;
    if (!navigator.geolocation) {
      setLocationError('GPS tidak didukung');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLat(position.coords.latitude);
        setCurrentLng(position.coords.longitude);
        setLocationError(null);
      },
      (err) => {
        setLocationError(err.code === 1 ? 'Izin lokasi ditolak' : 'Gagal mengambil lokasi');
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

  useEffect(() => {
    if (!activeTaskForGPS) {
      if (isTracking) stopTracking();
      return;
    }
    if (!isTracking && !locationError) startTracking();
  }, [activeTaskForGPS, isTracking, locationError, startTracking, stopTracking]);

  const handleUpdate = (tugas: TugasPengiriman) => {
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
      await api.put(`/pengiriman/${selectedTugas.id}`, {
        status: updateStatus,
        catatan: updateCatatan,
        bukti_foto: updateFoto,
        latitude: currentLat,
        longitude: currentLng,
      });

      toast.success('Status berhasil diperbarui');
      setShowModal(false);
      fetchTugas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal update pengiriman');
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const getFotoUrl = (filename: string | null) => {
    if (!filename) return null;
    return filename.startsWith('http') ? filename : `${API_URL}/uploads/${filename}`;
  };

  const StatusIcon = ({ status, className }: { status: string, className?: string }) => {
    switch (status) {
      case 'dalam_perjalanan': return <Truck className={`${className} text-orange-600`} size={18} />;
      case 'diterima': return <CheckCircle2 className={`${className} text-emerald-600`} size={18} />;
      case 'gagal': return <AlertTriangle className={`${className} text-red-600`} size={18} />;
      default: return <Package className={`${className} text-zinc-400`} size={18} />;
    }
  };

  return (
    <AdminLayout currentPage="/dashboard/kurir" title="Portal Kurir" description="Kelola pengiriman harian Anda">
      {/* Quick Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm">
            <User size={24} className="text-zinc-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 leading-tight">{user?.nama || 'Kurir'}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-zinc-300'}`} />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {isConnected ? 'Sistem Online' : 'Sistem Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 border border-zinc-200 rounded-xl shadow-sm">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isTracking ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-50 text-zinc-500'}`}>
            <Signal size={14} className={isTracking ? 'animate-pulse' : ''} />
            <span className="text-xs font-bold uppercase tracking-tight">
              {isTracking ? 'GPS Aktif' : 'GPS Mati'}
            </span>
          </div>
          {!isTracking ? (
            <button onClick={startTracking} className="btn-primary py-1.5 text-xs px-3">Mulai</button>
          ) : (
            <button onClick={stopTracking} className="btn-secondary py-1.5 text-xs px-3 text-red-600 border-red-100 hover:bg-red-50">Stop</button>
          )}
        </div>
      </div>

      {locationError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <p className="font-medium">{locationError}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex p-1 bg-zinc-100 rounded-xl mb-6">
        {[
          { id: 'tugas', label: 'Tugas', icon: Truck, count: activeTasks.length },
          { id: 'riwayat', label: 'Riwayat', icon: History, count: historyTasks.length },
          { id: 'info', label: 'Sekolah', icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-zinc-200 text-zinc-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">Memperbarui data...</p>
          </div>
        ) : activeTab === 'tugas' ? (
          activeTasks.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-zinc-300" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Semua tugas selesai</h3>
              <p className="text-zinc-500 text-sm mt-1">Tidak ada pengiriman aktif untuk saat ini.</p>
            </div>
          ) : (
            activeTasks.map((tugas) => (
              <div key={tugas.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:border-zinc-300 transition-all">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Truck size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 leading-tight">{tugas.sekolah_nama}</h3>
                        <p className="text-xs font-medium text-zinc-500 mt-0.5 uppercase tracking-wide">{tugas.dapur_nama}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-zinc-900 bg-zinc-100 px-2 py-1 rounded-md">
                        {tugas.waktu_kirim || '--:--'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2.5 text-zinc-600">
                      <MapPin size={14} className="text-zinc-400" />
                      <span className="text-sm line-clamp-1">{tugas.sekolah_alamat || 'Alamat tidak tersedia'}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-zinc-600">
                      <Calendar size={14} className="text-zinc-400" />
                      <span className="text-sm">
                        {new Date(tugas.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openInMaps(tugas.sekolah_latitude, tugas.sekolah_longitude)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all"
                    >
                      <Navigation size={16} /> Buka Maps
                    </button>
                    <button
                      onClick={() => handleUpdate(tugas)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                    >
                      <CheckCircle2 size={16} /> Selesaikan
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : activeTab === 'riwayat' ? (
          historyTasks.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center shadow-sm">
              <History size={32} className="text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Belum ada riwayat pengiriman</p>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-zinc-100">
                {historyTasks.map((tugas) => (
                  <div key={tugas.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tugas.status === 'diterima' ? 'bg-emerald-50' : 'bg-red-50'
                      }`}>
                        <StatusIcon status={tugas.status} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-zinc-900 text-sm truncate">{tugas.sekolah_nama}</h4>
                        <p className="text-xs text-zinc-500">
                          {new Date(tugas.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {tugas.waktu_kirim}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                        tugas.status === 'diterima' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {tugas.status === 'diterima' ? 'Diterima' : 'Gagal'}
                      </span>
                      {tugas.bukti_foto && (
                        <button onClick={() => setViewFoto(getFotoUrl(tugas.bukti_foto))} className="text-blue-600 text-[10px] font-bold underline">Lihat Bukti</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          /* Info Sekolah Tab */
          <div className="space-y-4">
            <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-100">
              <div className="flex items-center gap-3 mb-1">
                <Store size={20} className="text-blue-100" />
                <h3 className="font-bold">{dapurInfo?.nama || 'Dapur Supplier'}</h3>
              </div>
              <p className="text-blue-100 text-xs font-medium">Melayani {dapurSekolahList.length} sekolah di wilayah Banjarnegara</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {dapurSekolahList.map((s) => (
                <div key={s.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center">
                        <School size={16} className="text-zinc-600" />
                      </div>
                      <h4 className="font-bold text-zinc-900 text-sm">{s.nama}</h4>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {s.jumlah_porsi} porsi
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <MapPin size={12} />
                    <span className="truncate">{s.kecamatan} • {s.alamat}</span>
                  </div>
                  <div className="mt-3 flex gap-1.5 flex-wrap">
                    {(() => {
                      try {
                        return JSON.parse(s.hari_kirim).map((h: string) => (
                          <span key={h} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px] font-bold uppercase">
                            {h.substring(0, 3)}
                          </span>
                        ));
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {showModal && selectedTugas && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Selesaikan Tugas</h2>
                <p className="text-sm font-medium text-zinc-500">{selectedTugas.sekolah_nama}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center bg-zinc-50 rounded-full text-zinc-400 hover:text-zinc-600 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitUpdate} className="p-6">
              <div className="mb-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Navigation size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Lokasi GPS Terkini</p>
                    <p className="text-sm font-bold text-blue-700 font-mono">
                      {currentLat?.toFixed(6) || '0.000000'}, {currentLng?.toFixed(6) || '0.000000'}
                    </p>
                  </div>
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewFoto && (
        <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewFoto(null)}>
          <div className="relative max-w-2xl w-full">
            <button onClick={() => setViewFoto(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold">
              <X size={24} /> Tutup
            </button>
            <img src={viewFoto} alt="Bukti Foto" className="w-full h-auto rounded-2xl shadow-2xl border-4 border-white/10" />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
