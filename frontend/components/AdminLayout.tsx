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
  { href: '/dashboard/kurir', icon: Truck, label: 'Dashboard Kurir', roles: ['kurir'] },
  { href: '/dashboard/supplier', icon: Store, label: 'Dashboard Dapur', roles: ['supplier'] },
  { href: '/dashboard/banjarnegara', icon: MapPin, label: 'Peta Banjarnegara', roles: ['admin_bgn', 'admin_daerah'] },
  { href: '/dashboard/sekolah', icon: School, label: 'Data Sekolah', roles: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'] },
  { href: '/dashboard/dapur', icon: Store, label: 'Data Dapur', roles: ['admin_bgn', 'admin_daerah', 'supplier'] },
  { href: '/dashboard/assign-kurir', icon: UserCheck, label: 'Penugasan Kurir', roles: ['admin_bgn', 'admin_daerah'] },
  { href: '/dashboard/assign-sekolah', icon: School, label: 'Penugasan Sekolah', roles: ['admin_bgn', 'admin_daerah'] },
  { href: '/dashboard/jadwal', icon: Calendar, label: 'Jadwal Distribusi', roles: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'] },
  { href: '/dashboard/pengiriman', icon: Truck, label: 'Pengiriman', roles: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'] },
  { href: '/dashboard/stok', icon: Layers, label: 'Stok Bahan', roles: ['admin_bgn', 'admin_daerah', 'supplier'] },
  { href: '/dashboard/insiden', icon: AlertTriangle, label: 'Insiden', roles: ['admin_bgn', 'admin_daerah', 'kurir', 'supplier'] },
  { href: '/dashboard/users', icon: Users, label: 'Manajemen User', roles: ['admin_bgn'] },
  { href: '/dashboard/settings', icon: Settings, label: 'Pengaturan', roles: ['admin_bgn'] },
];

export default function AdminLayout({ children, currentPage, title, description }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-[var(--background)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-zinc-200/80 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Header - Tinggi sejajar dengan navbar (h-16) */}
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
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation - Scrollable */}
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

        {/* User section - Fixed at bottom */}
        <div className="flex-shrink-0 p-3 border-t border-zinc-200/80 bg-white">
          {settings.org_name && (
            <div className="px-2 mb-2">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium truncate">
                {settings.org_name}
              </p>
            </div>
          )}
          <Link 
            href="/dashboard/profile"
            className="flex items-center gap-3 px-2 py-2 mb-1 rounded-lg hover:bg-zinc-50 transition-colors group"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.nama} className="w-8 h-8 rounded-full object-cover border border-zinc-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-medium text-zinc-600 group-hover:bg-white transition-colors">
                {user?.nama?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate group-hover:text-blue-600 transition-colors">{user?.nama}</p>
              <p className="text-xs text-zinc-500 truncate">Lihat Profil</p>
            </div>
          </Link>
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
      <div className="lg:ml-64">
        {/* Top bar - Tinggi sejajar dengan sidebar header (h-16) */}
        <header className="sticky top-0 z-[1000] bg-white/80 backdrop-blur-lg border-b border-zinc-200/80 h-16 flex items-center">
          <div className="flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 tracking-tight">{title}</h1>
                {description && (
                  <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">{description}</p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}
