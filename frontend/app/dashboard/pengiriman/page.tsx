'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { toast } from 'sonner';
import { API_URL } from '@/lib/config';
import CourierLocationUpdater from '@/components/CourierLocationUpdater';
import PengirimanUpdateForm from '@/components/PengirimanUpdateForm';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
  Edit,
  X,
  Eye,
  Calendar,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Pengiriman {
  id: number;
  jadwal_id: number;
  kurir_id: number;
  kurir_nama: string;
  status: string;
  catatan: string;
  bukti_foto: string | null;
  tanggal: string;
  waktu_kirim: string;
  dapur_nama: string;
  sekolah_nama: string;
  latitude: number | null;
  longitude: number | null;
}

const statusConfig: Record<string, { badge: string; icon: typeof Truck }> = {
  dalam_perjalanan: { badge: 'badge-orange', icon: Truck },
  // Backward compatibility for old status value
  dalam_pengiriman: { badge: 'badge-orange', icon: Truck },
  diterima: { badge: 'badge-green', icon: CheckCircle2 },
  gagal: { badge: 'badge-red', icon: AlertTriangle },
};

const filterOptions = [
  { value: '', label: 'Semua', icon: Filter },
  { value: 'dalam_perjalanan', label: 'Dalam Perjalanan', icon: Truck },
  { value: 'diterima', label: 'Diterima', icon: CheckCircle2 },
  { value: 'gagal', label: 'Gagal', icon: AlertTriangle },
];

export default function PengirimanPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { canUpdateStatusPengiriman } = usePermissions();
  const router = useRouter();
  const [pengirimanList, setPengirimanList] = useState<Pengiriman[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedPengiriman, setSelectedPengiriman] = useState<Pengiriman | null>(null);
  const [updateForm, setUpdateForm] = useState({
    status: 'dalam_perjalanan',
    catatan: '',
    bukti_foto: null as string | null,
  });
  const [viewFoto, setViewFoto] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchPengiriman();
  }, [user, authLoading, filterStatus]);

  const fetchPengiriman = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await api.get('/pengiriman', { params });
      setPengirimanList(response.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleUpdate = (pengiriman: Pengiriman) => {
    setSelectedPengiriman(pengiriman);
    setUpdateForm({
      status: pengiriman.status,
      catatan: pengiriman.catatan || '',
      bukti_foto: pengiriman.bukti_foto,
    });
    setShowUpdateModal(true);
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPengiriman) return;

    try {
      await api.put(`/pengiriman/${selectedPengiriman.id}`, {
        status: updateForm.status,
        catatan: updateForm.catatan,
        bukti_foto: updateForm.bukti_foto,
      });
      
      toast.success('Pengiriman berhasil diupdate');
      setShowUpdateModal(false);
      fetchPengiriman();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal update pengiriman');
    }
  };

  const handleFotoUpload = (filename: string) => {
    setUpdateForm(prev => ({ ...prev, bukti_foto: filename }));
  };

  const getFotoUrl = (filename: string | null) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    return `${API_URL}/uploads/${filename}`;
  };

  return (
    <AdminLayout currentPage="/dashboard/pengiriman" title="Tracking Pengiriman" description="Monitor status pengiriman MBG ke sekolah">
      {/* Filter bar */}
      <div className="filter-bar">
        {filterOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = filterStatus === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`filter-btn ${isActive ? 'filter-btn-active' : ''}`}
            >
              <Icon size={14} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Dapur</th>
                <th>Sekolah Tujuan</th>
                <th>Status</th>
                <th>Bukti Foto</th>
                <th>Catatan</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><div className="loading-spinner"><div className="loading-spinner-inner"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="text-sm text-zinc-500">Memuat data...</p></div></div></td></tr>
              ) : pengirimanList.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12"><div className="empty-state"><div className="empty-state-icon"><Truck size={24} /></div><p className="empty-state-title">Tidak ada pengiriman</p><p className="empty-state-text">Belum ada data pengiriman untuk filter yang dipilih</p></div></td></tr>
              ) : (
                pengirimanList.map((p) => {
                  const config = statusConfig[p.status] || statusConfig.dalam_perjalanan;
                  const StatusIcon = config.icon;
                  const fotoUrl = getFotoUrl(p.bukti_foto);
                  return (
                    <tr key={p.id}>
                      <td className="font-medium text-zinc-900">{new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td><div className="flex items-center gap-1.5 text-zinc-500"><Clock size={14} />{p.waktu_kirim || '-'}</div></td>
                      <td className="text-zinc-600">{p.dapur_nama}</td>
                      <td className="font-medium text-zinc-900">{p.sekolah_nama}</td>
                      <td>
                        <span className={`badge ${config.badge}`}>
                          <StatusIcon size={12} />
                          {p.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {fotoUrl ? (
                          <button
                            onClick={() => setViewFoto(fotoUrl)}
                            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            <Eye size={14} />
                            Lihat Foto
                          </button>
                        ) : (
                          <span className="text-zinc-400 text-sm">Belum ada foto</span>
                        )}
                      </td>
                      <td className="text-zinc-500 max-w-[200px] truncate">{p.catatan || '-'}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdateStatusPengiriman && (
                            <button
                              onClick={() => handleUpdate(p)}
                              className="btn-icon"
                              title="Update Status & Upload Foto"
                            >
                              <Edit size={16} />
                            </button>
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

      {/* Update Modal */}
      {showUpdateModal && selectedPengiriman && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative z-[2100]">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Update Pengiriman</h2>
                <p className="text-sm text-zinc-500">{selectedPengiriman.sekolah_nama}</p>
              </div>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitUpdate} className="p-6 space-y-4">
              {/* Live Location Updater - for couriers in transit */}
              {selectedPengiriman.status === 'dalam_perjalanan' && (
                <CourierLocationUpdater
                  pengirimanId={selectedPengiriman.id}
                  kurirNama={selectedPengiriman.kurir_nama}
                  sekolahNama={selectedPengiriman.sekolah_nama}
                  currentStatus={updateForm.status}
                  onUpdate={fetchPengiriman}
                />
              )}

              <PengirimanUpdateForm
                status={updateForm.status}
                catatan={updateForm.catatan}
                foto={updateForm.bukti_foto}
                onStatusChange={(value) => setUpdateForm((prev) => ({ ...prev, status: value }))}
                onCatatanChange={(value) => setUpdateForm((prev) => ({ ...prev, catatan: value }))}
                onFotoUpload={handleFotoUpload}
                onCancel={() => setShowUpdateModal(false)}
              />
            </form>
          </div>
        </div>
      )}

      {/* View Foto Modal */}
      {viewFoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewFoto(null)}>
          <div className="relative max-w-4xl w-full z-[2100]">
            <button
              onClick={() => setViewFoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 flex items-center gap-2"
            >
              <X size={20} />
              <span className="text-sm">Tutup</span>
            </button>
            <img
              src={viewFoto}
              alt="Bukti Pengiriman"
              className="w-full rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
