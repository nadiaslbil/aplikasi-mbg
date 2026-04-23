'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const BanjarnegaraMapWithNoSSR = dynamic(
  () => import('./BanjarnegaraMapImpl'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat peta Banjarnegara...</p>
        </div>
      </div>
    ),
  }
);

export default function BanjarnegaraMap() {
  return <BanjarnegaraMapWithNoSSR />;
}
