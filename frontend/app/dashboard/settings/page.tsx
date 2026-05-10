'use client';

import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useSettings } from '@/context/SettingsContext';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, Globe, Image as ImageIcon, Info, Map as MapIcon } from 'lucide-react';

interface SettingsForm {
  app_name: string;
  app_logo: string;
  org_name: string;
  app_copyright: string;
  map_center_lat: string;
  map_center_lng: string;
  map_zoom: string;
  [key: string]: any;
}

export default function SettingsPage() {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { isDirty } } = useForm<SettingsForm>({
    defaultValues: {
      app_name: settings.app_name,
      app_logo: settings.app_logo,
      org_name: settings.org_name,
      app_copyright: settings.app_copyright,
      map_center_lat: settings.map_center_lat,
      map_center_lng: settings.map_center_lng,
      map_zoom: settings.map_zoom,
    }
  });

  const onSubmit = async (data: SettingsForm) => {
    try {
      setSaving(true);
      await updateSettings(data);
      toast.success('Pengaturan berhasil disimpan');
      await refreshSettings();
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout 
      currentPage="/dashboard/settings" 
      title="Pengaturan Aplikasi" 
      description="Konfigurasi identitas dan parameter sistem"
    >
      <div className="max-w-4xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Branding Section */}
          <div className="panel animate-fadeIn">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-blue-600" />
                <h2 className="panel-title">Identitas Aplikasi</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nama Aplikasi</label>
                  <input 
                    {...register('app_name')} 
                    type="text" 
                    className="input" 
                    placeholder="Contoh: MBG Banjarnegara"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Muncul di Sidebar dan Judul Browser.</p>
                </div>
                <div>
                  <label className="form-label">Nama Instansi</label>
                  <input 
                    {...register('org_name')} 
                    type="text" 
                    className="input" 
                    placeholder="Contoh: Pemerintah Kabupaten Banjarnegara"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Muncul di footer sidebar.</p>
                </div>
              </div>

              <div>
                <label className="form-label">URL Logo Aplikasi</label>
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <input 
                      {...register('app_logo')} 
                      type="text" 
                      className="input" 
                      placeholder="Contoh: https://link-gambar.com/logo.png"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Masukkan URL gambar (hosting di luar/Vercel Blob). Kosongkan untuk menggunakan icon default.
                    </p>
                  </div>
                  {settings.app_logo && (
                    <div className="w-12 h-12 border border-zinc-200 rounded-lg flex items-center justify-center bg-zinc-50 overflow-hidden">
                      <img src={settings.app_logo} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Teks Hak Cipta (Copyright)</label>
                <input 
                  {...register('app_copyright')} 
                  type="text" 
                  className="input" 
                  placeholder="Contoh: © 2024 MBG Banjarnegara"
                />
              </div>
            </div>
          </div>

          {/* Map Configuration */}
          <div className="panel animate-fadeIn" style={{ animationDelay: '100ms' }}>
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <MapIcon size={18} className="text-blue-600" />
                <h2 className="panel-title">Konfigurasi Peta</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Default Latitude</label>
                  <input {...register('map_center_lat')} type="text" className="input" />
                </div>
                <div>
                  <label className="form-label">Default Longitude</label>
                  <input {...register('map_center_lng')} type="text" className="input" />
                </div>
                <div>
                  <label className="form-label">Default Zoom</label>
                  <input {...register('map_zoom')} type="number" className="input" />
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 border border-blue-100">
                <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Pengaturan ini menentukan tampilan awal peta di Dashboard dan halaman Peta Banjarnegara.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 sticky bottom-6 z-10">
            <button 
              type="submit" 
              className="btn-primary shadow-lg flex items-center gap-2 px-8"
              disabled={saving}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>

        </form>
      </div>
    </AdminLayout>
  );
}
