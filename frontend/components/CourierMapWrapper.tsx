'use client';

import dynamic from 'next/dynamic';

const CourierMapWithNoSSR = dynamic(
  () => import('./CourierMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full bg-zinc-100 rounded-2xl flex items-center justify-center border border-zinc-200" style={{ height: '60vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-zinc-500 text-sm font-medium">Menyiapkan navigasi...</p>
        </div>
      </div>
    ),
  }
);

interface Task {
  id: number;
  sekolah_nama: string;
  sekolah_alamat: string;
  sekolah_latitude: number;
  sekolah_longitude: number;
  status: string;
}

interface CourierMapWrapperProps {
  tasks: Task[];
  currentLat: number | null;
  currentLng: number | null;
}

export default function CourierMapWrapper(props: CourierMapWrapperProps) {
  return <CourierMapWithNoSSR {...props} />;
}
