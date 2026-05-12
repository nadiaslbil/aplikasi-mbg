'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, LayersControl, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';
import { School, Store, MapPin, ListFilter, Truck } from 'lucide-react';
import { IconCircle, sekolahMarker, dapurMarker } from './IconCircle';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import L from 'leaflet';

// Fix Leaflet default markers
if (typeof window !== 'undefined') {
  // Leaflet markers already handled by sekolahMarker/dapurMarker
}

// Courier live marker icon
const courierMarkerIcon = L.divIcon({
  html: `<div style="width:40px;height:40px;background-color:#f97316;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.1);animation:pulse 2s infinite;">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Map center to Banjarnegara
const BANJARNEGARA_CENTER: [number, number] = [-7.3511, 109.5875];

interface MapData {
  sekolah: Array<{
    id: number;
    nama: string;
    alamat: string;
    latitude: number;
    longitude: number;
    kecamatan: string;
    jumlah_siswa: number;
    status: string;
  }>;
  dapur: Array<{
    id: number;
    nama: string;
    alamat: string;
    latitude: number;
    longitude: number;
    kecamatan: string;
    kapasitas_harian: number;
    status: string;
  }>;
  couriers?: Array<{
    id: number;
    latitude: number;
    longitude: number;
    status: string;
    kurir_nama: string;
    sekolah_nama: string;
    catatan?: string | null;
    updated_at?: string;
    sekolah_lat?: number;
    sekolah_lng?: number;
  }>;
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    WADMKC: string;
    WADMKK: string;
    JUMLAH_DESA: number;
    LUAS_KM2: number;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function BanjarnegaraMapImpl() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [geojson, setGeojson] = useState<any>(null);
  const [dbCouriers, setDbCouriers] = useState<Array<{
    id: number;
    latitude: number;
    longitude: number;
    status: string;
    kurir_nama: string;
    sekolah_nama: string;
    catatan?: string | null;
    updated_at?: string;
    sekolah_lat?: number;
    sekolah_lng?: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [showKecamatan, setShowKecamatan] = useState(true);
  const [showSekolah, setShowSekolah] = useState(true);
  const [showDapur, setShowDapur] = useState(true);
  const [showCourier, setShowCourier] = useState(true);

  // Live tracking hook
  const { couriers, isConnected } = useLiveTracking();

  useEffect(() => {
    fetchData();
    fetchActiveCouriers();

    // Fallback polling for production when Socket.IO is unavailable.
    const interval = setInterval(fetchActiveCouriers, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch map data from API
      const mapResponse = await api.get('/dashboard/map-data');
      setMapData(mapResponse.data);
      if (Array.isArray(mapResponse.data?.couriers)) {
        setDbCouriers(mapResponse.data.couriers);
      }

      // Load GeoJSON from public folder
      const geojsonResponse = await fetch('/banjarnegara-kecamatan-geojson.json');
      const geojsonData = await geojsonResponse.json();
      setGeojson(geojsonData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCouriers = async () => {
    try {
      const response = await api.get('/pengiriman/tracking/active');
      setDbCouriers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching active couriers:', error);
    }
  };

  // Merge socket couriers + DB couriers so map still works without socket.
  const mergedCouriers = (() => {
    const fromDb = dbCouriers.map((c) => ({
      pengirimanId: c.id,
      kurirNama: c.kurir_nama,
      sekolahNama: c.sekolah_nama,
      latitude: c.latitude,
      longitude: c.longitude,
      status: c.status,
      catatan: c.catatan || null,
      sekolahLat: c.sekolah_lat || 0,
      schoolLng: c.sekolah_lng || 0,
      timestamp: c.updated_at || new Date().toISOString(),
    }));

    const map = new Map<number, (typeof fromDb)[number]>();
    fromDb.forEach((c) => map.set(c.pengirimanId, c));
    couriers.forEach((c) => map.set(c.pengirimanId, c));
    return Array.from(map.values());
  })();

  // Consider courier "live" only if status is in transit and last update is recent.
  const liveCouriers = mergedCouriers.filter((courier) => {
    if (courier.status !== 'dalam_perjalanan') return false;
    const ts = new Date(courier.timestamp).getTime();
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts <= 60 * 1000; // 60s freshness window
  });

  // Style for GeoJSON kecamatan boundaries
  const kecamatanStyle = {
    fillColor: '#f59e0b',
    weight: 2,
    opacity: 1,
    color: '#d97706',
    dashArray: '5, 5',
    fillOpacity: 0.15,
  };

  const onEachKecamatan = (feature: any, layer: L.Layer) => {
    const props = feature.properties || {};
    const namaKecamatan = props.WADMKC || props.NAMOBJ || 'Unknown';
    const namaKabupaten = props.WADMKK || props.WADMPR || 'Banjarnegara';
    const luas = props.LUAS || props.LUASWH || props['SHAPE.AREA'];
    
    if (namaKecamatan) {
      (layer as any).bindPopup(`
        <div class="p-2 min-w-[250px]">
          <h3 class="font-bold text-amber-600 mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="bg-amber-500 rounded-full p-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            Kecamatan ${namaKecamatan}
          </h3>
          <p class="text-sm text-gray-600">Kabupaten ${namaKabupaten}</p>
          ${luas ? `<p class="text-sm text-gray-600 mt-1">Luas: ${(typeof luas === 'number' ? (luas / 1000000).toFixed(2) : luas)} km²</p>` : ''}
          <p class="text-xs text-gray-400 mt-2">Sumber: BIG (Badan Informasi Geospasial)</p>
        </div>
      `);

      // Highlight on hover
      (layer as any).on({
        mouseover: (e: any) => {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            color: '#b45309',
            dashArray: '',
            fillOpacity: 0.3,
          });
          layer.bringToFront();
        },
        mouseout: (e: any) => {
          const layer = e.target;
          kecamatanStyle.fillOpacity = 0.15;
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat peta Banjarnegara...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* Map Container */}
      <div className="h-[70vh] min-h-[650px] overflow-hidden bg-zinc-50 relative">
        <MapContainer
          center={BANJARNEGARA_CENTER}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <L.Control.Zoom position="bottomright" />
          <MapUpdater center={BANJARNEGARA_CENTER} />
          
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Peta Jalan (OSM)">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Satelit (Esri)">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Mode Gelap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.Overlay checked name="Batas Kecamatan">
              <LayerGroup>
                {geojson && (
                  <GeoJSON
                    data={geojson}
                    style={kecamatanStyle}
                    onEachFeature={onEachKecamatan}
                  />
                )}
              </LayerGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay checked name="Sekolah Penerima MBG">
              <LayerGroup>
                {mapData?.sekolah.map((sekolah) => (
                  <Marker
                    key={`sekolah-${sekolah.id}`}
                    position={[sekolah.latitude, sekolah.longitude]}
                    icon={sekolahMarker}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-green-600 mb-2 flex items-center gap-2">
                          <IconCircle icon="school" size={16} color="green" />
                          {sekolah.nama}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{sekolah.alamat}</p>
                        <p className="text-sm text-gray-600">Kecamatan: {sekolah.kecamatan}</p>
                        <p className="text-sm text-gray-600">Siswa: {sekolah.jumlah_siswa}</p>
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                          sekolah.status === 'aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {sekolah.status}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay checked name="Dapur/Supplier">
              <LayerGroup>
                {mapData?.dapur.map((dapur) => (
                  <Marker
                    key={`dapur-${dapur.id}`}
                    position={[dapur.latitude, dapur.longitude]}
                    icon={dapurMarker}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                          <IconCircle icon="store" size={16} color="blue" />
                          {dapur.nama}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{dapur.alamat}</p>
                        <p className="text-sm text-gray-600">Kecamatan: {dapur.kecamatan}</p>
                        <p className="text-sm text-gray-600">Kapasitas: {dapur.kapasitas_harian} porsi/hari</p>
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                          dapur.status === 'aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {dapur.status}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay checked name="Kurir (Live)">
              <LayerGroup>
                {liveCouriers.map((courier) => (
                  <Marker
                    key={`courier-${courier.pengirimanId}`}
                    position={[courier.latitude, courier.longitude]}
                    icon={courierMarkerIcon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[220px]">
                        <h3 className="font-bold text-orange-600 mb-2 flex items-center gap-2">
                          <Truck size={16} />
                          {courier.kurirNama}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">
                          📍 Menuju: <strong>{courier.sekolahNama}</strong>
                        </p>
                        <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                          courier.status === 'dalam_perjalanan' ? 'bg-orange-100 text-orange-800' :
                          courier.status === 'diterima' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {courier.status === 'dalam_perjalanan' ? '🚚 Dalam Perjalanan' :
                           courier.status === 'diterima' ? '✅ Diterima' :
                           '❌ Gagal'}
                        </span>
                        {courier.catatan && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            &ldquo;{courier.catatan}&rdquo;
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Update: {new Date(courier.timestamp).toLocaleTimeString('id-ID')}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
          </LayersControl>
        </MapContainer>
      </div>
    </div>
  );
}
