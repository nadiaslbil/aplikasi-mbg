'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { API_URL } from '@/lib/config';
import {
  Users,
  Building2,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  UserCheck,
} from 'lucide-react';

interface Dapur {
  id: number;
  nama: string;
  kecamatan: string;
}

interface Kurir {
  id: number;
  nama: string;
  email: string;
}

interface DapurKurir {
  id: number;
  dapur_id: number;
  kurir_id: number;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  status: string;
  dapur_nama: string;
  kurir_nama: string;
  kurir_email: string;
}

export default function AssignKurirPage() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [relations, setRelations] = useState<DapurKurir[]>([]);
  const [dapurs, setDapurs] = useState<Dapur[]>([]);
  const [kurirs, setKurirs] = useState<Kurir[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    dapur_id: '',
    kurir_id: '',
    tanggal_mulai: new Date().toISOString().split('T')[0],
  });

  // Ensure relations is always an array
  const relationsArray = Array.isArray(relations) ? relations : [];
  const dapursArray = Array.isArray(dapurs) ? dapurs : [];
  const kurirsArray = Array.isArray(kurirs) ? kurirs : [];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [relRes, dapurRes, kurirRes] = await Promise.all([
        fetch(`${API_URL}/dapur-kurir`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_URL}/dapur`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_URL}/kurir`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);

      setRelations(Array.isArray(relRes) ? relRes : []);
      setDapurs(Array.isArray(dapurRes) ? dapurRes : []);
      setKurirs(Array.isArray(kurirRes) ? kurirRes : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setRelations([]);
      setDapurs([]);
      setKurirs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dapur_id || !formData.kurir_id) {
      toast.error('Pilih dapur dan kurir terlebih dahulu');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/dapur-kurir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Gagal menambahkan relasi');
        return;
      }

      toast.success('Kurir berhasil ditugaskan ke dapur');
      setShowModal(false);
      setFormData({
        dapur_id: '',
        kurir_id: '',
        tanggal_mulai: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus penugasan kurir ini?')) return;

    try {
      const res = await fetch(`${API_URL}/dapur-kurir/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Gagal menghapus relasi');
        return;
      }

      toast.success('Penugasan berhasil dihapus');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Terjadi kesalahan saat menghapus');
    }
  };

  const handleToggleStatus = async (relation: DapurKurir) => {
    const newStatus = relation.status === 'aktif' ? 'nonaktif' : 'aktif';
    
    try {
      const res = await fetch(`${API_URL}/dapur-kurir/${relation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tanggal_mulai: relation.tanggal_mulai,
          tanggal_selesai: newStatus === 'nonaktif' ? new Date().toISOString().split('T')[0] : null,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Gagal update status');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Terjadi kesalahan saat update');
    }
  };

  const isAdmin = user?.role === 'admin_bgn' || user?.role === 'admin_daerah';

  return (
    <AdminLayout currentPage="/dashboard/assign-kurir" title="Penugasan Kurir" description="Kelola penugasan kurir ke dapur tertentu">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Penugasan Kurir ke Dapur</h1>
          <p className="text-gray-600 mt-1">
            Kelola penugasan kurir untuk mengantar dari dapur tertentu
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Dapur</p>
                <p className="text-2xl font-bold">{dapursArray.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Kurir</p>
                <p className="text-2xl font-bold">{kurirsArray.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Relasi Aktif</p>
                <p className="text-2xl font-bold">
                  {relationsArray.filter(r => r.status === 'aktif').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isAdmin && (
          <div className="mb-4">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Penugasan
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : relationsArray.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Belum ada penugasan kurir. Klik &quot;Tambah Penugasan&quot; untuk memulai.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dapur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kurir</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Mulai</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {relationsArray.map((rel) => (
                    <tr key={rel.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{rel.dapur_nama}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{rel.kurir_nama}</div>
                        <div className="text-sm text-gray-500">{rel.kurir_email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(rel.tanggal_mulai).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            rel.status === 'aktif'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rel.status === 'aktif' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {rel.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(rel)}
                                className={`px-2 py-1 text-xs rounded ${
                                  rel.status === 'aktif'
                                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {rel.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                              <button
                                onClick={() => handleDelete(rel.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
            <div className="relative z-[2100] bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Tambah Penugasan Kurir</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dapur
                  </label>
                  <select
                    value={formData.dapur_id}
                    onChange={(e) => setFormData({ ...formData, dapur_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Dapur</option>
                    {dapursArray.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama} - {d.kecamatan}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kurir
                  </label>
                  <select
                    value={formData.kurir_id}
                    onChange={(e) => setFormData({ ...formData, kurir_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Kurir</option>
                    {kurirsArray.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal_mulai}
                    onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
