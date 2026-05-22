'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { School, Navigation, MapPin, Truck } from 'lucide-react';

// Fix for default markers
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

// Custom Icons
const destinationIcon = L.divIcon({
  html: `
    <div style="width: 40px; height: 40px; background-color: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </div>
  `,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const myLocationIcon = L.divIcon({
  html: `
    <div style="width: 36px; height: 36px; background-color: #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2); position: relative;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
      <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #f97316; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    </div>
  `,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

interface Task {
  id: number;
  sekolah_nama: string;
  sekolah_alamat: string;
  sekolah_latitude: number;
  sekolah_longitude: number;
  status: string;
}

interface CourierMapProps {
  tasks: Task[];
  currentLat: number | null;
  currentLng: number | null;
}

function MapAutoCenter({ tasks, currentLat, currentLng }: CourierMapProps) {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLngExpression[] = [];
    
    if (currentLat && currentLng) {
      points.push([currentLat, currentLng]);
    }

    tasks.forEach(task => {
      if (task.sekolah_latitude && task.sekolah_longitude) {
        points.push([task.sekolah_latitude, task.sekolah_longitude]);
      }
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [tasks, currentLat, currentLng, map]);

  return null;
}

export default function CourierMap({ tasks, currentLat, currentLng }: CourierMapProps) {
  const BANJARNEGARA_CENTER: [number, number] = [-7.3511, 109.5875];

  const activeTasks = useMemo(() => 
    tasks.filter(t => t.sekolah_latitude && t.sekolah_longitude), 
  [tasks]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-50 relative" style={{ minHeight: '400px', height: '60vh' }}>
      <MapContainer
        center={BANJARNEGARA_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        
        <MapAutoCenter tasks={activeTasks} currentLat={currentLat} currentLng={currentLng} />

        {/* Courier Location */}
        {currentLat && currentLng && (
          <Marker position={[Number(currentLat), Number(currentLng)]} icon={myLocationIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-orange-600 flex items-center gap-1 text-sm">
                  <Truck size={14} /> Posisi Anda
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Schools */}
        {activeTasks.map((task) => (
          <Marker
            key={task.id}
            position={[Number(task.sekolah_latitude), Number(task.sekolah_longitude)]}
            icon={destinationIcon}
          >
            <Popup>
              <div className="p-2 min-w-[150px]">
                <h4 className="font-bold text-blue-600 text-sm">{task.sekolah_nama}</h4>
                <p className="text-xs text-zinc-500 mt-1">{task.sekolah_alamat}</p>
                <div className="mt-2 pt-2 border-t border-zinc-100">
                  <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold uppercase">
                    Tujuan Pengiriman
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Draw line from courier to first task if GPS is active */}
        {currentLat && currentLng && activeTasks.length > 0 && (
          <Polyline 
            positions={[
              [Number(currentLat), Number(currentLng)],
              [Number(activeTasks[0].sekolah_latitude), Number(activeTasks[0].sekolah_longitude)]
            ]}
            pathOptions={{ color: '#2563eb', weight: 3, dashArray: '10, 10', opacity: 0.6 }}
          />
        )}
      </MapContainer>

      {/* Map Overlay Info */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-[800]">
        <div className="bg-white/90 backdrop-blur-md p-2.5 rounded-xl border border-white shadow-lg pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-none mb-1">Target Lokasi</p>
              <p className="text-sm font-bold text-zinc-900 leading-none">
                {activeTasks.length > 0 ? activeTasks[0].sekolah_nama : 'Tidak ada tugas aktif'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
