import React, { useState, useEffect, useRef } from 'react';
import { store } from '../lib/store';
import { ActivityLog } from '../types';
import { AttendanceRecoveryModal } from './AttendanceRecoveryModal';
import { toast } from '../lib/toast';
import {
  History,
  Shield,
  Clock,
  Search,
  User,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Trash2,
  Database,
  ListChecks,
  Radio,
  Play,
  Pause,
  Zap,
} from 'lucide-react';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [anomalies, setAnomalies] = useState<
    ReturnType<typeof store.findDoubleMasukRecords>
  >([]);
  const [missingCount, setMissingCount] = useState<number>(0);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-refresh state
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(false);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(30);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isRefreshingAnim, setIsRefreshingAnim] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const refreshData = () => {
    setIsRefreshingAnim(true);
    setLogs(store.getLogs());
    setAnomalies(store.findDoubleMasukRecords());
    setMissingCount(store.getMissingAttendanceItemsFromLogs().length);
    setLastRefreshedAt(new Date());
    setTimeout(() => setIsRefreshingAnim(false), 400);
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = store.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  // Interval timer for Auto-Refresh (lightweight sync)
  useEffect(() => {
    if (!isAutoRefresh) return;
    const intervalId = setInterval(() => {
      refreshData();
    }, refreshIntervalSec * 1000);

    return () => clearInterval(intervalId);
  }, [isAutoRefresh, refreshIntervalSec]);

  const handleBatchRepair = () => {
    setIsRepairing(true);
    setTimeout(() => {
      store.repairDoubleMasukRecords();
      refreshData();
      setIsRepairing(false);
    }, 300);
  };

  const handleSingleRepair = (recordIds: string[]) => {
    setIsRepairing(true);
    setTimeout(() => {
      store.repairDoubleMasukRecords(recordIds);
      refreshData();
      setIsRepairing(false);
    }, 200);
  };

  const handleClearLogs = () => {
    store.clearLogs();
    setSelectedLogIds([]);
    refreshData();
    toast.success('Log Dibersihkan', 'Seluruh riwayat log aktivitas telah dibersihkan.');
  };

  const handleToggleSelectAll = () => {
    if (filteredLogs.length > 0 && selectedLogIds.length === filteredLogs.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredLogs.map((l) => l.id));
    }
  };

  const handleToggleSelectLog = (id: string) => {
    if (selectedLogIds.includes(id)) {
      setSelectedLogIds(selectedLogIds.filter((item) => item !== id));
    } else {
      setSelectedLogIds([...selectedLogIds, id]);
    }
  };

  const handleDeleteSelectedLogs = () => {
    if (selectedLogIds.length === 0) return;
    const count = selectedLogIds.length;
    store.deleteSelectedLogs(selectedLogIds);
    setSelectedLogIds([]);
    refreshData();
    toast.success('Log Dihapus', `${count} baris log aktivitas terpilih berhasil dihapus.`);
  };

  const totalDuplicateRecordsCount = anomalies.reduce(
    (acc, item) => acc + item.duplicateRecords.length,
    0
  );

  const filteredLogs = React.useMemo(() => {
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  // Reset to page 1 when filter or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, logs.length, pageSize]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = React.useMemo(() => {
    if (pageSize === 0) return filteredLogs;
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>Audit System Log & Diagnostik</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Log Aktivitas & Diagnostik Sistem
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Catatan Jejak Pemindaian QR Code, Audit Perubahan Data, serta Alat Diagnostik Perbaikan Absensi.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Auto-Refresh Real-Time Status Toggle */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                isAutoRefresh
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}
              title={isAutoRefresh ? 'Auto-Refresh Aktif (Klik untuk Jeda)' : 'Auto-Refresh Nonaktif (Klik untuk Aktifkan)'}
            >
              {isAutoRefresh ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Real-Time ON</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-slate-500" />
                  <span>Auto-Refresh OFF</span>
                </>
              )}
            </button>

            {isAutoRefresh && (
              <select
                value={refreshIntervalSec}
                onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold rounded-lg px-2 py-1 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                title="Pilih interval pembaharuan otomatis"
              >
                <option value={2}>Setiap 2d</option>
                <option value={3}>Setiap 3d</option>
                <option value={5}>Setiap 5d</option>
                <option value={10}>Setiap 10d</option>
                <option value={30}>Setiap 30d</option>
              </select>
            )}

            <button
              type="button"
              onClick={refreshData}
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              title="Refresh Manual Sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAnim ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
            </button>
          </div>

          <div className="w-full sm:w-56 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari log aktivitas..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Attendance Recovery Banner Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-indigo-500/10 border border-sky-200/80 dark:border-sky-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-300 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Alat Pemulihan Absensi (Attendance Recovery Tool)
              </h3>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                  missingCount > 0
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 animate-pulse'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700'
                }`}
              >
                {missingCount > 0 ? `${missingCount} Rekaman Belum Sinkron` : 'Data Presensi Sinkron 100%'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {missingCount > 0
                ? `Ditemukan ${missingCount} rekaman absensi di Log Aktivitas yang belum masuk ke Koleksi Master Absensi. Anda dapat meninjau dan memulihkan entri spesifik.`
                : 'Semua rekaman absensi dari log pemindaian telah tersinkronkan dengan sempurna ke tabel rekap absensi.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsRecoveryOpen(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <ListChecks className="w-4 h-4" />
            <span>{missingCount > 0 ? `Buka Pemulihan (${missingCount})` : 'Buka Alat Pemulihan'}</span>
          </button>
        </div>
      </div>

      {/* Diagnostic & Batch Repair Tool Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                totalDuplicateRecordsCount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-400'
              }`}
            >
              {totalDuplicateRecordsCount > 0 ? (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Alat Diagnostik & Perbaikan 'Masuk' Ganda
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    totalDuplicateRecordsCount > 0
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                  }`}
                >
                  {totalDuplicateRecordsCount > 0
                    ? `${anomalies.length} Kasus (${totalDuplicateRecordsCount} Rekaman Ganda)`
                    : 'Sistem Normal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mendeteksi siswa yang terrekam 'Masuk' lebih dari 1 kali pada hari yang sama dan mengubah entri kedua secara otomatis menjadi 'Pulang'.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                const res = store.autoRepairAttendanceFromActivityLogs();
                refreshData();
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 flex items-center gap-1.5 transition-all shadow-sm"
              title="Pulihkan & Sinkronkan entri absensi yang ada di Log Aktivitas ke Tabel Rekap Absensi"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Pulihkan Absensi dari Log</span>
            </button>

            <button
              type="button"
              onClick={refreshData}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Pindai Ulang Data Absensi"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
              <span>Pindai</span>
            </button>

            {totalDuplicateRecordsCount > 0 && (
              <button
                type="button"
                onClick={handleBatchRepair}
                disabled={isRepairing}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isRepairing ? 'Memperbaiki...' : 'Perbaiki Semua Sekaligus (Batch Repair)'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
            >
              {isExpanded ? 'Sembunyikan' : 'Buka Detail'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-5">
            {anomalies.length > 0 ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Ditemukan Indikasi 'Masuk' Ganda!</span>
                    <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                      Terdapat <strong className="font-extrabold">{anomalies.length} siswa</strong> yang melakukan scan masuk lebih dari sekali pada tanggal yang sama tanpa tercatat scan pulang di antaranya.
                      Klik tombol <strong>"Perbaiki Semua Sekaligus"</strong> di atas atau tombol <strong>"Ubah ke Pulang"</strong> pada baris terkait untuk mengoreksi entri kedua menjadi absensi <strong>Pulang</strong>.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Siswa & Kelas</th>
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Scan 1 (Valid Masuk)</th>
                        <th className="p-3">Scan 2+ (Masuk Ganda)</th>
                        <th className="p-3 text-right">Aksi Perbaikan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {anomalies.map((item, idx) => {
                        const duplicateIds = item.duplicateRecords.map((r) => r.id);
                        return (
                          <tr key={`${item.studentNisn}-${item.dateStr}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {item.studentName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span>NISN: {item.studentNisn || '-'}</span>
                                <span>•</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {item.kelas}
                                </span>
                              </div>
                            </td>

                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {item.dateStr}
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 font-bold">
                                <span>Masuk:</span>
                                <span className="font-mono">
                                  {new Date(item.firstRecord.timestamp).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'Asia/Jayapura',
                                  })} WIT
                                </span>
                              </div>
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              <div className="space-y-1">
                                {item.duplicateRecords.map((dup) => (
                                  <div
                                    key={dup.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 font-bold text-[11px]"
                                  >
                                    <span>Tercatat Masuk:</span>
                                    <span className="font-mono">
                                      {new Date(dup.timestamp).toLocaleTimeString('id-ID', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'Asia/Jayapura',
                                      })} WIT
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="p-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleSingleRepair(duplicateIds)}
                                disabled={isRepairing}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold rounded-lg shadow-sm text-xs inline-flex items-center gap-1 transition-all disabled:opacity-50"
                              >
                                <Wrench className="w-3 h-3" />
                                <span>Ubah ke Pulang</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-center space-y-2">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                  Sistem Tidak Menemukan Rekaman Ganda
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto">
                  Seluruh data kehadiran siswa valid. Tidak ada catatan siswa yang masuk 2 kali pada tanggal yang sama.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Riwayat Audit System Log ({filteredLogs.length} Entri)</span>
            {selectedLogIds.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {selectedLogIds.length} Terpilih
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedLogIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelectedLogs}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm animate-fadeIn"
                title="Hapus log yang dicentang"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedLogIds.length} Log Terpilih</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>
                Update: {lastRefreshedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jayapura' })} WIT
              </span>
            </div>

            <span className="text-[11px] font-normal text-slate-400">200 log terbaru</span>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Bersihkan Semua Log Aktivitas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Semua</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredLogs.length > 0 && selectedLogIds.length === filteredLogs.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Pilih Semua / Batal Pilih"
                  />
                </th>
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">Pengguna / Role</th>
                <th className="p-3.5">Aksi Aktivitas</th>
                <th className="p-3.5">Rincian Detail</th>
                <th className="p-3.5 text-right w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => {
                  const isSelected = selectedLogIds.includes(log.id);
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-sky-50/60 dark:bg-sky-950/30' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectLog(log.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                          timeZone: 'Asia/Jayapura',
                        })} WIT
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{log.user}</div>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-semibold">
                          {log.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-blue-700 dark:text-blue-400">{log.action}</td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">{log.details}</td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            store.deleteSelectedLogs([log.id]);
                            setSelectedLogIds((prev) => prev.filter((id) => id !== log.id));
                            refreshData();
                            toast.success('Log Dihapus', 'Baris riwayat aktivitas berhasil dihapus.');
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus baris log ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                    Belum ada log aktivitas yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                Menampilkan{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1}
                </span>{' '}
                -{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {pageSize === 0 ? filteredLogs.length : Math.min(currentPage * pageSize, filteredLogs.length)}
                </span>{' '}
                dari <span className="font-bold text-slate-800 dark:text-slate-200">{filteredLogs.length}</span> log
              </div>

              <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
                <span className="text-slate-500 font-medium">Per Halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-semibold focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>Semua</option>
                </select>
              </div>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Sebelumnya
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AttendanceRecoveryModal
        isOpen={isRecoveryOpen}
        onClose={() => setIsRecoveryOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
};

