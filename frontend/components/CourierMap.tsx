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
  html: renderToString(
    <div style={{ width: 40, height: 40, backgroundColor: '#2563eb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
      <School size={20} color="white" strokeWidth={2.5} />
    </div>
  ),
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const myLocationIcon = L.divIcon({
  html: renderToString(
    <div style={{ width: 36, height: 36, backgroundColor: '#f97316', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.2)', position: 'relative' }}>
      <Navigation size={18} color="white" strokeWidth={3} style={{ transform: 'rotate(45deg)' }} />
      <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #f97316', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
    </div>
  ),
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
          <Marker position={[currentLat, currentLng]} icon={myLocationIcon}>
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
            position={[task.sekolah_latitude, task.sekolah_longitude]}
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
              [currentLat, currentLng],
              [activeTasks[0].sekolah_latitude, activeTasks[0].sekolah_longitude]
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
