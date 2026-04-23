'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { Package, Loader2 } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { register, handleSubmit } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', data);
      login(response.data.token, response.data.user);
      
      // Redirect to role-specific dashboard
      const role = response.data.user.role;
      if (role === 'kurir') {
        router.push('/dashboard/kurir');
      } else if (role === 'supplier') {
        router.push('/dashboard/supplier');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-blue-950 to-zinc-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/10">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MBG Distribution</h1>
          <p className="text-blue-200/70 mt-1 text-sm">Sistem Informasi Distribusi Makanan Bergizi Gratis</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">Masuk ke Akun</h2>
          <p className="text-sm text-zinc-500 mb-6">Masukkan email dan password untuk melanjutkan</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
              <input
                type="email"
                {...register('email', { required: true })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300/80 bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-zinc-400 hover:border-zinc-400/80"
                placeholder="admin@mbg.go.id"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password</label>
              <input
                type="password"
                {...register('password', { required: true })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300/80 bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-zinc-400 hover:border-zinc-400/80"
                placeholder="Masukkan password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Memproses...
                </span>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-zinc-200/80">
            <p className="text-xs font-medium text-zinc-500 mb-2">Demo Account</p>
            <div className="bg-zinc-50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs text-zinc-600"><span className="font-medium">Email:</span> admin@mbg.go.id</p>
              <p className="text-xs text-zinc-600"><span className="font-medium">Password:</span> admin123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-500/50 mt-6">
          &copy; 2026 MBG Distribution System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
