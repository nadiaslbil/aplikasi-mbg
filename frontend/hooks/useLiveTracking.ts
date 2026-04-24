import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/config';

export interface CourierLocation {
  pengirimanId: number;
  kurirId: number;
  kurirNama: string;
  sekolahNama: string;
  latitude: number;
  longitude: number;
  status: string;
  catatan: string | null;
  sekolahLat: number;
  schoolLng: number;
  timestamp: string;
}

export interface CourierStatusUpdate {
  pengirimanId: number;
  status: string;
  catatan: string | null;
  timestamp: string;
}

const ENABLE_SOCKET_IO = process.env.NEXT_PUBLIC_ENABLE_SOCKET_IO === 'true';

function getSocketUrl() {
  // If API_URL is relative (/api), connect to same origin by default.
  if (API_URL.startsWith('/')) {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }
  return API_URL.replace(/\/api$/, '');
}

/**
 * Hook for listening to real-time courier location updates via Socket.io
 */
export function useLiveTracking() {
  const socketRef = useRef<Socket | null>(null);
  const [couriers, setCouriers] = useState<Map<number, CourierLocation>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!ENABLE_SOCKET_IO) return;
    // Create socket connection
    const socketUrl = getSocketUrl();
    if (!socketUrl) return;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
      socket.emit('join-tracking');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    // Listen for courier location updates
    socket.on('courier-update', (data: CourierLocation) => {
      console.log('📍 Courier update:', data);
      setCouriers((prev) => {
        const next = new Map(prev);
        next.set(data.pengirimanId, data);
        return next;
      });
    });

    socket.on('courier-status-update', (data: CourierStatusUpdate) => {
      console.log('📦 Courier status update:', data);
      // Update status of existing courier
      setCouriers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.pengirimanId);
        if (existing) {
          next.set(data.pengirimanId, { ...existing, status: data.status, catatan: data.catatan });
        }
        return next;
      });
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /**
   * Send courier location update to server
   */
  const sendLocation = useCallback(async (
    pengirimanId: number,
    latitude: number,
    longitude: number,
    status: string = 'dalam_perjalanan',
    catatan?: string
  ) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/pengiriman/${pengirimanId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude, status, catatan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update location');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending location:', error);
      throw error;
    }
  }, []);

  /**
   * Remove a courier from the tracking map (e.g., when delivery is complete)
   */
  const removeCourier = useCallback((pengirimanId: number) => {
    setCouriers((prev) => {
      const next = new Map(prev);
      next.delete(pengirimanId);
      return next;
    });
  }, []);

  return {
    couriers: Array.from(couriers.values()),
    couriersMap: couriers,
    isConnected,
    sendLocation,
    removeCourier,
  };
}
