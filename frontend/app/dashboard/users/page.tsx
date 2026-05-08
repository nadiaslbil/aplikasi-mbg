"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import api from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Plus, Edit, Trash2, X as CloseIcon, Search, Users, Shield, Mail } from "lucide-react";

interface User {
  id: number;
  nama: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserForm {
  nama: string;
  email: string;
  password: string;
  role: string;
}

const roleOptions = [
  { value: "admin_bgn", label: "Admin BGN" },
  { value: "admin_daerah", label: "Admin Daerah" },
  { value: "kurir", label: "Kurir" },
  { value: "supplier", label: "Supplier" },
];

const roleBadge: Record<string, string> = {
  admin_bgn: "badge-purple",
  admin_daerah: "badge-blue",
  kurir: "badge-orange",
  supplier: "badge-green",
};

export default function UsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { register, handleSubmit, reset } = useForm<UserForm>();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchUsers();
  }, [user, authLoading]);

  const fetchUsers = async () => {
    try {
      const params = search ? { search } : {};
      const response = await api.get("/users", { params });
      setUserList(response.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UserForm) => {
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, data);
        toast.success("Data user berhasil diupdate");
      } else {
        await api.post("/users", data);
        toast.success("Data user berhasil ditambahkan");
      }
      fetchUsers();
      handleCloseForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Terjadi kesalahan");
    }
  };

  const handleEdit = (u: User) => {
    setEditingId(u.id);
    reset({ nama: u.nama, email: u.email, password: "", role: u.role });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus user ini?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Data user berhasil dihapus");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Terjadi kesalahan");
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    reset();
  };

  return (
    <AdminLayout currentPage="/dashboard/users" title="Manajemen User" description="Kelola user dan role akses sistem">
      {/* Filter bar */}
      <div className="filter-bar">
        <button
          onClick={() => {
            setEditingId(null);
            reset({ nama: "", email: "", password: "", role: "admin_daerah" });
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={16} /> Tambah User
        </button>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" placeholder="Cari user..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10!" />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel animate-fadeIn">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? "Edit User" : "Tambah User Baru"}</h2>
            <button onClick={handleCloseForm} className="btn-icon">
              <CloseIcon size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-grid">
              <div>
                <label className="form-label">Nama Lengkap</label>
                <input {...register("nama", { required: true })} className="input" placeholder="Nama lengkap" />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input {...register("email", { required: true })} type="email" className="input" placeholder="email@contoh.com" />
              </div>
              <div>
                <label className="form-label">Password {editingId && <span className="text-zinc-400 font-normal">(kosongkan jika tidak diubah)</span>}</label>
                <input {...register("password")} type="password" className="input" placeholder={editingId ? "••••••••" : "Password"} />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select {...register("role", { required: true })} className="select">
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5 pt-5 border-t border-zinc-200/80">
              <button type="button" onClick={handleCloseForm} className="btn-secondary">
                Batal
              </button>
              <button type="submit" className="btn-primary">
                {editingId ? "Update" : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th className="hidden md:table-cell">Terdaftar</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="loading-spinner">
                      <div className="loading-spinner-inner">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-zinc-500">Memuat data...</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : userList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Users size={24} />
                      </div>
                      <p className="empty-state-title">Tidak ada user</p>
                      <p className="empty-state-text">Klik &quot;Tambah User&quot; untuk menambahkan user baru</p>
                    </div>
                  </td>
                </tr>
              ) : (
                userList.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-medium text-zinc-600 flex-shrink-0">{u.nama.charAt(0).toUpperCase()}</div>
                        <span className="font-medium text-zinc-900">{u.nama}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Mail size={14} />
                        {u.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleBadge[u.role] || "badge-gray"}`}>
                        <Shield size={10} />
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="hidden md:table-cell text-zinc-500">{new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(u)} className="btn-icon" title="Edit">
                          <Edit size={16} />
                        </button>
                        {u.id !== 1 && (
                          <button onClick={() => handleDelete(u.id)} className="btn-icon-danger" title="Hapus">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
