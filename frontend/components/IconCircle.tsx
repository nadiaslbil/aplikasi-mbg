import { ReactNode } from 'react';
import { School, Store, MapPin, AlertTriangle, Truck, Package } from 'lucide-react';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';

// ============================================
// Reusable IconCircle Component
// ============================================
interface IconCircleProps {
  icon: 'school' | 'store' | 'mapPin' | 'alertTriangle' | 'truck' | 'package';
  size?: number;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray';
  strokeWidth?: number;
}

const iconMap = {
  school: School,
  store: Store,
  mapPin: MapPin,
  alertTriangle: AlertTriangle,
  truck: Truck,
  package: Package,
};

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  gray: 'bg-gray-500',
};

export function IconCircle({ icon, size = 18, color = 'blue', strokeWidth = 2 }: IconCircleProps) {
  const IconComponent = iconMap[icon];
  const bgColor = colorMap[color];
  const containerSize = size === 16 ? 'w-8 h-8' : 'w-10 h-10';

  return (
    <div className={`${containerSize} ${bgColor} rounded-full flex items-center justify-center border-2 border-white shadow-lg`}>
      <IconComponent size={size} strokeWidth={strokeWidth} className="text-white" />
    </div>
  );
}

// ============================================
// Leaflet Marker Icons using renderToString
// ============================================
export const sekolahMarker = L.divIcon({
  html: renderToString(
    <div style={{ width: 40, height: 40, backgroundColor: '#22c55e', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <School size={18} strokeWidth={2} color="white" />
    </div>
  ),
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export const dapurMarker = L.divIcon({
  html: renderToString(
    <div style={{ width: 40, height: 40, backgroundColor: '#3b82f6', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <Store size={18} strokeWidth={2} color="white" />
    </div>
  ),
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});
