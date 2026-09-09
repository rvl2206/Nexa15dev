import React, { useState, useEffect, useMemo } from 'react';
import { store } from '../lib/store';
import { Teacher, TeacherAttendanceRecord, TeacherAttendanceStatus, AttendanceType, UserRole } from '../types';
import { toast } from '../lib/toast';
import {
  exportTeacherAttendanceToExcel,
  exportTeacherAttendanceToPDF,
  formatPetugasRole,
} from '../lib/exportUtils';
import {
  FileText,
  Calendar,
  Filter,
  Download,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  X,
  Printer,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  UserCheck,
  Building,
  CreditCard,
  Cloud,
} from 'lucide-react';

interface TeacherAttendanceRecapProps {
  userRole?: UserRole;
  currentOfficer?: string;
}

export const TeacherAttendanceRecap: React.FC<TeacherAttendanceRecapProps> = ({
  userRole = 'admin',
  currentOfficer = 'Petugas Piket',
}) => {
  const [attendance, setAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string>(store.getTodayYyyyMmDd());
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterJenis, setFilterJenis] = useState<string>('Semua');
  const [filterJabatan, setFilterJabatan] = useState<string>('Semua');

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<TeacherAttendanceRecord | null>(null);
  const [editTanggal, setEditTanggal] = useState<string>('');
  const [editJamScan, setEditJamScan] = useState<string>('07:00');
  const [deletingRecord, setDeletingRecord] = useState<TeacherAttendanceRecord | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    nip: '',
    nama: '',
    jabatan: '',
    tanggal: store.getTodayFormatted(),
    jamScan: '07:00',
    jenis: 'Masuk' as AttendanceType,
    status: 'Hadir' as TeacherAttendanceStatus,
    catatan: '',
    terlambatMenit: 0,
  });
  const [formError, setFormError] = useState('');

  // Selected for batch delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);

  const handleFetchCloud = async () => {
    setIsFetchingCloud(true);
    try {
      let startDateStr = '';
      let endDateStr = '';

      if (filterDate) {
        startDateStr = filterDate;
        endDateStr = filterDate;
      } else if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        startDateStr = `${filterMonth}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        endDateStr = `${filterMonth}-${lastDay.toString().padStart(2, '0')}`;
      } else {
        toast.info('Pilih Tanggal atau Bulan terlebih dahulu untuk menarik data cloud.');
        setIsFetchingCloud(false);
        return;
      }

      const totalLoaded = await store.fetchHistoricalAttendance(startDateStr, endDateStr);
      if (totalLoaded > 0) {
        toast.success('Berhasil', `Berhasil memuat ${totalLoaded} data (Siswa & Guru) dari Cloud.`);
      } else {
        toast.info('Info', 'Tidak ada data presensi tambahan dari Cloud untuk periode ini.');
      }
    } catch (err: any) {
      toast.error('Gagal', err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsFetchingCloud(false);
    }
  };

  useEffect(() => {
    setAttendance(store.getTeacherAttendance());
    setTeachers(store.getTeachers());

    const unsubscribe = store.subscribe(() => {
      setAttendance(store.getTeacherAttendance());
      setTeachers(store.getTeachers());
    });

    return () => unsubscribe();
  }, []);

  const uniqueJabatanList = useMemo(() => {
    const list = Array.from(new Set(teachers.map((t) => t.jabatan).filter(Boolean)));
    return list.sort();
  }, [teachers]);

  // Filter attendance records
  const filteredRecords = useMemo(() => {
    return attendance.filter((r) => {
      // Date filter
      if (filterDate) {
        const isMatchDate = store.isTeacherRecordForDate(r, filterDate);
        if (!isMatchDate) return false;
      } else if (filterMonth) {
        // filterMonth: YYYY-MM
        const normalized = store.normalizeToYyyyMmDd(r.tanggal || r.timestamp || '');
        if (!normalized.startsWith(filterMonth)) return false;
      }

      // Status filter
      if (filterStatus !== 'Semua' && r.status !== filterStatus) {
        return false;
      }

      // Jenis filter
      if (filterJenis !== 'Semua' && r.jenis !== filterJenis) {
        return false;
      }

      // Jabatan filter
      if (filterJabatan !== 'Semua' && r.jabatan !== filterJabatan) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = r.nama?.toLowerCase().includes(q);
        const matchNip = r.nip?.toLowerCase().includes(q);
        const matchJabatan = r.jabatan?.toLowerCase().includes(q);
        const matchCatatan = r.catatan?.toLowerCase().includes(q);
        if (!matchNama && !matchNip && !matchJabatan && !matchCatatan) return false;
      }

      return true;
    });
  }, [attendance, filterDate, filterMonth, filterStatus, filterJenis, filterJabatan, searchQuery]);

  // Summary statistics
  const stats = useMemo(() => {
    let hadirCount = 0;
    let terlambatCount = 0;
    let izinSakitCount = 0;
    let alpaDinasCount = 0;

    filteredRecords.forEach((r) => {
      if (r.status === 'Hadir') hadirCount++;
      else if (r.status === 'Terlambat') terlambatCount++;
      else if (r.status === 'Izin' || r.status === 'Sakit') izinSakitCount++;
      else if (r.status === 'Alpa' || r.status === 'Dinas Luar') alpaDinasCount++;
    });

    return {
      total: filteredRecords.length,
      hadir: hadirCount,
      terlambat: terlambatCount,
      izinSakit: izinSakitCount,
      alpaDinas: alpaDinasCount,
    };
  }, [filteredRecords]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleTeacherSelectForManual = (nip: string) => {
    const found = teachers.find((t) => t.nip === nip);
    if (found) {
      setManualForm((prev) => ({
        ...prev,
        nip: found.nip,
        nama: found.nama,
        jabatan: found.jabatan,
      }));
    } else {
      setManualForm((prev) => ({
        ...prev,
        nip,
      }));
    }
  };

  const extractJamFromTeacherRecord = (rec?: TeacherAttendanceRecord | null): string => {
    if (!rec || !rec.timestamp) return '07:00';
    try {
      const d = new Date(rec.timestamp);
      if (isNaN(d.getTime())) return '07:00';
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return formatter.format(d);
    } catch {
      return '07:00';
    }
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.nip || !manualForm.nama) {
      setFormError('Silakan pilih guru terlebih dahulu.');
      return;
    }

    const normTanggal = store.normalizeToYyyyMmDd(manualForm.tanggal) || manualForm.tanggal;
    const finalTimestamp = store.buildIsoTimestamp(normTanggal, manualForm.jamScan || '07:00');

    await store.addManualTeacherAttendance({
      nip: manualForm.nip,
      nama: manualForm.nama,
      jabatan: manualForm.jabatan || 'Guru',
      tanggal: normTanggal,
      timestamp: finalTimestamp,
      jenis: manualForm.jenis,
      status: manualForm.status,
      catatan: manualForm.catatan,
      terlambatMenit: Number(manualForm.terlambatMenit) || 0,
      petugas: formatPetugasRole(currentOfficer),
    });

    setShowManualModal(false);
    setManualForm({
      nip: '',
      nama: '',
      jabatan: '',
      tanggal: store.getTodayFormatted(),
      jamScan: '07:00',
      jenis: 'Masuk',
      status: 'Hadir',
      catatan: '',
      terlambatMenit: 0,
    });
    toast.success('Presensi Guru Dicatat', `Presensi ${manualForm.nama} berhasil dicatat (${manualForm.jamScan || '07:00'} WIT).`);
  };

  const openEditModal = (rec: TeacherAttendanceRecord) => {
    setCurrentRecord(rec);
    setEditTanggal(store.normalizeToYyyyMmDd(rec.tanggal || rec.timestamp) || rec.tanggal);
    setEditJamScan(extractJamFromTeacherRecord(rec));
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

    const normTanggal = store.normalizeToYyyyMmDd(editTanggal) || currentRecord.tanggal;
    const finalTimestamp = store.buildIsoTimestamp(normTanggal, editJamScan || '07:00');

    await store.updateTeacherAttendanceRecord(currentRecord.id, {
      tanggal: normTanggal,
      timestamp: finalTimestamp,
      status: currentRecord.status,
      jenis: currentRecord.jenis,
      catatan: currentRecord.catatan,
      terlambatMenit: Number(currentRecord.terlambatMenit) || 0,
    });

    setShowEditModal(false);
    toast.success('Presensi Diperbarui', `Rekaman presensi ${currentRecord.nama} berhasil diperbarui (${editJamScan} WIT).`);
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deletingRecord) return;
    const name = deletingRecord.nama;
    await store.deleteTeacherAttendanceRecord(deletingRecord.id);
    setSelectedIds((prev) => prev.filter((i) => i !== deletingRecord.id));
    setDeletingRecord(null);
    toast.success('Rekaman Dihapus', `Data presensi ${name} berhasil dihapus.`);
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    await store.deleteMultipleTeacherAttendance(selectedIds);
    setSelectedIds([]);
    setIsBatchDeleteModalOpen(false);
    toast.success('Hapus Massal Selesai', `${count} rekaman presensi guru berhasil dihapus.`);
  };

  const handleExportExcel = () => {
    exportTeacherAttendanceToExcel(filteredRecords, {
      schoolName: store.getSettings().schoolName,
      filterDate,
      filterMonth,
      filterStatus,
      filterJabatan,
    });
    toast.success('Export Excel Berhasil', `${filteredRecords.length} rekaman presensi guru diekspor ke Excel.`);
  };

  const handleExportPDF = () => {
    exportTeacherAttendanceToPDF(filteredRecords, {
      schoolName: store.getSettings().schoolName,
      schoolNPSN: store.getSettings().schoolNPSN,
      filterDate,
      filterMonth,
      filterStatus,
      filterJabatan,
    });
    toast.success('Laporan PDF Siap', `Laporan rekap presensi guru telah diunduh.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Strip */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-sky-100 text-sky-800 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Rekap Presensi Guru & Tendik</h1>
              <p className="text-xs text-slate-500">
                Laporan presensi harian, bulanan, dan histori scan guru berbasis NIP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-rose-600" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={() => {
                setFormError('');
                setShowManualModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-700 hover:bg-sky-800 text-white transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Presensi Manual Guru</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Total Rekaman</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
            <span className="text-[11px] text-emerald-700 font-medium">Hadir Tepat Waktu</span>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">{stats.hadir}</p>
          </div>
          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-100">
            <span className="text-[11px] text-amber-700 font-medium">Terlambat</span>
            <p className="text-xl font-bold text-amber-900 mt-0.5">{stats.terlambat}</p>
          </div>
          <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100">
            <span className="text-[11px] text-blue-700 font-medium">Izin / Sakit</span>
            <p className="text-xl font-bold text-blue-900 mt-0.5">{stats.izinSakit}</p>
          </div>
          <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-100">
            <span className="text-[11px] text-purple-700 font-medium">Dinas Luar / Alpa</span>
            <p className="text-xl font-bold text-purple-900 mt-0.5">{stats.alpaDinas}</p>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama Guru, NIP, atau Jabatan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Picker */}
          <div className="flex gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                if (e.target.value) setFilterMonth('');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              type="button"
              onClick={handleFetchCloud}
              disabled={isFetchingCloud}
              title="Tarik Data dari Cloud Database"
              className="px-3 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-xl transition-colors shrink-0 flex items-center justify-center disabled:opacity-50"
            >
              <Cloud className={`w-4 h-4 ${isFetchingCloud ? 'animate-bounce text-sky-500' : ''}`} />
            </button>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="Semua">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Dinas Luar">Dinas Luar</option>
              <option value="Alpa">Alpa</option>
            </select>
          </div>

          {/* Jenis Presensi Filter */}
          <div>
            <select
              value={filterJenis}
              onChange={(e) => {
                setFilterJenis(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="Semua">Semua Jenis (Masuk/Pulang)</option>
              <option value="Masuk">Masuk Saja</option>
              <option value="Pulang">Pulang Saja</option>
            </select>
          </div>
        </div>

        {/* Second Filter Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium">Jabatan:</span>
            <select
              value={filterJabatan}
              onChange={(e) => {
                setFilterJabatan(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="Semua">Semua Jabatan</option>
              {uniqueJabatanList.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setFilterDate(store.getTodayYyyyMmDd());
                setFilterMonth('');
                setFilterStatus('Semua');
                setFilterJenis('Semua');
                setFilterJabatan('Semua');
                setSearchQuery('');
              }}
              className="text-xs text-sky-700 hover:underline font-medium"
            >
              Hari Ini ({store.getTodayFormatted()})
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                setFilterDate('');
                setFilterMonth(new Date().toISOString().slice(0, 7));
                setFilterStatus('Semua');
                setFilterJenis('Semua');
                setFilterJabatan('Semua');
                setSearchQuery('');
              }}
              className="text-xs text-slate-600 hover:underline font-medium"
            >
              Bulan Ini
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                setFilterDate('');
                setFilterMonth('');
                setFilterStatus('Semua');
                setFilterJenis('Semua');
                setFilterJabatan('Semua');
                setSearchQuery('');
              }}
              className="text-xs text-slate-600 hover:underline font-medium"
            >
              Semua Data
            </button>
          </div>
        </div>

        {/* Selected Batch Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-sky-50 px-3 py-2 rounded-xl border border-sky-200">
            <span className="text-xs font-semibold text-sky-900">
              {selectedIds.length} rekaman presensi guru terpilih
            </span>
            <button
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </button>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredRecords.length > 0 && selectedIds.length === filteredRecords.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </th>
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Waktu Scan</th>
                <th className="p-3.5">NIP Guru</th>
                <th className="p-3.5">Nama Lengkap Guru</th>
                <th className="p-3.5">Jabatan</th>
                <th className="p-3.5 text-center">Jenis</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Keterangan</th>
                <th className="p-3.5">Petugas</th>
                <th className="p-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Tidak ada rekaman presensi guru yang sesuai dengan filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => {
                  const isSelected = selectedIds.includes(record.id);

                  let timeStr = '-';
                  if (record.timestamp) {
                    const d = new Date(record.timestamp);
                    timeStr = !isNaN(d.getTime())
                      ? d.toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: 'Asia/Jayapura',
                        }) + ' WIT'
                      : record.timestamp;
                  }

                  let statusBadgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
                  if (record.status === 'Hadir') {
                    statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  } else if (record.status === 'Terlambat') {
                    statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                  } else if (record.status === 'Izin' || record.status === 'Sakit') {
                    statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
                  } else if (record.status === 'Dinas Luar') {
                    statusBadgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
                  } else if (record.status === 'Alpa') {
                    statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
                  }

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(record.id, e.target.checked)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </td>
                      <td className="p-3.5 text-center text-slate-500 font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="p-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {record.tanggal}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {timeStr}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {record.nip}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900">
                        {record.nama}
                      </td>
                      <td className="p-3.5 text-slate-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium">
                          {record.jabatan}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center justify-center gap-1 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              record.jenis === 'Pulang'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}
                          >
                            {record.jenis}
                          </span>
                          {record.scan_method === 'RFID' && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[9px] font-extrabold"
                              title="Discan menggunakan Kartu RFID"
                            >
                              <CreditCard className="w-2.5 h-2.5" />
                              <span>RFID</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-[180px] truncate">
                        {record.terlambatMenit && record.terlambatMenit > 0 ? (
                          <span className="text-amber-700 font-semibold">
                            Terlambat +{record.terlambatMenit} mnt
                          </span>
                        ) : (
                          record.catatan || '-'
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {record.petugas || '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(record)}
                            title="Edit Presensi"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingRecord(record)}
                            title="Hapus Presensi"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-slate-500">
            Menampilkan <span className="font-semibold text-slate-700">{paginatedRecords.length}</span> dari{' '}
            <span className="font-semibold text-slate-700">{filteredRecords.length}</span> data presensi
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: MANUAL ATTENDANCE FOR TEACHER */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 text-sky-800 rounded-xl">
                  <Plus className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900">Presensi Manual Guru</h2>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Guru / NIP <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={manualForm.nip}
                  onChange={(e) => handleTeacherSelectForManual(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                >
                  <option value="">-- Pilih Guru Berdasarkan NIP & Nama --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.nip}>
                      {t.nama} (NIP: {t.nip}) - {t.jabatan}
                    </option>
                  ))}
                </select>
              </div>

              {manualForm.nama && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <p>
                    <strong>Nama:</strong> {manualForm.nama}
                  </p>
                  <p>
                    <strong>NIP:</strong> {manualForm.nip}
                  </p>
                  <p>
                    <strong>Jabatan:</strong> {manualForm.jabatan}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Presensi
                  </label>
                  <input
                    type="date"
                    value={manualForm.tanggal}
                    onChange={(e) => setManualForm({ ...manualForm, tanggal: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Scan (WIT)
                  </label>
                  <input
                    type="time"
                    value={manualForm.jamScan}
                    onChange={(e) => setManualForm({ ...manualForm, jamScan: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-medium">Pilihan Jam:</span>
                {['06:45', '07:00', '07:15', '07:30', '13:00', '14:00', '15:00'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setManualForm({ ...manualForm, jamScan: t })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      manualForm.jamScan === t
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Presensi
                  </label>
                  <select
                    value={manualForm.jenis}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, jenis: e.target.value as AttendanceType })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white"
                  >
                    <option value="Masuk">Masuk</option>
                    <option value="Pulang">Pulang</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Kehadiran
                  </label>
                  <select
                    value={manualForm.status}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        status: e.target.value as TeacherAttendanceStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Dinas Luar">Dinas Luar</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>

                {manualForm.status === 'Terlambat' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Terlambat (Menit)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={manualForm.terlambatMenit}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, terlambatMenit: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Mengikuti MGMP / Pelatihan Dinas"
                  value={manualForm.catatan}
                  onChange={(e) => setManualForm({ ...manualForm, catatan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-xl transition shadow-sm"
                >
                  Simpan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ATTENDANCE RECORD */}
      {showEditModal && currentRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 text-sky-800 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Edit Rekaman Presensi Guru</h2>
                  <p className="text-xs text-slate-500">{currentRecord.nama}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p>
                  <strong>NIP:</strong> {currentRecord.nip}
                </p>
                <p>
                  <strong>Nama:</strong> {currentRecord.nama}
                </p>
                <p>
                  <strong>Tanggal:</strong> {currentRecord.tanggal}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Presensi
                  </label>
                  <input
                    type="date"
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Scan (WIT)
                  </label>
                  <input
                    type="time"
                    value={editJamScan}
                    onChange={(e) => setEditJamScan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-medium">Pilihan Jam:</span>
                {['06:45', '07:00', '07:15', '07:30', '13:00', '14:00', '15:00'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditJamScan(t)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      editJamScan === t
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Presensi
                  </label>
                  <select
                    value={currentRecord.jenis}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, jenis: e.target.value as AttendanceType })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white"
                  >
                    <option value="Masuk">Masuk</option>
                    <option value="Pulang">Pulang</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Kehadiran
                  </label>
                  <select
                    value={currentRecord.status}
                    onChange={(e) =>
                      setCurrentRecord({
                        ...currentRecord,
                        status: e.target.value as TeacherAttendanceStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Dinas Luar">Dinas Luar</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Terlambat (Menit)
                </label>
                <input
                  type="number"
                  min={0}
                  value={currentRecord.terlambatMenit || 0}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, terlambatMenit: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={currentRecord.catatan || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, catatan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-xl transition shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SINGLE RECORD CONFIRMATION */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <span className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Rekaman Presensi?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data presensi guru berikut?
              </p>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs">
                <p className="font-bold text-slate-900">{deletingRecord.nama}</p>
                <p className="font-mono text-slate-600 mt-0.5">NIP: {deletingRecord.nip}</p>
                <p className="text-slate-500 mt-0.5">
                  Tanggal: {deletingRecord.tanggal} | Jenis: {deletingRecord.jenis} ({deletingRecord.status})
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm cursor-pointer"
              >
                Ya, Hapus Rekaman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BATCH DELETE ATTENDANCE CONFIRMATION */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <span className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hapus {selectedIds.length} Rekaman Terpilih?
                </h3>
                <p className="text-xs text-slate-500">
                  Tindakan penghapusan massal tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda akan menghapus <strong>{selectedIds.length}</strong> baris presensi guru yang dipilih secara permanen dari sistem.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm cursor-pointer"
              >
                Ya, Hapus {selectedIds.length} Rekaman
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
