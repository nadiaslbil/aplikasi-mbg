'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Store,
  Calendar,
  AlertTriangle,
  Package,
  TrendingUp,
  Truck,
  CheckCircle2,
  Clock,
  School,
} from 'lucide-react';

interface SupplierStats {
  dapur: { id: number; nama: string; kapasitas_harian: number } | null;
  jadwal_hari_ini: {
    total: number;
    terjadwal: number;
    dalam_pengiriman: number;
    diterima: number;
    gagal: number;
  };
  pengiriman_bulan_ini: number;
  insiden_bulan_ini: number;
  stok_hampir_expired: number;
  sekolah_binaan: number;
}

export default function SupplierDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [jadwalHariIni, setJadwalHariIni] = useState<any[]>([]);
  const [stokList, setStokList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    // Redirect non-supplier
    if (user.role !== 'supplier') {
      router.replace('/dashboard');
      return;
    }
    fetchAll();
  }, [user, authLoading]);

  const fetchAll = async () => {
    try {
      const [statsRes, jadwalRes, stokRes] = await Promise.all([
        api.get('/dashboard/supplier-stats'),
        api.get('/jadwal', { params: { tanggal: new Date().toISOString().split('T')[0] } }),
        api.get('/stok', { params: { expired_soon: 'true' } }),
      ]);

      setStats(statsRes.data);
      setJadwalHariIni(jadwalRes.data || []);
      setStokList(stokRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStokStatus = (stok: any) => {
    const expired = new Date(stok.expired_date) < new Date();
    const habis = stok.jumlah === 0;
    if (expired || habis) return { badge: 'badge-red', label: habis ? 'Habis' : 'Expired' };
    const diff = new Date(stok.expired_date).getTime() - Date.now();
    if (diff > 0 && diff < 3 * 24 * 60 * 60 * 1000) return { badge: 'badge-yellow', label: 'Hampir Expired' };
    return { badge: 'badge-green', label: 'Aman' };
  };

  return (
    <AdminLayout
      currentPage="/dashboard/supplier"
      title="Dashboard Dapur"
      description={`Ringkasan aktivitas ${stats?.dapur?.nama || 'dapur Anda'}`}
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Jadwal Hari Ini</p>
              <p className="stat-value">{stats?.jadwal_hari_ini.total || 0}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Pengiriman Bulan Ini</p>
              <p className="stat-value">{stats?.pengiriman_bulan_ini || 0}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Truck size={20} className="text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Sekolah Binaan</p>
              <p className="stat-value">{stats?.sekolah_binaan || 0}</p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <School size={20} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Insiden Bulan Ini</p>
              <p className="stat-value">{stats?.insiden_bulan_ini || 0}</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Jadwal Hari Ini */}
      <div className="card mb-6">
        <div className="px-5 py-4 border-b border-zinc-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Jadwal Pengiriman Hari Ini</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Memuat data...</div>
          ) : jadwalHariIni.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="mx-auto text-zinc-400 mb-2" />
              <p className="text-zinc-500">Tidak ada jadwal pengiriman hari ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jadwalHariIni.map((jadwal) => {
                const statusBadge: Record<string, string> = {
                  terjadwal: 'badge-blue',
                  dalam_pengiriman: 'badge-orange',
                  diterima: 'badge-green',
                  gagal: 'badge-red',
                };
                return (
                  <div key={jadwal.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                    <div>
                      <p className="font-medium text-zinc-900">{jadwal.sekolah_nama}</p>
                      <p className="text-sm text-zinc-500 flex items-center gap-1">
                        <Clock size={12} />
                        {jadwal.waktu_kirim || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${statusBadge[jadwal.status] || 'badge-gray'}`}>
                        {jadwal.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-medium text-zinc-700">{jadwal.jumlah_porsi} porsi</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stok Hampir Expired & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stok Alert */}
        <div className="card">
          <div className="px-5 py-4 border-b border-zinc-200/80 flex items-center gap-2">
            <Package size={18} className="text-zinc-500" />
            <h3 className="text-base font-semibold text-zinc-900">Stok Perlu Perhatian</h3>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="text-center py-8 text-zinc-500">Memuat data...</div>
            ) : stokList.length === 0 ? (
              <div className="text-center py-8">
                <Package size={32} className="mx-auto text-zinc-400 mb-2" />
                <p className="text-zinc-500">Semua stok aman</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stokList.slice(0, 5).map((stok) => {
                  const status = getStokStatus(stok);
                  return (
                    <div key={stok.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg">
                      <div>
                        <p className="font-medium text-zinc-900 text-sm">{stok.nama_bahan}</p>
                        <p className="text-xs text-zinc-500">{stok.jumlah} {stok.satuan}</p>
                      </div>
                      <span className={`badge ${status.badge} text-xs`}>{status.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-sm">
          <h3 className="text-base font-semibold mb-4">Informasi Dapur</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Store size={16} />
              </div>
              <span className="text-sm">{stats?.dapur?.nama || 'Dapur Anda'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <span className="text-sm">Kapasitas: {stats?.dapur?.kapasitas_harian || 0} porsi/hari</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <School size={16} />
              </div>
              <span className="text-sm">{stats?.sekolah_binaan || 0} sekolah binaan</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
