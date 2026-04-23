'use client';

import { useEffect, useState, useRef } from 'react';
import { Truck, MapPin, CheckCircle, AlertCircle, Clock, Navigation } from 'lucide-react';
import { useLiveTracking, CourierLocation } from '@/hooks/useLiveTracking';
import api from '@/lib/api';

interface ActiveDelivery {
  id: number;
  kurir_nama: string;
  sekolah_nama: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  sekolah_lat: number;
  sekolah_lng: number;
  catatan: string | null;
  updated_at: string;
}

const statusConfig: Record<string, { color: string; bg: string; icon: typeof Truck; label: string }> = {
  dalam_perjalanan: { color: 'text-orange-700', bg: 'bg-orange-50', icon: Truck, label: 'Dalam Perjalanan' },
  diterima: { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle, label: 'Diterima' },
  gagal: { color: 'text-red-700', bg: 'bg-red-50', icon: AlertCircle, label: 'Gagal' },
};

export default function LiveTrackingPanel() {
  const { couriers, isConnected } = useLiveTracking();
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const prevCouriersRef = useRef<string>('');

  useEffect(() => {
    fetchActiveDeliveries();
    // Poll every 10 seconds for initial data (socket handles real-time after)
    const interval = setInterval(fetchActiveDeliveries, 10000);
    return () => clearInterval(interval);
  }, []);

  // Merge DB data with real-time socket data
  // Use JSON string comparison to prevent infinite loops from new array references
  useEffect(() => {
    if (couriers.length > 0) {
      const couriersKey = JSON.stringify(couriers.map(c => c.pengirimanId));
      if (couriersKey === prevCouriersRef.current) return;
      
      prevCouriersRef.current = couriersKey;
      
      setActiveDeliveries((prev) =>
        prev.map((d) => {
          const live = couriers.find((c) => c.pengirimanId === d.id);
          if (live) {
            return {
              ...d,
              latitude: live.latitude,
              longitude: live.longitude,
              status: live.status,
              catatan: live.catatan,
              sekolah_lat: live.sekolahLat,
              sekolah_lng: live.schoolLng,
            };
          }
          return d;
        })
      );
    }
  }, [couriers]);

  const fetchActiveDeliveries = async () => {
    try {
      const response = await api.get('/pengiriman/tracking/active');
      setActiveDeliveries(response.data);
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 10) return 'Baru saja';
    if (seconds < 60) return `${seconds}d lalu`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m lalu`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Navigation size={18} className="text-blue-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900">Tracking Pengiriman Live</h3>
            <p className="text-xs text-zinc-500">Memuat data...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3 p-3 bg-zinc-50 rounded-lg">
              <div className="w-10 h-10 bg-zinc-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-200 rounded w-3/4" />
                <div className="h-3 bg-zinc-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeDeliveries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
            <Navigation size={18} className="text-zinc-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900">Tracking Pengiriman Live</h3>
            <p className="text-xs text-zinc-500">Tidak ada pengiriman aktif</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Navigation size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900">Tracking Pengiriman Live</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <p className="text-xs text-zinc-500">
                {isConnected ? 'Real-time aktif' : 'Menghubungkan...'}
              </p>
            </div>
          </div>
        </div>
        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          {activeDeliveries.length} aktif
        </span>
      </div>

      {/* Delivery list */}
      <div className="divide-y divide-zinc-100 max-h-[400px] overflow-y-auto">
        {activeDeliveries.map((delivery) => {
          const config = statusConfig[delivery.status] || statusConfig.dalam_perjalanan;
          const StatusIcon = config.icon;
          const hasLocation = delivery.latitude && delivery.longitude;

          return (
            <div key={delivery.id} className="px-4 py-3 hover:bg-zinc-50 transition">
              <div className="flex items-start gap-3">
                {/* Courier avatar */}
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Truck size={18} className="text-orange-600" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Top row: courier name + status */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {delivery.kurir_nama}
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
                      <StatusIcon size={10} />
                      {config.label}
                    </span>
                  </div>

                  {/* Destination */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin size={12} className="text-zinc-400 flex-shrink-0" />
                    <p className="text-xs text-zinc-600 truncate">
                      → {delivery.sekolah_nama}
                    </p>
                  </div>

                  {/* Location info */}
                  {hasLocation ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Navigation size={12} className="text-blue-500 flex-shrink-0" />
                      <p className="text-xs text-zinc-500">
                        {delivery.latitude?.toFixed(4)}, {delivery.longitude?.toFixed(4)}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock size={12} className="text-zinc-400 flex-shrink-0" />
                      <p className="text-xs text-zinc-400">Belum ada lokasi</p>
                    </div>
                  )}

                  {/* Catatan */}
                  {delivery.catatan && (
                    <p className="text-xs text-zinc-500 mt-1 italic truncate">
                      &ldquo;{delivery.catatan}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
