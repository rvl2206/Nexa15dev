import React, { useState, useEffect, useMemo } from 'react';
import { store } from '../lib/store';
import { Student, AttendanceRecord } from '../types';
import {
  UserCheck,
  Clock,
  XCircle,
  AlertTriangle,
  FileCheck,
  Stethoscope,
  TrendingUp,
  CheckCircle2,
  Users,
  Sparkles,
  QrCode,
  ArrowRight,
  Filter,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DailySummaryWidgetProps {
  students: Student[];
  attendance: AttendanceRecord[];
  selectedDate: string;
  onOpenScanner?: () => void;
  onSelectClassFilter?: (className: string) => void;
}

export const DailySummaryWidget: React.FC<DailySummaryWidgetProps> = ({
  students,
  attendance,
  selectedDate,
  onOpenScanner,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit'>('all');
  const [showStudentListModal, setShowStudentListModal] = useState<boolean>(false);
  const [modalFilter, setModalFilter] = useState<'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit'>('belum_absen');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLivePulsing, setIsLivePulsing] = useState<boolean>(false);
  const [lastScanRecord, setLastScanRecord] = useState<AttendanceRecord | null>(null);

  const todayYyyyMmDd = store.getTodayYyyyMmDd();
  const isToday = selectedDate === todayYyyyMmDd;

  // Raw records for selected date
  const dateRecords = useMemo(() => {
    return attendance.filter((a) => store.isRecordForDate(a, selectedDate));
  }, [attendance, selectedDate]);

  // Deduplicate per student for accurate daily count
  const studentDailyMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    dateRecords.forEach((r) => {
      const existing = map.get(r.nisn);
      if (!existing) {
        map.set(r.nisn, r);
      } else {
        if (existing.jenis === 'Pulang' && r.jenis !== 'Pulang') {
          map.set(r.nisn, r);
        }
      }
    });
    return map;
  }, [dateRecords]);

  const uniqueDailyRecords = useMemo(() => {
    return Array.from(studentDailyMap.values());
  }, [studentDailyMap]);

  // Active student list
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.status === 'aktif');
  }, [students]);

  const totalActive = activeStudents.length;

  // Counts
  const hadirRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Hadir'), [uniqueDailyRecords]);
  const terlambatRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Terlambat'), [uniqueDailyRecords]);
  const izinRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Izin'), [uniqueDailyRecords]);
  const sakitRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Sakit'), [uniqueDailyRecords]);
  const alpaRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Alpa'), [uniqueDailyRecords]);

  const hadirCount = hadirRecords.length;
  const terlambatCount = terlambatRecords.length;
  const izinCount = izinRecords.length;
  const sakitCount = sakitRecords.length;
  const alpaCount = alpaRecords.length;
  const totalMasuk = hadirCount + terlambatCount;

  // Students who have not checked in yet today (Belum Absen)
  const scannedNisns = useMemo(() => {
    return new Set(uniqueDailyRecords.map((r) => r.nisn));
  }, [uniqueDailyRecords]);

  const belumAbsenStudents = useMemo(() => {
    return activeStudents.filter((s) => !scannedNisns.has(s.nisn));
  }, [activeStudents, scannedNisns]);

  const belumAbsenCount = belumAbsenStudents.length;

  // Attendance rate calculation
  const attendanceRate = totalActive > 0 ? Math.round((totalMasuk / totalActive) * 100) : 0;
  const onTimeRate = totalMasuk > 0 ? Math.round((hadirCount / totalMasuk) * 100) : 0;

  // Latest 5 scans for the selected date sorted by timestamp descending
  const recentScans = useMemo(() => {
    return [...dateRecords]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [dateRecords]);

  useEffect(() => {
    if (recentScans.length > 0) {
      setLastScanRecord(recentScans[0]);
    }
  }, [recentScans]);

  // Class-by-class quick summary
  const classBreakdown = useMemo(() => {
    const classes: string[] = Array.from(
      new Set<string>(activeStudents.map((s) => (s.kelas ? s.kelas.trim() : '')))
    ).filter((c): c is string => Boolean(c)).sort();

    return classes.map((cls: string) => {
      const clsStudents = activeStudents.filter(
        (s) => s.kelas && s.kelas.trim().toLowerCase() === cls.toLowerCase()
      );
      const clsTotal = clsStudents.length;
      const clsDailyRecords = uniqueDailyRecords.filter(
        (r) => r.kelas && r.kelas.trim().toLowerCase() === cls.toLowerCase()
      );
      const clsHadir = clsDailyRecords.filter((r) => r.status === 'Hadir').length;
      const clsLate = clsDailyRecords.filter((r) => r.status === 'Terlambat').length;
      const clsMasuk = clsHadir + clsLate;
      const clsRate = clsTotal > 0 ? Math.round((clsMasuk / clsTotal) * 100) : 0;
      return {
        kelas: cls,
        total: clsTotal,
        hadir: clsHadir,
        terlambat: clsLate,
        masuk: clsMasuk,
        belumAbsen: Math.max(0, clsTotal - clsDailyRecords.length),
        rate: clsRate,
      };
    });
  }, [activeStudents, uniqueDailyRecords]);

  // Modal student list based on selected filter
  const modalStudentList = useMemo(() => {
    let list: Array<{ student: Student; record?: AttendanceRecord; statusLabel: string; time?: string }> = [];

    if (modalFilter === 'hadir') {
      list = hadirRecords.map((r) => {
        const s = activeStudents.find((st) => st.nisn === r.nisn) || {
          id: r.nisn,
          nisn: r.nisn,
          nama: r.nama,
          kelas: r.kelas,
          id_qr: r.id_qr,
          foto: '',
          status: 'aktif',
        };
        return { student: s, record: r, statusLabel: 'Hadir Tepat Waktu', time: r.timestamp };
      });
    } else if (modalFilter === 'terlambat') {
      list = terlambatRecords.map((r) => {
        const s = activeStudents.find((st) => st.nisn === r.nisn) || {
          id: r.nisn,
          nisn: r.nisn,
          nama: r.nama,
          kelas: r.kelas,
          id_qr: r.id_qr,
          foto: '',
          status: 'aktif',
        };
        return {
          student: s,
          record: r,
          statusLabel: `Terlambat (+${r.terlambatMenit || 0} mnt)`,
          time: r.timestamp,
        };
      });
    } else if (modalFilter === 'alpa') {
      list = alpaRecords.map((r) => {
        const s = activeStudents.find((st) => st.nisn === r.nisn) || {
          id: r.nisn,
          nisn: r.nisn,
          nama: r.nama,
          kelas: r.kelas,
          id_qr: r.id_qr,
          foto: '',
          status: 'aktif',
        };
        return { student: s, record: r, statusLabel: 'Alpa (Tanpa Keterangan)', time: r.timestamp };
      });
    } else if (modalFilter === 'izin_sakit') {
      const combined = [...izinRecords, ...sakitRecords];
      list = combined.map((r) => {
        const s = activeStudents.find((st) => st.nisn === r.nisn) || {
          id: r.nisn,
          nisn: r.nisn,
          nama: r.nama,
          kelas: r.kelas,
          id_qr: r.id_qr,
          foto: '',
          status: 'aktif',
        };
        return { student: s, record: r, statusLabel: r.status, time: r.timestamp };
      });
    } else if (modalFilter === 'belum_absen') {
      list = belumAbsenStudents.map((s) => ({
        student: s,
        statusLabel: 'Belum Scan Masuk',
      }));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.student.nama.toLowerCase().includes(q) ||
        item.student.nisn.includes(q) ||
        item.student.kelas.toLowerCase().includes(q)
    );
  }, [modalFilter, hadirRecords, terlambatRecords, alpaRecords, izinRecords, sakitRecords, belumAbsenStudents, activeStudents, searchQuery]);

  const openModalWithFilter = (filter: 'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit') => {
    setModalFilter(filter);
    setSearchQuery('');
    setShowStudentListModal(true);
  };

  const getHealthBadge = (rate: number) => {
    if (rate >= 90) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        text: 'Kehadiran Sangat Baik (Optimal)',
        dot: 'bg-emerald-500',
      };
    }
    if (rate >= 75) {
      return {
        bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
        text: 'Kehadiran Cukup Baik',
        dot: 'bg-blue-500',
      };
    }
    return {
      bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
      text: 'Perhatian Khusus / Rendah',
      dot: 'bg-rose-500',
    };
  };

  const health = getHealthBadge(attendanceRate);

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 rounded-2xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
      {/* Decorative subtle ambient backdrop glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Real-time Live Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Ringkasan Presensi Harian (Live Summary)
                </h3>
                {isToday && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                      isLivePulsing
                        ? 'bg-emerald-500 text-white border-emerald-400 scale-105 shadow-sm'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Realtime Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hitungan instan siswa hadir, terlambat, alpa & belum absen yang diperbarui secara otomatis tiap scan.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Buka Scanner QR</span>
            </button>
          )}

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${health.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${health.dot}`} />
            <span>{attendanceRate}% Kehadiran</span>
          </div>
        </div>
      </div>

      {/* Main 4 Primary Metric Cards: Present, Late, Absent, Unchecked */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10 mb-5">
        {/* 1. HADIR TEPAT WAKTU */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          onClick={() => openModalWithFilter('hadir')}
          className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-emerald-200/90 dark:border-emerald-800/60 shadow-xs cursor-pointer hover:border-emerald-400 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Hadir Tepat</span>
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
              {totalMasuk > 0 ? `${onTimeRate}%` : '0%'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-100">
              {hadirCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ {totalActive} Siswa</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-2 border-t border-emerald-100/60 dark:border-emerald-900/40">
            <span>&le; 07:15 WIT</span>
            <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 transition-colors flex items-center gap-0.5">
              Lihat nama <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </motion.div>

        {/* 2. TERLAMBAT */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          onClick={() => openModalWithFilter('terlambat')}
          className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-amber-200/90 dark:border-amber-800/60 shadow-xs cursor-pointer hover:border-amber-400 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Terlambat</span>
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
              {totalMasuk > 0 ? `${Math.round((terlambatCount / totalMasuk) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-100">
              {terlambatCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">Siswa Terlambat</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 font-medium pt-2 border-t border-amber-100/60 dark:border-amber-900/40">
            <span>&gt; 07:15 WIT</span>
            <span className="text-[10px] text-slate-400 group-hover:text-amber-600 transition-colors flex items-center gap-0.5">
              Lihat nama <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </motion.div>

        {/* 3. BELUM ABSEN / PENDING SCAN */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          onClick={() => openModalWithFilter('belum_absen')}
          className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-sky-200/90 dark:border-sky-800/60 shadow-xs cursor-pointer hover:border-sky-400 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Belum Scan</span>
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300">
              {totalActive > 0 ? `${Math.round((belumAbsenCount / totalActive) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-950 dark:text-sky-100">
              {belumAbsenCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">Belum Tercatat</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-sky-700 dark:text-sky-400 font-medium pt-2 border-t border-sky-100/60 dark:border-sky-900/40">
            <span>Perlu Diingatkan</span>
            <span className="text-[10px] text-slate-400 group-hover:text-sky-600 transition-colors flex items-center gap-0.5">
              Lihat nama <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </motion.div>

        {/* 4. ALPA & IZIN / SAKIT */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          onClick={() => openModalWithFilter('alpa')}
          className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-rose-200/90 dark:border-rose-800/60 shadow-xs cursor-pointer hover:border-rose-400 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>Alpa / Izin</span>
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300">
              Alpa: {alpaCount}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-100">
              {alpaCount + izinCount + sakitCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              (Izin: {izinCount}, Sakit: {sakitCount})
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-400 font-medium pt-2 border-t border-rose-100/60 dark:border-rose-900/40">
            <span>Tanpa Kehadiran</span>
            <span className="text-[10px] text-slate-400 group-hover:text-rose-600 transition-colors flex items-center gap-0.5">
              Lihat nama <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </motion.div>
      </div>

      {/* Progress Bar & Rate Overview */}
      <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 mb-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-slate-700 dark:text-slate-200">
              Tingkat Kehadiran Masuk: <strong className="text-blue-600 dark:text-blue-400">{attendanceRate}%</strong> ({totalMasuk}/{totalActive} Siswa)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Hadir ({hadirCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Terlambat ({terlambatCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Izin/Sakit ({izinCount + sakitCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              Belum Scan ({belumAbsenCount})
            </span>
          </div>
        </div>

        {/* Visual Stacked Progress Bar */}
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
          <div
            style={{ width: `${totalActive > 0 ? (hadirCount / totalActive) * 100 : 0}%` }}
            className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
            title={`Hadir Tepat: ${hadirCount} siswa`}
          />
          <div
            style={{ width: `${totalActive > 0 ? (terlambatCount / totalActive) * 100 : 0}%` }}
            className="h-full bg-amber-500 transition-all duration-500"
            title={`Terlambat: ${terlambatCount} siswa`}
          />
          <div
            style={{ width: `${totalActive > 0 ? ((izinCount + sakitCount) / totalActive) * 100 : 0}%` }}
            className="h-full bg-blue-500 transition-all duration-500"
            title={`Izin/Sakit: ${izinCount + sakitCount} siswa`}
          />
          <div
            style={{ width: `${totalActive > 0 ? (alpaCount / totalActive) * 100 : 0}%` }}
            className="h-full bg-rose-500 transition-all duration-500"
            title={`Alpa: ${alpaCount} siswa`}
          />
          <div
            style={{ width: `${totalActive > 0 ? (belumAbsenCount / totalActive) * 100 : 0}%` }}
            className="h-full bg-slate-200 dark:bg-slate-700 rounded-r-full transition-all duration-500"
            title={`Belum Absen: ${belumAbsenCount} siswa`}
          />
        </div>
      </div>

      {/* Live Recent Scans Stream & Class Breakdown pills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10">
        {/* Left: 5 Live Recent Scans */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/90 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Aktivitas Scan Realtime Terbaru</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              {recentScans.length} Scan Terakhir
            </span>
          </div>

          {recentScans.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-medium">
              Belum ada aktivitas scan pada tanggal ini.
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map((r, idx) => {
                const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
                const isLate = r.status === 'Terlambat';
                return (
                  <motion.div
                    key={`${r.id || r.nisn}-${r.timestamp}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isLate ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {r.nama}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {r.kelas} &bull; NISN: {r.nisn}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          isLate
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{timeStr}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick Class Breakdown Pills */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/90 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Status Kehadiran per Kelas</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              {classBreakdown.length} Rombel
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {classBreakdown.map((c) => (
              <div
                key={c.kelas}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100 mb-1">
                  <span className="truncate">{c.kelas}</span>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                      c.rate >= 90
                        ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                        : c.rate >= 70
                        ? 'text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-300'
                        : 'text-rose-700 bg-rose-100 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {c.rate}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Masuk: {c.masuk}/{c.total}</span>
                  {c.belumAbsen > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      -{c.belumAbsen}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Interactive Student Drill-Down for Specific Daily Status */}
      <AnimatePresence>
        {showStudentListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Daftar Siswa —</span>
                    <span className="capitalize text-blue-600 dark:text-blue-400">
                      {modalFilter === 'belum_absen'
                        ? 'Belum Scan Hari Ini'
                        : modalFilter === 'hadir'
                        ? 'Hadir Tepat Waktu'
                        : modalFilter === 'terlambat'
                        ? 'Siswa Terlambat'
                        : modalFilter === 'alpa'
                        ? 'Siswa Alpa'
                        : 'Siswa Izin / Sakit'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Total: {modalStudentList.length} siswa ditemukan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStudentListModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tabs in Modal */}
              <div className="px-4 pt-3 flex flex-wrap gap-1.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalFilter('belum_absen')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-all ${
                    modalFilter === 'belum_absen'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 border-t border-x border-slate-200 dark:border-slate-800'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  Belum Scan ({belumAbsenCount})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter('hadir')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-all ${
                    modalFilter === 'hadir'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-t border-x border-slate-200 dark:border-slate-800'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  Hadir ({hadirCount})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter('terlambat')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-all ${
                    modalFilter === 'terlambat'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-t border-x border-slate-200 dark:border-slate-800'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  Terlambat ({terlambatCount})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter('alpa')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-all ${
                    modalFilter === 'alpa'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border-t border-x border-slate-200 dark:border-slate-800'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  Alpa ({alpaCount})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter('izin_sakit')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-all ${
                    modalFilter === 'izin_sakit'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t border-x border-slate-200 dark:border-slate-800'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  Izin/Sakit ({izinCount + sakitCount})
                </button>
              </div>

              {/* Search Bar in Modal */}
              <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama siswa, NISN, atau kelas..."
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Student List */}
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {modalStudentList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    Tidak ada siswa pada kategori ini.
                  </div>
                ) : (
                  modalStudentList.map((item, idx) => (
                    <div
                      key={`${item.student.nisn}-${idx}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.student.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {item.student.nama}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Kelas: {item.student.kelas} &bull; NISN: {item.student.nisn}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full ${
                            modalFilter === 'hadir'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : modalFilter === 'terlambat'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : modalFilter === 'alpa'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : modalFilter === 'belum_absen'
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                        {item.time && (
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                            {new Date(item.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIT
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-right">
                <button
                  type="button"
                  onClick={() => setShowStudentListModal(false)}
                  className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
