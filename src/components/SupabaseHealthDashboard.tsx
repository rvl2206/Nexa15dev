import React, { useState, useEffect } from 'react';
import {
  Activity,
  HardDrive,
  Database,
  Wifi,
  WifiOff,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Layers,
  Clock,
  ArrowUpRight,
  Lock,
  Check,
  FileText,
  Sparkles,
  HelpCircle,
  Cpu,
  Info,
} from 'lucide-react';
import { SupabaseHealthReport, SupabaseTableMetric, fetchSupabaseHealthAndMetrics } from '../lib/supabase';
import { store } from '../lib/store';
import { toast } from '../lib/toast';

interface SupabaseHealthDashboardProps {
  supabaseUrl?: string;
  supabaseKey?: string;
  onCopySchema: () => void;
  onTriggerMigrate: () => void;
  onTriggerSync: () => void;
  isMigrating?: boolean;
  isSyncing?: boolean;
}

export const SupabaseHealthDashboard: React.FC<SupabaseHealthDashboardProps> = ({
  supabaseUrl,
  supabaseKey,
  onCopySchema,
  onTriggerMigrate,
  onTriggerSync,
  isMigrating = false,
  isSyncing = false,
}) => {
  const [report, setReport] = useState<SupabaseHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const syncQueueInfo = store.getSyncQueueDetails();
  const settings = store.getSettings();

  const loadHealthReport = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const config = supabaseUrl && supabaseKey ? { url: supabaseUrl, key: supabaseKey } : undefined;
      const res = await fetchSupabaseHealthAndMetrics(config);
      setReport(res);
      setLastRefreshed(new Date());
      if (!silent) {
        if (res.success && res.missingTablesCount === 0) {
          toast.success('Kesehatan Database Terverifikasi', `Latensi: ${res.latencyMs}ms | ${res.totalRecordsInCloud} data di cloud`);
        } else if (res.missingTablesCount > 0) {
          toast.warning('Tabel Belum Lengkap', `${res.missingTablesCount} tabel belum dibuat di Supabase`);
        } else {
          toast.error('Pemeriksaan Gagal', res.message);
        }
      }
    } catch (err: any) {
      if (!silent) {
        toast.error('Gagal Memuat Kesehatan Supabase', err?.message || 'Gangguan koneksi');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      loadHealthReport(true);
    }
  }, [supabaseUrl, supabaseKey]);

  useEffect(() => {
    let interval: any = null;
    if (autoRefresh && supabaseUrl && supabaseKey) {
      interval = setInterval(() => {
        loadHealthReport(true);
      }, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, supabaseUrl, supabaseKey]);

  const isConfigured = Boolean(supabaseUrl && supabaseKey);

  const getLatencyBadge = (latency: number) => {
    if (latency <= 0) return { label: 'N/A', color: 'text-slate-400 bg-slate-100 dark:bg-slate-800' };
    if (latency < 250) return { label: `${latency}ms (Sangat Cepat)`, color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300' };
    if (latency < 700) return { label: `${latency}ms (Normal)`, color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/80 border-blue-300' };
    if (latency < 1500) return { label: `${latency}ms (Cukup)`, color: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border-amber-300' };
    return { label: `${latency}ms (Lambat)`, color: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border-rose-300' };
  };

  const latencyBadge = getLatencyBadge(report?.latencyMs || 0);

  return (
    <div id="supabase-health-dashboard" className="space-y-4">
      {/* HEADER CARD: Real-Time Connection & Live Status */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl border border-slate-850 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  Pemantauan Kesehatan & Kuota Supabase
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Real-time
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Status sinkronisasi langsung, metrik tabel, dan estimasi beban database cloud
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              title="Perbarui otomatis setiap 15 detik"
            >
              <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="text-[11px]">{autoRefresh ? 'Auto-Update ON (15s)' : 'Auto-Update'}</span>
            </button>

            <button
              type="button"
              onClick={() => loadHealthReport(false)}
              disabled={loading || !isConfigured}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Memeriksa...' : 'Cek Status Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Live Status Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Status Server</span>
            <div className="flex items-center gap-1.5 mt-1">
              {!isConfigured ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="font-bold text-slate-400 text-xs">Belum Diatur</span>
                </>
              ) : report?.status === 'healthy' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-emerald-400 text-xs">Prima (Online)</span>
                </>
              ) : report?.status === 'warning' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-bold text-amber-400 text-xs">Perlu Perhatian</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="font-bold text-rose-400 text-xs">Terputus / Error</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Latensi Ping</span>
            <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-xs text-slate-200">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{report?.latencyMs ? `${report.latencyMs} ms` : '-'}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Tabel Terverifikasi</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-xs">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className={report?.tablesFoundCount === 8 ? 'text-emerald-400' : 'text-amber-400'}>
                {report ? `${report.tablesFoundCount} / 8 Tabel` : '-'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Enkripsi & TLS</span>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-slate-200">{report?.sslActive ? 'HTTPS / TLS 1.3' : 'Tidak Aktif'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 STATS CARDS: Database Quota, Total Cloud Records, and Sync Queue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Storage Quota */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              Penggunaan Kuota Database
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Free Tier: 500 MB
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {report ? `${report.estimatedTotalSizeMB} MB` : '0 MB'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {report ? `${report.storageUsagePercent}% terpakai` : '0%'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, report?.storageUsagePercent || 0)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Tersisa: {report ? `${(500 - report.estimatedTotalSizeMB).toFixed(2)} MB` : '500 MB'}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Sangat Lapang</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Records Stored in Cloud */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-500" />
              Total Baris Data di Cloud
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              8 Tabel
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {report ? report.totalRecordsInCloud.toLocaleString('id-ID') : '0'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">baris tersimpan</span>
            </div>

            {/* Progress bar vs soft limit 500k */}
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, report?.rowUsagePercent || 0)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Batas nyaman: 500.000 baris</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Aman</span>
            </div>
          </div>
        </div>

        {/* Card 3: Sync Queue & Real-Time Sync Status */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-amber-500" />
              Status Antrean Sinkronisasi
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                syncQueueInfo.total === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
            >
              {syncQueueInfo.total === 0 ? 'Semua Tersinkron' : `${syncQueueInfo.total} Tertunda`}
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {syncQueueInfo.total}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                item menunggu upload
              </span>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>
                Terakhir:{' '}
                {settings.lastSupabaseSync
                  ? new Date(settings.lastSupabaseSync).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Belum pernah'}
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onTriggerSync}
                disabled={isSyncing || !isConfigured}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyelaraskan...' : 'Sinkronkan Antrean Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED 8 TABLES BREAKDOWN */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              Rincian 8 Tabel Database Supabase
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Kesehatan skema, jumlah data tersimpan, dan estimasi ukuran memori per tabel
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopySchema}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Salin Skrip DDL SQL</span>
            </button>

            <button
              type="button"
              onClick={onTriggerMigrate}
              disabled={isMigrating || !isConfigured}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Database className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
              <span>{isMigrating ? 'Memigrasikan...' : 'Migrasi Penuh'}</span>
            </button>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(report?.tables || [
            { id: 'students', name: 'students', label: 'Master Siswa', exists: false, rowCount: 0, estimatedSizeKB: 0, status: 'missing' },
            { id: 'attendance', name: 'attendance', label: 'Presensi Siswa', exists: false, rowCount: 0, estimatedSizeKB: 0, status: 'missing' },
            { id: 'teachers', name: 'teachers', label: 'Master Guru & GTK', exists: false, rowCount: 0, estimatedSizeKB: 0, status: 'missing' },
            { id: 'teacher_attendance', name: 'teacher_attendance', label: 'Presensi Guru', exists: false, rowCount: 0, estimatedSizeKB: 0, status: 'missing' },
            { id: 'app_users', name: 'app_users', label: 'Akun Pengguna', exists: false, rowCount: 0, estimatedSizeKB: 0, status: 'missing' },
            { id: 'school_settings', name: 'school_settings', label: 'Pengaturan Sekolah', exists: false, rowCount: 0, estimatedSizeKB: 0, status: 'missing' },
            { id: 'problematic_student_dispatches', name: 'problematic_student_dispatches', label: 'Disposisi Siswa', exists: false, rowCount: 0, estimatedSizeKB: 0, status: 'missing' },
            { id: 'activity_logs', name: 'activity_logs', label: 'Log Audit & Aktivitas', exists: false, rowCount: 0, estimatedSizeKB: 0, status: 'missing' },
          ]).map((table: SupabaseTableMetric | any) => (
            <div
              key={table.id}
              className={`p-3 rounded-xl border transition-all ${
                table.exists
                  ? 'bg-slate-50/80 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800'
                  : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate font-semibold">
                  public.{table.name}
                </span>
                {table.exists ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Aktif
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Belum Ada
                  </span>
                )}
              </div>

              <div className="mt-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {table.label}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {table.exists ? table.rowCount.toLocaleString('id-ID') : '-'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {table.exists ? `~${table.estimatedSizeKB} KB` : 'Belum dibuat'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* INFO NOTICE BANNER */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Prinsip Sinkronisasi & Migrasi Aman (UPSERT):
            </span>
            <p className="text-[11px] leading-relaxed">
              Sistem menggunakan metode sinkronisasi non-destruktif berbasis primary key. Data lama di Supabase <b>tidak akan pernah dihapus</b>, melainkan diperbarui dan digabungkan secara otomatis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
