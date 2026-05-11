"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import api from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { User, Mail, Phone, Lock, Save, Camera, Shield, CheckCircle } from "lucide-react";

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
        ...(data.password ? { password: data.password } : {}),
      };
      await api.put(`/users/${user?.id}`, updateData);
      if (user) {
        updateUser({ ...user, nama: data.nama, email: data.email, no_telp: data.no_telp, avatar: data.avatar });
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

          {/* ── Header Card ── */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-28" />

            {/* Avatar + Info Row */}
            <div className="px-6 pb-5">
              <div className="flex items-end gap-4 -mt-10">
                {/* Avatar */}
                <div className="relative group flex-shrink-0">
                  {watch("avatar") ? (
                    <img
                      src={watch("avatar")}
                      alt="Avatar"
                      className="w-20 h-20 rounded-xl object-cover border-4 border-white shadow-md bg-white"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-zinc-100 border-4 border-white shadow-md flex items-center justify-center text-zinc-400">
                      <User size={32} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera size={18} className="text-white" />
                  </div>
                </div>

                {/* Nama & Role — muncul di area putih, bukan di atas banner */}
                <div className="pt-12">
                  <h2 className="text-lg font-bold text-zinc-900 leading-tight">{user?.nama}</h2>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="badge badge-blue text-[11px]">
                      <Shield size={9} />
                      {user?.role?.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Left: Forms */}
            <div className="lg:col-span-2 space-y-6">

              {/* Informasi Pribadi */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 animate-fadeIn">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-zinc-100">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <User size={15} className="text-blue-600" />
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-900">Informasi Pribadi</h3>
                </div>

                <div className="space-y-4">
                  {/* Nama */}
                  <div>
                    <label className="form-label">Nama Lengkap</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <input
                        {...register("nama", { required: "Nama wajib diisi" })}
                        className="input pl-9"
                        placeholder="Nama Anda"
                      />
                    </div>
                    {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama.message}</p>}
                  </div>

                  {/* Email & Telepon */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Email</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        <input
                          {...register("email", { required: "Email wajib diisi" })}
                          type="email"
                          className="input pl-9"
                          placeholder="email@anda.com"
                        />
                      </div>
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">Nomor Telepon</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        <input
                          {...register("no_telp")}
                          className="input pl-9"
                          placeholder="08xxxxxxxx"
                        />
                      </div>
                    </div>
                  </div>

                  {/* URL Avatar */}
                  <div>
                    <label className="form-label">URL Foto Profil</label>
                    <div className="relative">
                      <Camera size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <input
                        {...register("avatar")}
                        className="input pl-9"
                        placeholder="https://link-foto.com/foto.jpg"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1.5">
                      Gunakan link URL gambar (misal dari Google Drive atau Imgur)
                    </p>
                  </div>
                </div>
              </div>

              {/* Keamanan */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 animate-fadeIn" style={{ animationDelay: "80ms" }}>
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-zinc-100">
                  <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Lock size={15} className="text-orange-500" />
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-900">Keamanan</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Password Baru</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <input
                        {...register("password", { minLength: { value: 6, message: "Minimal 6 karakter" } })}
                        type="password"
                        className="input pl-9"
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Konfirmasi Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <input
                        {...register("confirmPassword")}
                        type="password"
                        className="input pl-9"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 mt-4 italic">
                  * Kosongkan password jika tidak ingin mengganti.
                </p>
              </div>
            </div>

            {/* Right: Sidebar */}
            <div className="space-y-4">

              {/* Tips Keamanan */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 animate-fadeIn" style={{ animationDelay: "160ms" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Shield size={13} className="text-green-600" />
                  </span>
                  <h4 className="text-sm font-semibold text-zinc-900">Tips Keamanan</h4>
                </div>
                <ul className="space-y-3">
                  {[
                    "Gunakan password kuat (kombinasi huruf, angka, dan simbol).",
                    "Jangan bagikan akun Anda kepada orang lain.",
                    "Update nomor telepon untuk koordinasi pengiriman.",
                    "Foto profil membantu rekan kerja mengenali Anda di sistem.",
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-500 leading-relaxed">
                      <CheckCircle size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tombol Simpan */}
              <div className="sticky top-24">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full py-2.5 gap-2 shadow-md shadow-blue-600/20"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={15} />
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
