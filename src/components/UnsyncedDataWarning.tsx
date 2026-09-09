import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CloudAlert,
  CloudCheck,
  CloudOff,
  CloudUpload,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  X,
  Clock,
  User,
  GraduationCap,
  Calendar,
  ShieldAlert,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';
import { store, SyncQueueItem } from '../lib/store';
import { toast } from '../lib/toast';

interface UnsyncedDataWarningProps {
  onNavigateToSettings?: () => void;
  compact?: boolean;
}

export const UnsyncedDataWarning: React.FC<UnsyncedDataWarningProps> = ({
  onNavigateToSettings,
  compact = false,
}) => {
  const [queueDetails, setQueueDetails] = useState(store.getSyncQueueDetails());
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [syncSuccessJustFinished, setSyncSuccessJustFinished] = useState<boolean>(false);
  const hasAutoOpenedRef = useRef<boolean>(false);

  // Sound alert context
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Audio playback may be restricted before user interaction
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync when coming back online
      store.syncAllPendingToDatabase(false).catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);

    // Custom event to open piket modal directly from Navbar or Scanner
    const handleOpenModal = () => {
      setIsModalOpen(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('open-unsynced-modal', handleOpenModal);

    const unsubscribe = store.subscribe(() => {
      const current = store.getSyncQueueDetails();
      setQueueDetails(current);

      // Auto-popup for duty officer if there is unsynced data and hasn't auto-opened yet
      if (current.total > 0 && !hasAutoOpenedRef.current) {
        hasAutoOpenedRef.current = true;
        setIsModalOpen(true);
        playAlertSound();
      } else if (current.total === 0) {
        hasAutoOpenedRef.current = false;
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('open-unsynced-modal', handleOpenModal);
      unsubscribe();
    };
  }, []);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await store.syncAllPendingToDatabase(true);
      if (res.success) {
        toast.success('Pengiriman Berhasil', res.message);
        setIsExpanded(false);
        setSyncSuccessJustFinished(true);
        setTimeout(() => setSyncSuccessJustFinished(false), 8000);
      } else {
        toast.warning('Gagal Mengirim Sebagian Data', res.message);
      }
    } catch (err: any) {
      toast.error('Gagal Mengirim Data', err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSyncing(false);
    }
  };

  const total = queueDetails.total;

  const getItemLabel = (item: SyncQueueItem): { title: string; subtitle: string; icon: any } => {
    if (item.type === 'attendance') {
      const data = item.data || {};
      const statusText = data.status || 'Presensi';
      const jenisText = data.jenis || 'Scan';
      return {
        title: `${data.nama || 'Siswa'} (${data.kelas || '-'})`,
        subtitle: `${jenisText} - ${statusText} | ${data.tanggal || '-'} ${
          data.timestamp
            ? new Date(data.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''
        }`,
        icon: GraduationCap,
      };
    }
    if (item.type === 'teacher_attendance') {
      const data = item.data || {};
      return {
        title: `${data.nama || 'Guru'}`,
        subtitle: `Presensi Guru ${data.jenis || ''} (${data.status || ''}) | ${data.tanggal || '-'}`,
        icon: User,
      };
    }
    if (item.type === 'student') {
      const data = item.data || {};
      return {
        title: `Data Siswa: ${data.nama || item.id}`,
        subtitle: `Kelas: ${data.kelas || '-'} | NISN: ${data.nisn || '-'} (${item.action})`,
        icon: GraduationCap,
      };
    }
    if (item.type === 'teacher') {
      const data = item.data || {};
      return {
        title: `Data Guru: ${data.nama || item.id}`,
        subtitle: `NIP/Mata Pelajaran: ${data.nip || data.mapel || '-'} (${item.action})`,
        icon: User,
      };
    }
    return {
      title: `Aktivitas Sistem (${item.type})`,
      subtitle: `ID: ${item.id.slice(0, 14)} (${item.action})`,
      icon: Database,
    };
  };

  // If no unsynced data and modal is not explicitly kept open for success message
  if (total === 0 && !isModalOpen) return null;

  return (
    <>
      {/* 1. POPUP MODAL KHUSUS PETUGAS PIKET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {total > 0 ? (
              <div>
                {/* Modal Header */}
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="p-3 bg-gradient-to-br from-rose-600 to-amber-600 text-white rounded-2xl shadow-md flex-shrink-0 animate-pulse">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 pr-6">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-200 uppercase">
                        Perhatian Petugas Piket
                      </span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        PENTING!
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 leading-snug">
                      Ada {total} Data Presensi Belum Masuk ke Database Server!
                    </h3>
                  </div>
                </div>

                {/* Info Callout */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs sm:text-sm leading-relaxed mb-4">
                  <p>
                    <b>Bapak/Ibu Petugas Piket:</b> Data presensi berikut masih tersimpan di memori browser ini (karena koneksi internet sempat offline).{' '}
                    <span className="font-bold underline decoration-rose-500">
                      Sebelum piket selesai atau laptop dimatikan
                    </span>
                    , tekan tombol <b>Kirim ke Database Server Sekarang</b> di bawah ini agar data rekapitulasi siswa tidak hilang.
                  </p>
                </div>

                {/* Queue Summary Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                  {queueDetails.attendanceCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      <GraduationCap className="w-4 h-4 text-amber-600" />
                      <span>Presensi Siswa: {queueDetails.attendanceCount}</span>
                    </span>
                  )}
                  {queueDetails.teacherCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                      <User className="w-4 h-4 text-purple-600" />
                      <span>Presensi Guru: {queueDetails.teacherCount}</span>
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold border ${
                      isOnline
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 animate-pulse'
                    }`}
                  >
                    {isOnline ? (
                      <>
                        <Wifi className="w-4 h-4 text-emerald-600" />
                        <span>Koneksi Online (Siap Kirim)</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-rose-600" />
                        <span>Koneksi Offline (Hubungkan Internet)</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Queue List Preview */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 mb-5 scrollbar-thin">
                  {queueDetails.items.map((item, idx) => {
                    const info = getItemLabel(item);
                    const IconComponent = info.icon;
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex-shrink-0">
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {info.title}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {info.subtitle}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex-shrink-0">
                          Tertunda
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="w-full sm:flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 hover:from-rose-700 hover:to-amber-700 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>
                      {isSyncing
                        ? 'Sedang Mengirim ke Database Server...'
                        : 'KIRIM KE DATABASE SERVER SEKARANG'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-3 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Tutup Sementara
                  </button>
                </div>
              </div>
            ) : (
              /* Success State */
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50 dark:ring-emerald-900/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  STATUS DATABASE 100% AMAN!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                  Semua data presensi siswa dan guru telah berhasil tersimpan di Database Cloud/Server. Tidak ada data yang tersangkut di browser. Petugas piket dapat mematikan laptop atau logout dengan aman.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    Tutup Status
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. FLOATING PILL JIKA DIMINIMALISIR */}
      {isMinimized && total > 0 && (
        <div className="fixed bottom-20 right-4 z-40 animate-fade-in">
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-rose-600 text-white px-3.5 py-2 rounded-2xl shadow-xl border border-amber-300/40 text-xs font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-100" />
            <span>{total} Data Belum Terkirim</span>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 bg-white text-rose-700 hover:bg-white/90 rounded-lg text-[11px] font-black cursor-pointer transition-all shadow-xs"
            >
              Buka Popup Petugas
            </button>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-black cursor-pointer transition-all flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Kirim</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-white/20 rounded-lg text-[10px] font-medium transition-all"
              title="Buka Peringatan Lengkap"
            >
              Buka
            </button>
          </div>
        </div>
      )}

      {/* 3. BANNER PERINGATAN GLOBAL DI ATAS HALAMAN */}
      {!isMinimized && total > 0 && (
        <div
          role="alert"
          className="w-full bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 dark:from-amber-950/70 dark:via-rose-950/50 dark:to-amber-950/70 border-y-2 sm:border-2 sm:rounded-2xl border-amber-500/60 dark:border-amber-500/70 text-amber-950 dark:text-amber-100 shadow-lg my-2 transition-all overflow-hidden"
        >
          <div className="p-3.5 sm:p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              {/* Left: Warning Icon & Message */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="relative shrink-0 mt-0.5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md">
                    <CloudAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black tracking-wide text-rose-700 dark:text-rose-300 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>PERHATIAN PETUGAS PIKET: {total} DATA BELUM TERKIRIM KE SERVER</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                      Antisipasi Data Tidak Terekam
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                    Data scan presensi ini <b>baru tersimpan di browser ini</b> dan{' '}
                    <b>belum masuk ke Database Cloud/Server</b>. Sebelum piket berakhir atau komputer dimatikan, klik tombol kirim di bawah agar data tidak hilang.
                  </p>

                  {/* Data Breakdown Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {queueDetails.attendanceCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Presensi Siswa: {queueDetails.attendanceCount}</span>
                      </span>
                    )}
                    {queueDetails.teacherCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700/80">
                        <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Presensi Guru: {queueDetails.teacherCount}</span>
                      </span>
                    )}
                    {queueDetails.studentCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700/80">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Data Siswa: {queueDetails.studentCount}</span>
                      </span>
                    )}
                    {/* Connection Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                        isOnline
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700 animate-pulse'
                      }`}
                    >
                      {isOnline ? (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Online (Siap Kirim)</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Offline (Tidak Ada Internet)</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full sm:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-amber-300/40 dark:border-amber-800/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Buka Popup Piket</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 border border-amber-300/60 dark:border-amber-700/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>{isExpanded ? 'Tutup' : 'Lihat Rincian'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 hover:from-amber-700 hover:to-rose-800 shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Mengirim...' : 'Kirim ke Server Sekarang'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Minimalisir Peringatan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Details Drawer */}
            {isExpanded && (
              <div className="mt-4 pt-3 border-t border-amber-300/60 dark:border-amber-800/60 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-600" />
                    <span>Daftar {total} Data yang Belum Terkirim ke Server:</span>
                  </h4>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Paling Baru di Atas
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {queueDetails.items.map((item, idx) => {
                    const info = getItemLabel(item);
                    const IconComponent = info.icon;
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/60 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 shrink-0">
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {info.title}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {info.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Tertunda
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                            {new Date(item.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
