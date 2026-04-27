'use client';

import UploadFoto from '@/components/UploadFoto';
import { Camera } from 'lucide-react';

interface StatusOption {
  value: string;
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'terjadwal', label: 'Terjadwal' },
  { value: 'dalam_perjalanan', label: 'Dalam Perjalanan' },
  { value: 'diterima', label: 'Diterima' },
  { value: 'gagal', label: 'Gagal' },
];

interface PengirimanUpdateFormProps {
  status: string;
  catatan: string;
  foto: string | null;
  onStatusChange: (value: string) => void;
  onCatatanChange: (value: string) => void;
  onFotoUpload: (filename: string) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function PengirimanUpdateForm({
  status,
  catatan,
  foto,
  onStatusChange,
  onCatatanChange,
  onFotoUpload,
  onCancel,
  submitLabel = 'Simpan Perubahan',
}: PengirimanUpdateFormProps) {
  return (
    <>
      <div>
        <label className="form-label">Status Pengiriman</label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="select"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label flex items-center gap-2">
          <Camera size={16} />
          Foto Bukti Pengiriman
        </label>
        <UploadFoto
          onUploadSuccess={onFotoUpload}
          currentFoto={foto}
        />
      </div>

      <div>
        <label className="form-label">Catatan</label>
        <textarea
          value={catatan}
          onChange={(e) => onCatatanChange(e.target.value)}
          className="input min-h-[100px]"
          placeholder="Tambahkan catatan pengiriman..."
        />
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-zinc-200">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Batal
        </button>
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </>
  );
}
