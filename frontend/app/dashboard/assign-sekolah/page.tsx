'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { API_URL } from '@/lib/config';
import {
  Building2,
  GraduationCap,
  Plus,
  Trash2,
  CalendarDays,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  X,
} from 'lucide-react';

interface Dapur {
  id: number;
  nama: string;
  kecamatan: string;
}

interface Sekolah {
  id: number;
  nama: string;
  alamat: string;
  kecamatan: string;
  jumlah_siswa: number;
  dapur_pembina?: string | null;
}

interface DapurSekolah {
  id: number;
  dapur_id: number;
  sekolah_id: number;
  hari_kirim: string;
  jumlah_porsi: number;
  status: string;
  dapur_nama: string;
  sekolah_nama: string;
  sekolah_alamat: string;
  sekolah_kecamatan: string;
}

export default function AssignSekolahPage() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [relations, setRelations] = useState<DapurSekolah[]>([]);
  const [dapurs, setDapurs] = useState<Dapur[]>([]);
  const [sekolahs, setSekolahs] = useState<Sekolah[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    dapur_id: '',
    sekolah_id: '',
    jumlah_porsi: '200',
    hari_kirim: JSON.stringify(['senin', 'selasa', 'rabu', 'kamis', 'jumat']),
  });
  const [selectedHari, setSelectedHari] = useState<string[]>([
    'senin',
    'selasa',
    'rabu',
    'kamis',
    'jumat',
  ]);

  // Ensure arrays are always arrays
  const relationsArray = Array.isArray(relations) ? relations : [];
  const dapursArray = Array.isArray(dapurs) ? dapurs : [];
  const sekolahsArray = Array.isArray(sekolahs) ? sekolahs : [];

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [relResp, dapurResp, sekolahResp] = await Promise.all([
        fetch(`${API_URL}/dapur-sekolah`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/dapur`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/sekolah?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!relResp.ok || !dapurResp.ok || !sekolahResp.ok) {
        console.error('Fetch error:', relResp.status, dapurResp.status, sekolahResp.status);
        if ([relResp.status, dapurResp.status, sekolahResp.status].includes(401)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
      }

      const [relRes, dapurRes, sekolahRes] = await Promise.all([
        relResp.ok ? relResp.json() : Promise.resolve([]),
        dapurResp.ok ? dapurResp.json() : Promise.resolve([]),
        sekolahResp.ok ? sekolahResp.json() : Promise.resolve({ data: [] }),
      ]);

      setRelations(Array.isArray(relRes) ? relRes : []);
      setDapurs(Array.isArray(dapurRes) ? dapurRes : []);
      // Handle paginated response for sekolah
      setSekolahs(Array.isArray(sekolahRes.data) ? sekolahRes.data : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setRelations([]);
      setDapurs([]);
      setSekolahs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dapur_id || !formData.sekolah_id) {
      toast.error('Pilih dapur dan sekolah terlebih dahulu');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/dapur-sekolah`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          hari_kirim: JSON.stringify(selectedHari),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Gagal menambahkan relasi');
        return;
      }

      toast.success('Sekolah berhasil ditugaskan ke dapur');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      dapur_id: '',
      sekolah_id: '',
      jumlah_porsi: '200',
      hari_kirim: JSON.stringify(['senin', 'selasa', 'rabu', 'kamis', 'jumat']),
    });
    setSelectedHari(['senin', 'selasa', 'rabu', 'kamis', 'jumat']);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus penugasan sekolah ini?')) return;

    try {
      const res = await fetch(`${API_URL}/dapur-sekolah/${id}`, {
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

  const handleToggleStatus = async (relation: DapurSekolah) => {
    const newStatus = relation.status === 'aktif' ? 'nonaktif' : 'aktif';
    
    try {
      const res = await fetch(`${API_URL}/dapur-sekolah/${relation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hari_kirim: relation.hari_kirim,
          jumlah_porsi: relation.jumlah_porsi,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Gagal update status');
        return;
      }

      toast.success(`Status penugasan sekolah ${newStatus === 'aktif' ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchData();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Terjadi kesalahan saat update');
    }
  };

  const toggleHari = (hari: string) => {
    if (selectedHari.includes(hari)) {
      setSelectedHari(selectedHari.filter(h => h !== hari));
    } else {
      setSelectedHari([...selectedHari, hari]);
    }
  };

  const isAdmin = user?.role === 'admin_bgn' || user?.role === 'admin_daerah';
  const hariList = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

  return (
    <AdminLayout currentPage="/dashboard/assign-sekolah" title="Penugasan Sekolah" description="Kelola penugasan sekolah ke dapur tertentu">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Penugasan Sekolah ke Dapur</h1>
          <p className="text-gray-600 mt-1">
            Kelola penugasan sekolah yang dilayani oleh dapur tertentu
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
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sekolah</p>
                <p className="text-2xl font-bold">{sekolahsArray.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Porsi/Hari</p>
                <p className="text-2xl font-bold">
                  {relationsArray.filter(r => r.status === 'aktif').reduce((sum, r) => sum + r.jumlah_porsi, 0).toLocaleString('id-ID')}
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
              Belum ada penugasan sekolah. Klik &quot;Tambah Penugasan&quot; untuk memulai.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dapur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sekolah</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hari Kirim</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Porsi</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {relationsArray.map((rel) => {
                    const hariList = JSON.parse(rel.hari_kirim || '[]');
                    return (
                      <tr key={rel.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{rel.dapur_nama}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{rel.sekolah_nama}</div>
                          <div className="text-sm text-gray-500">
                            {rel.sekolah_alamat}, {rel.sekolah_kecamatan}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {hariList.map((hari: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                              >
                                {hari.charAt(0).toUpperCase() + hari.slice(1, 3)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{rel.jumlah_porsi}</span>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 overflow-y-auto">
            <div className="relative z-[2100] bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-8">
              <h2 className="text-xl font-bold mb-4">Tambah Penugasan Sekolah</h2>
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
                    Sekolah
                  </label>
                  <select
                    value={formData.sekolah_id}
                    onChange={(e) => setFormData({ ...formData, sekolah_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Sekolah</option>
                    {sekolahsArray.map((s) => (
                      <option key={s.id} value={s.id} className={s.dapur_pembina ? 'text-amber-600' : ''}>
                        {s.nama} - {s.kecamatan} {s.dapur_pembina ? `(Sudah dibina: ${s.dapur_pembina})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Porsi per Hari
                  </label>
                  <input
                    type="number"
                    value={formData.jumlah_porsi}
                    onChange={(e) => setFormData({ ...formData, jumlah_porsi: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hari Pengiriman
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {hariList.map((hari) => (
                      <button
                        key={hari}
                        type="button"
                        onClick={() => toggleHari(hari)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                          selectedHari.includes(hari)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {hari.charAt(0).toUpperCase() + hari.slice(1)}
                      </button>
                    ))}
                  </div>
                  {selectedHari.length === 0 && (
                    <p className="text-red-500 text-xs mt-1">Pilih minimal 1 hari</p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || selectedHari.length === 0}
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
