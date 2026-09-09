import React from 'react';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  QrCode,
  Users,
  FileSpreadsheet,
  Menu,
  UserCheck,
  Settings,
  Sparkles,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
  onOpenMobileMenu: () => void;
  offlineQueueCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  userRole = 'Admin',
  onOpenMobileMenu,
  offlineQueueCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Beranda',
      icon: LayoutDashboard,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
    },
    {
      id: 'scan',
      label: 'Scan QR/RFID',
      icon: QrCode,
      roles: ['Admin', 'Guru'],
      isPrimary: true,
    },
    {
      id: 'recap',
      label: 'Log Presensi',
      icon: FileSpreadsheet,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
    },
    {
      id: 'students',
      label: 'Data Siswa',
      icon: Users,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 text-slate-300 px-1 py-1.5 shadow-2xl safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isPrimary) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center p-1 -mt-4 transition-all duration-200 cursor-pointer active:scale-95 group`}
                title={item.label}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 border ${
                    isActive
                      ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white border-cyan-300 ring-2 ring-cyan-400/50 shadow-cyan-500/30'
                      : 'bg-slate-800 text-cyan-400 border-cyan-500/40 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-6 h-6 animate-pulse" />
                </div>
                <span
                  className={`text-[10px] font-extrabold mt-1 tracking-tight ${
                    isActive ? 'text-cyan-300' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                isActive ? 'text-cyan-400 font-black' : 'text-slate-400 hover:text-slate-200 font-semibold'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-cyan-300' : ''}`} />
                {item.id === 'recap' && offlineQueueCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-amber-300 animate-bounce">
                    !
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 truncate max-w-[64px]">{item.label}</span>
            </button>
          );
        })}

        {/* Menu Toggle for More Pages */}
        <button
          onClick={onOpenMobileMenu}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-400 hover:text-slate-200 font-semibold transition-all cursor-pointer active:scale-95"
          title="Semua Menu"
        >
          <Menu className="w-5 h-5 text-slate-300" />
          <span className="text-[10px] mt-0.5 font-bold">Lainnya</span>
        </button>
      </div>
    </nav>
  );
};
