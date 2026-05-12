'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import BanjarnegaraMap from '@/components/BanjarnegaraMap';
import { MapPin } from 'lucide-react';

export default function BanjarnegaraPage() {
  return (
    <AdminLayout
      currentPage="/dashboard/banjarnegara"
      title="Peta Banjarnegara"
      description="Distribusi MBG Kabupaten Banjarnegara, Jawa Tengah - 20 Kecamatan"
    >
      <div className="card">
        <div className="px-5 py-4 border-b border-zinc-200/80">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-zinc-500" />
            <h2 className="text-base font-semibold text-zinc-900">Peta Interaktif Distribusi MBG</h2>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">Visualisasi sebaran sekolah, dapur, dan boundary kecamatan</p>
        </div>
        <div className="p-5">
          <BanjarnegaraMap />
        </div>
      </div>
    </AdminLayout>
  );
}
