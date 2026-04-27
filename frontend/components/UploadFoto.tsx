'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { API_URL } from '@/lib/config';

interface UploadFotoProps {
  onUploadSuccess: (filename: string) => void;
  currentFoto?: string | null;
  maxFileSize?: number; // in MB
}

export default function UploadFoto({ onUploadSuccess, currentFoto, maxFileSize = 5 }: UploadFotoProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      setError('File type tidak didukung. Hanya gambar (JPG, PNG, GIF, WebP, HEIC/HEIF) yang diperbolehkan.');
      return;
    }

    // Validate file size
    const maxSize = maxFileSize * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxSize) {
      setError(`Ukuran file terlalu besar. Maksimal ${maxFileSize}MB.`);
      return;
    }

    setError(null);
    setUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.filename) {
        onUploadSuccess(response.data.filename);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Gagal mengupload foto');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFotoUrl = (filename: string) => {
    if (!filename) return null;
    // If it's a full URL from API, use it directly
    if (filename.startsWith('http')) return filename;
    // Otherwise, construct the URL from backend
    // API_URL includes /api suffix, remove it for static file access
    const baseUrl = API_URL.replace(/\/api$/, '');
    return `${baseUrl}/uploads/${filename}`;
  };

  // Show current photo if exists and no new preview
  const displayUrl = preview || (currentFoto ? getFotoUrl(currentFoto) : null);

  return (
    <div className="space-y-3">
      {/* Preview area */}
      {displayUrl ? (
        <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
          <img
            src={displayUrl}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          {/* Overlay actions */}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={handleRemove}
              className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition"
              title="Hapus foto"
            >
              <X size={16} />
            </button>
          </div>
          {/* Success indicator */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-green-500 text-white rounded text-xs font-medium">
            <CheckCircle size={12} />
            {preview ? 'Foto baru diupload' : 'Foto saat ini'}
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-600">Mengupload foto...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Upload size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Klik untuk upload atau drag & drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, GIF, WebP, HEIC (Maks. {maxFileSize}MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* File info */}
      {displayUrl && !uploading && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ImageIcon size={14} />
          <span>Foto bukti pengiriman</span>
        </div>
      )}
    </div>
  );
}
