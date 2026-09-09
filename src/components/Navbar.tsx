import React, { useState, useEffect } from 'react';
import { User, SchoolSettings } from '../types';
import {
  Menu,
  QrCode,
  LogOut,
  Sparkles,
  BookOpen,
  Clock,
  ShieldCheck,
  UserCheck,
  School,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  KeyRound,
  CloudUpload,
  RefreshCw,
  PanelLeftOpen,
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { store } from '../lib/store';
import { toast } from '../lib/toast';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  settings: SchoolSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  settings,
  activeTab,
  setActiveTab,
  theme = 'light',
  onToggleTheme,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const [time, setTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(store.getOfflineQueueCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = store.subscribe(() => {
      setOfflineQueueCount(store.getOfflineQueueCount());
    });

    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Jayapura',
        }) +
          ' | ' +
          now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Jayapura',
          }) +
          ' WIT'
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleForceSync = async () => {
    if (offlineQueueCount > 0) {
      window.dispatchEvent(new CustomEvent('open-unsynced-modal'));
    }
    setIsSyncing(true);
    try {
      const res = await store.syncAllPendingToDatabase(true);
      const remaining = store.getOfflineQueueCount();
      setOfflineQueueCount(remaining);
      if (res.success) {
        toast.success('Sinkronisasi Sukses', res.message);
      } else {
        toast.warning('Sinkronisasi Parsial', res.message);
      }
    } catch (err: any) {
      toast.error('Gagal Sinkronisasi', err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'Admin':
        return (
          <span className="bg-amber-400/20 text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-amber-400" /> Admin
          </span>
        );
      case 'Guru':
        return (
          <span className="bg-emerald-400/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1 shadow-xs">
            <UserCheck className="w-3 h-3 text-emerald-400" /> Guru Piket
          </span>
        );
      case 'Kepala Sekolah':
        return (
          <span className="bg-purple-400/20 text-purple-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-400/30 flex items-center gap-1 shadow-xs">
            <School className="w-3 h-3 text-purple-400" /> KepSek
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl text-white shadow-lg border-b border-slate-800/80 sticky top-0 z-30 transition-colors w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-2">
          {/* Brand Logo & Mobile Sidebar Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Prominent Mobile Hamburger / Sidebar Menu Button */}
            {onToggleMobileSidebar && (
              <button
                type="button"
                onClick={onToggleMobileSidebar}
                className="md:hidden p-2 sm:px-2.5 sm:py-2 text-cyan-300 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/40 rounded-xl transition-all shadow-sm flex items-center gap-1.5 font-black text-xs cursor-pointer active:scale-95"
                title="Buka Menu Sidebar"
                aria-label="Buka Menu Sidebar"
              >
                <Menu className="w-5 h-5 text-cyan-400" />
                <span className="hidden xs:inline text-[11px] font-extrabold tracking-wide uppercase">Menu</span>
              </button>
            )}

            {/* Brand Logo & Name */}
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="relative shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-xs opacity-40 group-hover:opacity-80 transition duration-200"></div>
                <SchoolLogo className="w-8 h-8 sm:w-10 sm:h-10 relative drop-shadow-md transition-transform group-hover:scale-105" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-2">
                  <h1 className="font-extrabold text-base sm:text-xl tracking-wider text-white flex items-center gap-1">
                    <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 bg-clip-text text-transparent drop-shadow-xs font-black">
                      NEXA15
                    </span>
                  </h1>
                  <span className="hidden xl:inline-block px-2 py-0.5 text-[10px] font-extrabold bg-blue-500/20 text-cyan-300 rounded-md border border-cyan-400/30">
                    SMART SCHOOL
                  </span>
                </div>
                <p className="text-[9px] sm:text-[11px] font-medium text-slate-400 hidden sm:block tracking-wide truncate max-w-[200px] lg:max-w-none">
                  SMA Negeri 15 Ambon Digital Presence
                </p>
              </div>
            </div>
          </div>

          {/* Realtime Clock & Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {/* Online / Offline Network & Background Sync Indicators */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div
                className={`flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded-lg sm:rounded-xl border font-bold transition-all ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/40 animate-pulse'
                }`}
                title={
                  isOnline
                    ? 'Sistem terhubung ke server (Online Sync Active)'
                    : 'Mode Offline: Semua data scan tersimpan otomatis di perangkat.'
                }
              >
                {isOnline ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-400"></span>
                    </span>
                    <Wifi className="w-3 h-3 text-emerald-400 hidden sm:inline" />
                    <span className="text-[10px] sm:text-[11px] font-bold hidden xs:inline">Online</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-amber-400"></span>
                    </span>
                    <WifiOff className="w-3 h-3 text-amber-300 hidden sm:inline" />
                    <span className="text-[10px] sm:text-[11px] font-bold">Offline</span>
                  </>
                )}
              </div>

              {/* Sync Button (Always Available) */}
              <button
                onClick={handleForceSync}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                  isSyncing
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 animate-pulse'
                    : offlineQueueCount > 0
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white border-rose-400 font-black shadow-md ring-2 ring-rose-500/40 animate-pulse'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700'
                }`}
                title={
                  offlineQueueCount > 0
                    ? `PERINGATAN: Ada ${offlineQueueCount} data belum terkirim ke database Cloud! Klik untuk mengirim sekarang.`
                    : 'Klik untuk menyinkronkan data presensi & siswa ke Server & Cloud'
                }
              >
                <RefreshCw
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSyncing ? 'animate-spin text-cyan-300' : offlineQueueCount > 0 ? 'text-white' : 'text-sky-300'}`}
                />
                <span className="text-[10px] sm:text-[11px]">
                  {isSyncing ? 'Mengirim...' : offlineQueueCount > 0 ? `${offlineQueueCount} Tertunda` : 'Sync'}
                </span>
              </button>
            </div>

            {/* Realtime Clock (Desktop only) */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 font-mono shadow-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>{time}</span>
            </div>

            {/* Global Dark Mode Theme Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg sm:rounded-xl transition-all shadow-xs flex items-center gap-1 text-xs font-semibold cursor-pointer shrink-0"
                title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-spin-slow" />
                    <span className="hidden xl:inline text-amber-200 text-[11px]">Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
                    <span className="hidden xl:inline text-cyan-100 text-[11px]">Gelap</span>
                  </>
                )}
              </button>
            )}

            {/* Quick AI Button (Extra Large screens only) */}
            {currentUser && (
              <button
                onClick={() => setActiveTab('ai-analysis')}
                className={`hidden lg:flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 text-xs rounded-lg sm:rounded-xl border transition-all font-semibold cursor-pointer shrink-0 ${
                  activeTab === 'ai-analysis'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-slate-800/80 text-amber-200 border-amber-400/30 hover:bg-slate-700/80'
                }`}
                title="Analisis AI Gemini"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[11px]">Analisis AI</span>
              </button>
            )}

            {/* User Profile / Role & Critical Actions (Settings + Logout) */}
            {currentUser && (
              <div className="flex items-center gap-1 sm:gap-1.5 pl-1 sm:pl-2 border-l border-slate-800 shrink-0">
                <div className="hidden md:block text-right pr-0.5">
                  <div className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
                    {currentUser.name}
                  </div>
                  <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
                </div>

                <button
                  onClick={() => setActiveTab('settings')}
                  className="p-1.5 sm:p-2 text-amber-300 hover:text-white bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
                  title="Pengaturan & Kata Sandi"
                  aria-label="Pengaturan Sekolah"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onLogout}
                  className="p-1.5 sm:p-2 text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-600/80 border border-rose-500/30 hover:border-rose-500 rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1 font-bold text-xs"
                  title="Keluar / Ganti Akun"
                  aria-label="Keluar Aplikasi"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300 group-hover:text-white" />
                  <span className="hidden sm:inline text-[11px]">Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

