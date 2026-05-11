"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import api from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { User, Mail, Phone, Lock, Save, Camera, Shield } from "lucide-react";

interface ProfileForm {
  nama: string;
  email: string;
  no_telp: string;
  avatar: string;
  password?: string;
  confirmPassword?: string;
}

export default function ProfilePage() {
  const { user, updateUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProfileForm>();
  const password = watch("password");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    
    // Initialize form with user data
    reset({
      nama: user.nama,
      email: user.email,
      no_telp: user.no_telp || "",
      avatar: user.avatar || "",
    });
  }, [user, authLoading, reset, router]);

  const onSubmit = async (data: ProfileForm) => {
    if (data.password && data.password !== data.confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        nama: data.nama,
        email: data.email,
        no_telp: data.no_telp,
        avatar: data.avatar,
        // Only include password if it's not empty
        ...(data.password ? { password: data.password } : {})
      };

      await api.put(`/users/${user?.id}`, updateData);
      
      // Update local state and storage
      if (user) {
        updateUser({
          ...user,
          nama: data.nama,
          email: data.email,
          no_telp: data.no_telp,
          avatar: data.avatar,
        });
      }

      toast.success("Profil berhasil diperbarui");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Terjadi kesalahan saat memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return null;

  return (
    <AdminLayout 
      currentPage="/dashboard/profile" 
      title="Profil Saya" 
      description="Kelola informasi pribadi dan keamanan akun Anda"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Profil */}
          <div className="panel p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-32 relative">
              <div className="absolute -bottom-12 left-8 flex items-end gap-5">
                <div className="relative group">
                  {watch("avatar") ? (
                    <img 
                      src={watch("avatar")} 
                      alt="Avatar Preview" 
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-white" 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-zinc-100 border-4 border-white shadow-lg flex items-center justify-center text-zinc-400 group-hover:bg-zinc-50 transition-colors">
                      <User size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
                <div className="pb-2">
                  <h2 className="text-xl font-bold text-zinc-900">{user?.nama}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-blue">
                      <Shield size={10} />
                      {user?.role?.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-16"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informasi Pribadi */}
            <div className="lg:col-span-2 space-y-6">
              <div className="panel animate-fadeIn">
                <div className="panel-header border-b border-zinc-100 mb-6">
                  <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                    <User size={18} className="text-blue-600" />
                    Informasi Pribadi
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Nama Lengkap</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        {...register("nama", { required: "Nama wajib diisi" })} 
                        className="input pl-10" 
                        placeholder="Nama Anda" 
                      />
                    </div>
                    {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input 
                          {...register("email", { required: "Email wajib diisi" })} 
                          type="email"
                          className="input pl-10" 
                          placeholder="email@anda.com" 
                        />
                      </div>
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">Nomor Telepon</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input 
                          {...register("no_telp")} 
                          className="input pl-10" 
                          placeholder="08xxxxxxxx" 
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">URL Foto Profil</label>
                    <div className="relative">
                      <Camera size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        {...register("avatar")} 
                        className="input pl-10" 
                        placeholder="https://link-foto.com/foto.jpg" 
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">Gunakan link URL gambar (misal dari Google Drive atau Imgur)</p>
                  </div>
                </div>
              </div>

              {/* Keamanan */}
              <div className="panel animate-fadeIn" style={{ animationDelay: "100ms" }}>
                <div className="panel-header border-b border-zinc-100 mb-6">
                  <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                    <Lock size={18} className="text-orange-600" />
                    Keamanan
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Password Baru</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        {...register("password", { minLength: { value: 6, message: "Minimal 6 karakter" } })} 
                        type="password"
                        className="input pl-10" 
                        placeholder="••••••••" 
                      />
                    </div>
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Konfirmasi Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        {...register("confirmPassword")} 
                        type="password"
                        className="input pl-10" 
                        placeholder="••••••••" 
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mt-4 italic">* Kosongkan password jika tidak ingin mengganti.</p>
              </div>
            </div>

            {/* Sidebar info */}
            <div className="space-y-6">
              <div className="panel bg-zinc-50 border-dashed border-zinc-200 animate-fadeIn" style={{ animationDelay: "200ms" }}>
                <h4 className="text-sm font-semibold text-zinc-900 mb-3">Tips Keamanan</h4>
                <ul className="text-xs text-zinc-500 space-y-2 list-disc pl-4">
                  <li>Gunakan password yang kuat (kombinasi huruf, angka, dan simbol).</li>
                  <li>Jangan bagikan akun Anda kepada orang lain.</li>
                  <li>Update nomor telepon untuk memudahkan koordinasi pengiriman.</li>
                  <li>Foto profil membantu rekan kerja mengenali Anda di sistem.</li>
                </ul>
              </div>

              <div className="sticky top-24">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="btn-primary w-full py-3 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save size={18} />
                  )}
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
