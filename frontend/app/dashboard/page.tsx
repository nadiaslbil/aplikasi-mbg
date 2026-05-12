"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import BanjarnegaraMap from "@/components/BanjarnegaraMap";
import LiveTrackingPanel from "@/components/LiveTrackingPanel";
import { School, Store, Truck, AlertTriangle, TrendingUp, Calendar, MapPin } from "lucide-react";

interface DashboardStats {
  today: string;
  sekolah: { total_aktif: number };
  dapur: { total_aktif: number };
  jadwal_hari_ini: {
    total: number;
    terjadwal: number;
    dalam_pengiriman: number;
    diterima: number;
    gagal: number;
  };
  pengiriman_bulan_ini: number;
  insiden_bulan_ini: number;
  stok_expired_soon: number;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const fetchStats = async () => {
    try {
      const response = await api.get("/dashboard/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    // Redirect non-admin users to their respective dashboards
    if (user?.role === "kurir") {
      router.replace("/dashboard/kurir");
      return;
    }
    if (user?.role === "supplier") {
      router.replace("/dashboard/supplier");
      return;
    }

    // Only allow admin_bgn and admin_daerah to see this main dashboard
    if (user && user.role !== "admin_bgn" && user.role !== "admin_daerah") {
      router.replace("/dashboard/kurir"); // Fallback
      return;
    }

    fetchStats();
  }, [user, router]);

  return (
    <AdminLayout currentPage="/dashboard" title="Dashboard" description="Ringkasan distribusi MBG Kabupaten Banjarnegara">
      {/* Map Section */}
      <div className="card mb-8 overflow-hidden border-none shadow-sm bg-white">
        <div className="px-6 py-5 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <MapPin size={18} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Peta Distribusi MBG</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
              <span>20 Kecamatan</span>
              <span className="text-zinc-300">•</span>
              <span>{stats?.sekolah.total_aktif || 0} Sekolah</span>
              <span className="text-zinc-300">•</span>
              <span>{stats?.dapur.total_aktif || 0} Dapur</span>
              <span className="text-zinc-300">•</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${stats?.jadwal_hari_ini.dalam_pengiriman ? 'bg-orange-500 animate-pulse' : 'bg-zinc-300'}`}></span>
                {stats?.jadwal_hari_ini.dalam_pengiriman || 0} Kurir Aktif
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-full border border-zinc-200 uppercase tracking-wider">
              Live Monitoring
            </div>
          </div>
        </div>
        <div className="p-0">
          <BanjarnegaraMap />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Sekolah Aktif</p>
              <p className="stat-value">{stats?.sekolah.total_aktif || 0}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <School size={20} className="text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Dapur Aktif</p>
              <p className="stat-value">{stats?.dapur.total_aktif || 0}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Store size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Jadwal Hari Ini</p>
              <p className="stat-value">{stats?.jadwal_hari_ini.total || 0}</p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-emerald-600 font-medium">{stats?.jadwal_hari_ini.diterima || 0} diterima</span>
                <span className="text-orange-600 font-medium">{stats?.jadwal_hari_ini.dalam_pengiriman || 0} dikirim</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Insiden Bulan Ini</p>
              <p className="stat-value">{stats?.insiden_bulan_ini || 0}</p>
              {stats && stats.stok_expired_soon > 0 && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium">
                  <AlertTriangle size={12} /> {stats.stok_expired_soon} bahan hampir expired
                </p>
              )}
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Tracking Panel */}
        <LiveTrackingPanel />

        <div className="card">
          <div className="px-5 py-4 border-b border-zinc-200/80">
            <h3 className="text-base font-semibold text-zinc-900">Statistik Pengiriman</h3>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Total Bulan Ini", value: stats?.pengiriman_bulan_ini || 0, color: "text-zinc-900" },
              { label: "Berhasil Diterima", value: stats?.jadwal_hari_ini.diterima || 0, color: "text-emerald-700" },
              { label: "Dalam Pengiriman", value: stats?.jadwal_hari_ini.dalam_pengiriman || 0, color: "text-orange-700" },
              { label: "Gagal", value: stats?.jadwal_hari_ini.gagal || 0, color: "text-red-700" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-1">
                <span className="text-sm text-zinc-600">{item.label}</span>
                <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-sm">
          <h3 className="text-base font-semibold mb-4">Informasi Sistem</h3>
          <div className="space-y-3">
            {[
              { icon: TrendingUp, text: "Real-time tracking aktif" },
              { icon: MapPin, text: "Peta interaktif dengan filter" },
              { icon: Truck, text: "Monitoring kurir live" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <Icon size={16} />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
