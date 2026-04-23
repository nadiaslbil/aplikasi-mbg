'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navigation, MapPin, Send, StopCircle, AlertTriangle } from 'lucide-react';
import { useLiveTracking } from '@/hooks/useLiveTracking';

interface CourierLocationUpdaterProps {
  pengirimanId: number;
  kurirNama: string;
  sekolahNama: string;
  currentStatus: string;
  onUpdate?: () => void;
}

export default function CourierLocationUpdater({
  pengirimanId,
  kurirNama,
  sekolahNama,
  currentStatus,
  onUpdate,
}: CourierLocationUpdaterProps) {
  const { sendLocation, isConnected } = useLiveTracking();
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catatan, setCatatan] = useState('');

  // Send location once
  const sendOnce = useCallback(async () => {
    if (currentLat === null || currentLng === null) {
      setError('Lokasi GPS belum tersedia');
      return;
    }

    try {
      await sendLocation(pengirimanId, currentLat, currentLng, currentStatus, catatan || undefined);
      setLastUpdate(new Date().toLocaleTimeString('id-ID'));
      setError(null);
      onUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim lokasi');
    }
  }, [pengirimanId, currentLat, currentLng, currentStatus, catatan, sendLocation, onUpdate]);

  // Start continuous tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung di browser ini');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        setError(null);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Lokasi tidak tersedia');
            break;
          case err.TIMEOUT:
            setError('Timeout saat mengambil lokasi');
            break;
          default:
            setError('Error lokasi tidak diketahui');
        }
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
  }, []);

  // Stop continuous tracking
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  // Auto-send location every 15 seconds when tracking
  useEffect(() => {
    if (!isTracking || currentLat === null || currentLng === null) return;

    const interval = setInterval(async () => {
      try {
        await sendLocation(pengirimanId, currentLat, currentLng, currentStatus, catatan || undefined);
        setLastUpdate(new Date().toLocaleTimeString('id-ID'));
      } catch (err) {
        console.error('Auto-send error:', err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isTracking, currentLat, currentLng, pengirimanId, currentStatus, catatan, sendLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Navigation size={18} className="text-orange-600" />
        <h4 className="font-semibold text-orange-800">Live Location - {kurirNama}</h4>
        {isConnected && (
          <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Connected
          </span>
        )}
      </div>

      <p className="text-sm text-orange-700 mb-3">
        📍 Tujuan: <strong>{sekolahNama}</strong>
      </p>

      {/* Current location */}
      {currentLat !== null && currentLng !== null && (
        <div className="bg-white/70 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-blue-600" />
            <span className="text-zinc-700 font-mono">
              {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
            </span>
          </div>
          {lastUpdate && (
            <p className="text-xs text-zinc-500 mt-1">
              Update terakhir: {lastUpdate}
            </p>
          )}
        </div>
      )}

      {/* Catatan */}
      <input
        type="text"
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        placeholder="Tambahkan catatan (opsional)..."
        className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-2 mb-3">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={sendOnce}
          disabled={currentLat === null}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Send size={14} />
          Kirim Lokasi
        </button>

        {!isTracking ? (
          <button
            type="button"
            onClick={startTracking}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            <Navigation size={14} />
            Live Mode
          </button>
        ) : (
          <button
            type="button"
            onClick={stopTracking}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
          >
            <StopCircle size={14} />
            Stop Live
          </button>
        )}
      </div>

      {isTracking && (
        <p className="text-xs text-green-600 mt-2 text-center animate-pulse">
          🔄 Live tracking aktif - mengirim lokasi setiap 15 detik
        </p>
      )}
    </div>
  );
}
