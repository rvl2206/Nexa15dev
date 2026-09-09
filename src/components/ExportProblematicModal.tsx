import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  AlertTriangle,
  Users,
  Search,
  CheckCircle,
  Filter,
  ArrowRight,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';
import { store } from '../lib/store';
import { toast } from '../lib/toast';
import {
  exportProblematicStudentsToExcel,
  exportProblematicStudentsToPDF,
  formatIndoMonth,
} from '../lib/exportUtils';

interface ExportProblematicModalProps {
  isOpen: boolean;
  onClose: () => void;
  classList: string[];
  initialClass?: string;
  initialBulan?: string;
  onOpenWaliKelasDispatch?: () => void;
}

export const ExportProblematicModal: React.FC<ExportProblematicModalProps> = ({
  isOpen,
  onClose,
  classList,
  initialClass = 'Semua',
  initialBulan = 'Semua',
  onOpenWaliKelasDispatch,
}) => {
  const settings = store.getSettings();
  const schoolName = settings.schoolName || 'SMA NEGERI 15 AMBON';

  // Available months from attendance logs + current month
  const availableMonths = useMemo(() => {
    const allAttendance = store.getAttendance();
    const monthsSet = new Set<string>();
    allAttendance.forEach((a) => {
      if (a.tanggal && a.tanggal.length >= 7) {
        monthsSet.add(a.tanggal.slice(0, 7));
      }
    });
    const currentM = new Date().toISOString().slice(0, 7);
    monthsSet.add(currentM);
    return Array.from(monthsSet).sort().reverse();
  }, [isOpen]);

  // Filters State
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialBulan || 'Semua');
  const [selectedRisk, setSelectedRisk] = useState<string>('Semua');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'alpa' | 'terlambat' | 'rate'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // Thresholds
  const [thresholdAlpa, setThresholdAlpa] = useState<number>(settings.problemThresholdAlpa ?? 2);
  const [thresholdTerlambat, setThresholdTerlambat] = useState<number>(settings.problemThresholdTerlambat ?? 3);
  const [thresholdMinRate, setThresholdMinRate] = useState<number>(settings.problemThresholdMinRate ?? 75);

  // Sync initial class & bulan when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedClass(initialClass || 'Semua');
      setSelectedMonth(initialBulan || 'Semua');
    }
  }, [isOpen, initialClass, initialBulan]);

  // Compute problematic students analysis using store engine based on selected month & class
  const allProblematic = useMemo(() => {
    if (!isOpen) return [];
    return store.getProblematicStudentsAnalysis({
      kelas: selectedClass === 'Semua' ? undefined : selectedClass,
      bulan: selectedMonth === 'Semua' ? undefined : selectedMonth,
      riskLevel: selectedRisk === 'Semua' ? undefined : selectedRisk,
      searchQuery: searchQuery.trim(),
      minAlpa: thresholdAlpa,
      minTerlambat: thresholdTerlambat,
      maxAttendanceRate: thresholdMinRate,
    });
  }, [
    isOpen,
    selectedClass,
    selectedMonth,
    selectedRisk,
    searchQuery,
    thresholdAlpa,
    thresholdTerlambat,
    thresholdMinRate,
  ]);

  // Filter by category (all, alpa, terlambat, rate)
  const filteredStudents = useMemo(() => {
    if (selectedCategory === 'all') return allProblematic;
    if (selectedCategory === 'alpa') return allProblematic.filter((p) => p.alpaCount >= thresholdAlpa);
    if (selectedCategory === 'terlambat') return allProblematic.filter((p) => p.terlambatCount >= thresholdTerlambat);
    if (selectedCategory === 'rate') return allProblematic.filter((p) => p.attendanceRate < thresholdMinRate);
    return allProblematic;
  }, [allProblematic, selectedCategory, thresholdAlpa, thresholdTerlambat, thresholdMinRate]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const tinggi = filteredStudents.filter((p) => p.riskLevel === 'Tinggi').length;
    const sedang = filteredStudents.filter((p) => p.riskLevel === 'Sedang').length;
    const perhatian = filteredStudents.filter((p) => p.riskLevel === 'Perhatian').length;
    return { tinggi, sedang, perhatian, total: filteredStudents.length };
  }, [filteredStudents]);

  if (!isOpen) return null;

  // Handler: Export to Excel
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      toast.info('Data Kosong', 'Tidak ada data siswa bermasalah pada kriteria filter yang dipilih.');
      return;
    }
    exportProblematicStudentsToExcel(filteredStudents, schoolName, selectedClass, selectedMonth);
    const monthLabel = formatIndoMonth(selectedMonth);
    const classLabel = selectedClass === 'Semua' ? 'Semua Kelas' : `Kelas ${selectedClass}`;
    toast.success('File Excel Terunduh', `Rekap ${classLabel} (${monthLabel}) berisi ${filteredStudents.length} siswa berhasil diekspor.`);
  };

  // Handler: Export to PDF
  const handleExportPDF = () => {
    if (filteredStudents.length === 0) {
      toast.info('Data Kosong', 'Tidak ada data siswa bermasalah pada kriteria filter yang dipilih.');
      return;
    }
    exportProblematicStudentsToPDF(filteredStudents, schoolName, selectedClass, selectedMonth);
    const monthLabel = formatIndoMonth(selectedMonth);
    const classLabel = selectedClass === 'Semua' ? 'Semua Kelas' : `Kelas ${selectedClass}`;
    toast.success('Dokumen PDF Terunduh', `Dokumen PDF resmi ${classLabel} (${monthLabel}) berisi ${filteredStudents.length} siswa berhasil diterbitkan.`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      id="export-problematic-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        id="export-problematic-modal-container"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Tutup Modal"
            id="btn-close-problematic-modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3.5 pr-8">
            <div className="p-3 bg-rose-500/20 text-rose-300 rounded-2xl border border-rose-500/30 shrink-0">
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Layanan Bimbingan Konseling (BK) & Wali Kelas
                </span>
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">•</span>
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">{schoolName}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Ekspor Rekap Siswa Bermasalah Berdasarkan Filter
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Filter data siswa berdasarkan <strong>Kelas</strong> dan <strong>Bulan/Periode</strong> untuk mengunduh rekapitulasi pelanggaran kedisiplinan (sering alpa, akumulasi terlambat, atau kehadiran rendah) dalam format Excel atau PDF resmi berkop surat.
              </p>
            </div>
          </div>

          {/* Active Filter Chips & Quick Metrics Bar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-300 font-medium">Filter Terpasang:</span>
              <span className="px-2.5 py-1 bg-white/15 text-white font-bold rounded-lg border border-white/20 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>{selectedMonth === 'Semua' ? 'Semua Bulan (Akumulasi)' : formatIndoMonth(selectedMonth)}</span>
              </span>
              <span className="px-2.5 py-1 bg-white/15 text-white font-bold rounded-lg border border-white/20 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-300" />
                <span>{selectedClass === 'Semua' ? 'Semua Kelas' : `Kelas ${selectedClass}`}</span>
              </span>
              {selectedRisk !== 'Semua' && (
                <span className="px-2.5 py-1 bg-rose-500/30 text-rose-200 font-bold rounded-lg border border-rose-400/30">
                  Risiko {selectedRisk}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 bg-black/40 rounded-lg text-slate-200">
                Terjaring: <strong className="text-white">{metrics.total}</strong> Siswa
              </span>
              <span className="px-2.5 py-1 bg-rose-950/60 text-rose-200 rounded-lg border border-rose-500/40">
                Kritis: <strong>{metrics.tinggi}</strong>
              </span>
              <span className="px-2.5 py-1 bg-amber-950/60 text-amber-200 rounded-lg border border-amber-500/40">
                Perhatian: <strong>{metrics.sedang}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body: Filters & Settings */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Main Filter Strip */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Sesuaikan Filter Kelas & Bulan</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                id="btn-toggle-advanced-thresholds"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showAdvancedSettings ? 'Tutup Ambang Batas' : 'Atur Ambang Batas'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Filter Month / Periode */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-500" />
                  <span>Pilih Bulan:</span>
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  id="select-export-problematic-month"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                >
                  <option value="Semua">Semua Bulan (Akumulasi)</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatIndoMonth(m)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Class */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-blue-500" />
                  <span>Pilih Kelas:</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  id="select-export-problematic-class"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                >
                  <option value="Semua">Semua Kelas ({classList.length} Kelas)</option>
                  {classList.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Risk Level */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tingkat Risiko:
                </label>
                <select
                  value={selectedRisk}
                  onChange={(e) => setSelectedRisk(e.target.value)}
                  id="select-export-problematic-risk"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                >
                  <option value="Semua">Semua Tingkat Risiko</option>
                  <option value="Tinggi">🔴 Risiko Tinggi (Kritis)</option>
                  <option value="Sedang">🟠 Perlu Perhatian (Sedang)</option>
                  <option value="Perhatian">🟡 Pemantauan (Ringan)</option>
                </select>
              </div>

              {/* Filter Category */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kategori Masalah:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  id="select-export-problematic-category"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                >
                  <option value="all">Semua Jenis Pelanggaran</option>
                  <option value="alpa">❌ Sering Alpa (≥ {thresholdAlpa}x)</option>
                  <option value="terlambat">⏰ Sering Terlambat (≥ {thresholdTerlambat}x)</option>
                  <option value="rate">📉 Kehadiran Rendah (&lt; {thresholdMinRate}%)</option>
                </select>
              </div>

              {/* Search Bar */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Cari Siswa / NISN:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nama / NISN..."
                    id="input-export-problematic-search"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Threshold Adjustments */}
            {showAdvancedSettings && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Batas Alpa (Hari):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={thresholdAlpa}
                    onChange={(e) => setThresholdAlpa(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Batas Terlambat (Kali):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={thresholdTerlambat}
                    onChange={(e) => setThresholdTerlambat(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Persentase Minimal Hadir (%):
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="95"
                    value={thresholdMinRate}
                    onChange={(e) => setThresholdMinRate(Math.max(10, Math.min(95, Number(e.target.value) || 75)))}
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Student List Preview */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800/90 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Pratinjau Hasil Rekap ({filteredStudents.length} Siswa)</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                  {selectedClass !== 'Semua' ? `Kelas ${selectedClass}` : 'Semua Kelas'}
                </span>
                <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                  {selectedMonth !== 'Semua' ? formatIndoMonth(selectedMonth) : 'Semua Periode'}
                </span>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Tidak Ada Siswa yang Memenuhi Kriteria Masalah
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Pada filter <strong>{selectedClass !== 'Semua' ? `Kelas ${selectedClass}` : 'Semua Kelas'}</strong> dan <strong>{formatIndoMonth(selectedMonth)}</strong>, seluruh siswa memiliki catatan kehadiran yang tertib.
                </div>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredStudents.slice(0, 50).map((item, idx) => {
                  const isHighRisk = item.riskLevel === 'Tinggi';
                  const isMediumRisk = item.riskLevel === 'Sedang';

                  return (
                    <div
                      key={item.student.id || item.student.nisn}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold text-slate-400">{idx + 1}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.student.nama}
                            </span>
                            <span className="px-2 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded text-[10px]">
                              {item.student.kelas}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                isHighRisk
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                  : isMediumRisk
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {item.riskLevel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            NISN: {item.student.nisn} • Wali: {item.waliKelas.name || '-'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        {item.alpaCount > 0 && (
                          <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded font-bold text-[10px]">
                            {item.alpaCount}x Alpa
                          </span>
                        )}
                        {item.terlambatCount > 0 && (
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded font-bold text-[10px]">
                            {item.terlambatCount}x Telat
                          </span>
                        )}
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          {item.attendanceRate}% Hadir
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filteredStudents.length > 50 && (
                  <div className="p-2.5 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800">
                    Dan {filteredStudents.length - 50} siswa lainnya... (Semua akan dimasukkan ke dalam file ekspor)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="bg-slate-50 dark:bg-slate-800/90 p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {onOpenWaliKelasDispatch ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWaliKelasDispatch();
                }}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                id="btn-link-wali-kelas-dispatch"
              >
                <span>Buka Menu Disposisi WhatsApp Wali Kelas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span>Hasil ekspor otomatis memuat kelas dan bulan sesuai filter yang dipilih.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              Tutup
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              id="btn-do-export-problematic-excel"
              disabled={filteredStudents.length === 0}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                filteredStudents.length === 0
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.98]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Rekap Excel (.xlsx)</span>
            </button>

            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              id="btn-do-export-problematic-pdf"
              disabled={filteredStudents.length === 0}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                filteredStudents.length === 0
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 active:scale-[0.98]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Cetak / Unduh PDF Resmi (.pdf)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
