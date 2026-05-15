'use client';

import { useState, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  MapPin,
  School,
  Store,
  Calendar,
  Truck,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  LucideIcon,
  Package,
  Layers,
  Users,
  User,
  UserCheck,
  Settings,
} from 'lucide-react';

interface MenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  roles?: string[]; // Roles that can see this menu (undefined = all roles)
}

interface AdminLayoutProps {
  children: ReactNode;
  currentPage: string;
  title: string;
  description?: string;
}

// Menu items with role-based visibility
const allMenuItems: MenuItem[] = [
  { href: '/dashboard', icon: BarChart3, label: 'Dashboard', roles: ['admin_bgn', 'admin_daerah'] },
  { href: '/dashboard/kurir', icon: Truck, label: 'Portal Kurir', roles: ['kurir'] },
  { href: '/dashboard/supplier', icon: Store, label: 'Dashboard Dapur', roles: ['supplier'] },
  { href: '/dashboard/sekolah', icon: School, label: 'Data Sekolah', roles: ['admin_bgn', 'admin_daerah', 'supplier'] },
  { href: '/dashboard/dapur', icon: Store, label: 'Data Dapur', roles: ['admin_bgn', 'admin_daerah', 'supplier'] },
  { href: '/dashboard/assign-kurir', icon: UserCheck, label: 'Penugasan Kurir', roles: ['admin_bgn', 'admin_daerah'] },
  { href: '/dashboard/assign-sekolah', icon: School, label: 'Penugasan Sekolah', roles: ['admin_bgn', 'admin_daerah'] },
  { href: '/dashboard/jadwal', icon: Calendar, label: 'Jadwal Distribusi', roles: ['admin_bgn', 'admin_daerah', 'supplier'] },
  { href: '/dashboard/pengiriman', icon: Truck, label: 'Pengiriman', roles: ['admin_bgn', 'admin_daerah', 'supplier'] },
  { href: '/dashboard/stok', icon: Layers, label: 'Stok Bahan', roles: ['admin_bgn', 'admin_daerah', 'supplier'] },
  { href: '/dashboard/insiden', icon: AlertTriangle, label: 'Insiden', roles: ['admin_bgn', 'admin_daerah', 'supplier'] },
  { href: '/dashboard/users', icon: Users, label: 'Manajemen User', roles: ['admin_bgn'] },
  { href: '/dashboard/settings', icon: Settings, label: 'Pengaturan', roles: ['admin_bgn'] },
];

export default function AdminLayout({ children, currentPage, title, description }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isKurir = user?.role === 'kurir';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter((item) => {
    if (!item.roles) return true; // No restriction = show to all
    return user && item.roles.includes(user.role);
  });

  return (
    <div className={`min-h-screen bg-[var(--background)] ${isKurir ? 'pb-20 lg:pb-0' : ''}`}>
      {/* Mobile overlay */}
      {sidebarOpen && !isKurir && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden for Kurir on mobile, always shown on Desktop */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-zinc-200/80 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isKurir ? 'hidden lg:flex' : 'flex'
        } ${
          !isKurir && !sidebarOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        }`}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-200/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {settings.app_logo ? (
              <img src={settings.app_logo} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package size={18} className="text-white" />
              </div>
            )}
            <span className="text-base font-semibold text-zinc-900 tracking-tight">
              {settings.app_name || 'MBG Admin'}
            </span>
          </div>
          {!isKurir && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {menuItems.map((item) => {
            const isActive = item.href === currentPage;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom of sidebar (Desktop/Non-Kurir) */}
        <div className="flex-shrink-0 p-3 border-t border-zinc-200/80 bg-white space-y-2">
          {!isKurir && (
            <Link
              href="/dashboard/profile"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 p-2 rounded-xl transition-all border ${
                currentPage === '/dashboard/profile' 
                  ? 'bg-blue-50 border-blue-100 shadow-sm' 
                  : 'border-transparent hover:bg-zinc-50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.nama?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 truncate">{user?.nama}</p>
                <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
              </div>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-zinc-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={isKurir ? 'lg:ml-64' : 'lg:ml-64'}>
        {/* Top bar */}
        <header className="sticky top-0 z-[1000] bg-white/80 backdrop-blur-lg border-b border-zinc-200/80 h-16 flex items-center">
          <div className="w-full flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {!isKurir && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  <Menu size={20} />
                </button>
              )}
              <div>
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight truncate max-w-[150px] sm:max-w-none">{title}</h1>
                {description && (
                  <p className="hidden sm:block text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{description}</p>
                )}
              </div>
            </div>

            {/* Profile Menu (Right Side) - Only for Courier or as a fallback */}
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className={`flex items-center gap-2 p-1 pl-2 hover:bg-zinc-100 rounded-full transition-all border border-transparent hover:border-zinc-200 ${!isKurir ? 'lg:hidden' : ''}`}
              >
                <div className="hidden sm:block text-right mr-1">
                  <p className="text-xs font-bold text-zinc-900 leading-none">{user?.nama}</p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-tight font-medium">{user?.role.replace('_', ' ')}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm border-2 border-white shadow-sm overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.nama?.charAt(0).toUpperCase()
                  )}
                </div>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 py-1.5 z-20 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-zinc-50 mb-1 sm:hidden">
                      <p className="text-sm font-bold text-zinc-900 truncate">{user?.nama}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-medium">{user?.role.replace('_', ' ')}</p>
                    </div>
                    <Link href="/dashboard/profile" className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-blue-600 transition-colors">
                      <User size={16} /> Profil Saya
                    </Link>
                    {user?.role === 'admin_bgn' && (
                      <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-blue-600 transition-colors">
                        <Settings size={16} /> Pengaturan
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors mt-1 border-t border-zinc-50"
                    >
                      <LogOut size={16} /> Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 animate-fadeIn max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
