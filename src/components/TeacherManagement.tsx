import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { store } from '../lib/store';
import { Teacher, UserRole } from '../types';
import { toast } from '../lib/toast';
import {
  exportTeacherListToExcel,
  exportTeacherListToCSV,
  downloadTeacherImportTemplate,
  parseTeacherImportFile,
  printElement,
} from '../lib/exportUtils';
import {
  OfficialTeacherIDCardFront,
  OfficialTeacherIDCardBack,
  CardSizeOption,
  TEACHER_CARD_SIZES,
} from './OfficialTeacherIDCard';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  QrCode,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  X,
  Printer,
  Sparkles,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  RotateCcw,
  FileText,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  UserCheck,
  RefreshCw,
  Copy,
  ChevronDown,
  Cloud,
  Eye,
  Radio,
  Archive,
} from 'lucide-react';

interface TeacherManagementProps {
  userRole?: UserRole;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({ userRole = 'Admin' }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showMassCardModal, setShowMassCardModal] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // In-app Delete Modals (replaces window.confirm for iframe reliability)
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Selected records
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cardSide, setCardSide] = useState<'front' | 'back' | 'both'>('front');
  const [selectedCardSize, setSelectedCardSize] = useState<CardSizeOption>('CR80');

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    jabatan: '',
    wali_kelas: '',
    no_hp: '',
    rfid_uid: '',
    status: 'aktif' as 'aktif' | 'nonaktif',
  });
  const [formError, setFormError] = useState('');

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<Teacher, 'id' | 'createdAt'>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setTeachers(store.getTeachers());
    const unsubscribe = store.subscribe(() => {
      setTeachers(store.getTeachers());
    });
    return () => unsubscribe();
  }, []);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Distinct list of Jabatan for filter dropdown
  const uniqueJabatanList = useMemo(() => {
    const list = Array.from(new Set(teachers.map((t) => t.jabatan).filter(Boolean)));
    return list.sort();
  }, [teachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.nama.toLowerCase().includes(q) ||
        t.nip.toLowerCase().includes(q) ||
        t.jabatan.toLowerCase().includes(q);

      const matchJabatan = filterJabatan === 'Semua' || t.jabatan === filterJabatan;
      const matchStatus =
        filterStatus === 'Semua' ||
        (filterStatus === 'aktif' && t.status !== 'nonaktif') ||
        (filterStatus === 'nonaktif' && t.status === 'nonaktif');

      return matchSearch && matchJabatan && matchStatus;
    });
  }, [teachers, searchQuery, filterJabatan, filterStatus]);

  // Pagination slice
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage) || 1;
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTeachers.slice(start, start + itemsPerPage);
  }, [filteredTeachers, currentPage, itemsPerPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTeachers.map((t) => t.id));
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

  const openAddModal = () => {
    setFormData({
      nama: '',
      nip: '',
      jabatan: '',
      wali_kelas: '',
      no_hp: '',
      rfid_uid: '',
      status: 'aktif',
    });
    setFormError('');
    setShowAddModal(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    setFormData({
      nama: teacher.nama,
      nip: teacher.nip,
      jabatan: teacher.jabatan,
      wali_kelas: teacher.wali_kelas || '',
      no_hp: teacher.no_hp || '',
      rfid_uid: teacher.rfid_uid || '',
      status: teacher.status || 'aktif',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nip.trim()) {
      setFormError('Nama lengkap guru dan NIP wajib diisi.');
      return;
    }

    const cleanNip = formData.nip.trim();
    const cleanRfid = formData.rfid_uid.trim().toUpperCase();

    // Check if NIP already exists
    const duplicate = teachers.find((t) => t.nip === cleanNip);
    if (duplicate) {
      setFormError(`NIP ${cleanNip} sudah digunakan oleh ${duplicate.nama}.`);
      return;
    }

    if (cleanRfid) {
      const duplicateRfid = teachers.find(
        (t) => t.rfid_uid && t.rfid_uid.trim().toUpperCase() === cleanRfid
      );
      if (duplicateRfid) {
        setFormError(`Kartu RFID [${cleanRfid}] sudah digunakan oleh guru ${duplicateRfid.nama}.`);
        return;
      }
    }

    const added = await store.addTeacher({
      nama: formData.nama.trim(),
      nip: cleanNip,
      jabatan: formData.jabatan.trim() || 'Guru Mata Pelajaran',
      wali_kelas: formData.wali_kelas.trim() || undefined,
      no_hp: formData.no_hp.trim() || undefined,
      rfid_uid: cleanRfid || undefined,
      status: formData.status,
      id_qr: `69933068.${cleanNip}`,
    });

    setShowAddModal(false);
    toast.success(
      'Guru Berhasil Ditambahkan',
      `Data guru ${added.nama} (NIP: ${added.nip}) berhasil disimpan.`
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeacher) return;
    if (!formData.nama.trim() || !formData.nip.trim()) {
      setFormError('Nama lengkap guru dan NIP wajib diisi.');
      return;
    }

    const cleanNip = formData.nip.trim();
    const cleanRfid = formData.rfid_uid.trim().toUpperCase();

    const duplicate = teachers.find((t) => t.id !== currentTeacher.id && t.nip === cleanNip);
    if (duplicate) {
      setFormError(`NIP ${cleanNip} sudah digunakan oleh ${duplicate.nama}.`);
      return;
    }

    if (cleanRfid) {
      const duplicateRfid = teachers.find(
        (t) => t.id !== currentTeacher.id && t.rfid_uid && t.rfid_uid.trim().toUpperCase() === cleanRfid
      );
      if (duplicateRfid) {
        setFormError(`Kartu RFID [${cleanRfid}] sudah digunakan oleh guru ${duplicateRfid.nama}.`);
        return;
      }
    }

    await store.updateTeacher(currentTeacher.id, {
      nama: formData.nama.trim(),
      nip: cleanNip,
      jabatan: formData.jabatan.trim() || 'Guru Mata Pelajaran',
      wali_kelas: formData.wali_kelas.trim() || undefined,
      no_hp: formData.no_hp.trim() || undefined,
      rfid_uid: cleanRfid || undefined,
      status: formData.status,
      id_qr: `69933068.${cleanNip}`,
    });

    setShowEditModal(false);
    toast.success(
      'Perubahan Disimpan',
      `Data guru ${formData.nama.trim()} berhasil diperbarui.`
    );
  };

  const handleToggleStatus = async (teacher: Teacher) => {
    const newStatus: 'aktif' | 'nonaktif' = teacher.status === 'nonaktif' ? 'aktif' : 'nonaktif';
    await store.updateTeacher(teacher.id, { status: newStatus });
    toast.info(
      'Status Guru Diperbarui',
      `${teacher.nama} sekarang berstatus ${newStatus === 'aktif' ? 'Aktif' : 'Nonaktif'}.`
    );
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deletingTeacher) return;
    const name = deletingTeacher.nama;
    const nip = deletingTeacher.nip;
    await store.deleteTeacher(deletingTeacher.id);
    setSelectedIds((prev) => prev.filter((i) => i !== deletingTeacher.id));
    setDeletingTeacher(null);
    toast.success('Data Guru Dihapus', `Data guru ${name} (NIP: ${nip}) berhasil dihapus.`);
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    await store.deleteMultipleTeachers(selectedIds);
    setSelectedIds([]);
    setIsBatchDeleteModalOpen(false);
    toast.success('Hapus Massal Selesai', `${count} data guru berhasil dihapus.`);
  };

  const handleConfirmClearAll = async () => {
    const count = teachers.length;
    await store.deleteAllTeachers();
    setSelectedIds([]);
    setIsClearAllModalOpen(false);
    toast.warning('Database Guru Dikosongkan', `Seluruh ${count} data guru telah dihapus.`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    try {
      const parsed = await parseTeacherImportFile(file);
      setImportPreview(parsed);
      toast.info('File Terbaca', `${parsed.length} baris guru siap diimpor.`);
    } catch (err: any) {
      toast.error('Gagal Membaca File', err?.message || 'Format file Excel tidak sesuai.');
      setImportPreview([]);
    }
  };

  const handleExecuteImport = async () => {
    if (importPreview.length === 0) return;
    setImportLoading(true);
    try {
      await store.importTeachers(importPreview, importMode);
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      toast.success('Import Guru Berhasil', `${importPreview.length} data guru berhasil diimpor ke sistem.`);
    } catch (e: any) {
      toast.error('Gagal Mengimpor', e?.message || 'Terjadi kesalahan saat memproses data.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTeacherImportTemplate();
    toast.success('Template Diunduh', 'Template Excel untuk data Guru telah diunduh.');
  };

  const handleExportExcelAction = () => {
    setIsExportDropdownOpen(false);
    const target = selectedIds.length > 0
      ? teachers.filter((t) => selectedIds.includes(t.id))
      : filteredTeachers;
    exportTeacherListToExcel(target);
    toast.success('Export Excel Berhasil', `${target.length} data guru diekspor ke format Excel.`);
  };

  const handleExportCSVAction = () => {
    setIsExportDropdownOpen(false);
    const target = selectedIds.length > 0
      ? teachers.filter((t) => selectedIds.includes(t.id))
      : filteredTeachers;
    exportTeacherListToCSV(target);
    toast.success('Export CSV Berhasil', `${target.length} data guru diekspor ke format CSV.`);
  };

  const handlePrintCards = (elementId: string) => {
    const sizeConfig = TEACHER_CARD_SIZES[selectedCardSize] || TEACHER_CARD_SIZES.CR80;
    printElement(elementId, 'Cetak_Kartu_Guru_NEXA15', sizeConfig.widthMM, sizeConfig.heightMM);
    toast.info('Dialog Cetak Dibuka', 'Pastikan orientasi dan ukuran kertas sesuai pada opsi print.');
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    try {
      const res = await store.syncAllToSupabase();
      if (res.success) {
        toast.success('Sinkronisasi Berhasil', res.message);
      } else {
        toast.error('Sinkronisasi Supabase', res.message);
      }
    } catch (err: any) {
      toast.error('Gagal Sinkronisasi', err?.message || 'Terjadi gangguan jaringan.');
    } finally {
      setIsSyncing(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterJabatan('Semua');
    setFilterStatus('Semua');
    setCurrentPage(1);
    toast.info('Filter Direset', 'Semua filter pencarian telah dikembalikan.');
  };

  const isFilterActive = searchQuery !== '' || filterJabatan !== 'Semua' || filterStatus !== 'Semua';

  return (
    <div className="space-y-6">
      {/* Header & Stats Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-400 rounded-2xl border border-sky-200 dark:border-sky-800/60 shadow-xs">
                <Briefcase className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Data Guru & Tenaga Kependidikan (GTK)
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/80">
                    <Cloud className="w-3 h-3" />
                    <span>NIP Base</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manajemen data identitas guru & staf berbasis NIP untuk presensi digital dan cetak ID Card
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sync to Supabase */}
            <button
              onClick={handleSyncToSupabase}
              disabled={isSyncing}
              title="Sinkronkan data guru ke Supabase Cloud PostgreSQL"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-600 dark:text-sky-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sinkron...' : 'Sinkron Supabase'}</span>
            </button>

            {/* Import Excel */}
            <button
              onClick={() => {
                setImportPreview([]);
                setImportFile(null);
                setShowImportModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import Excel</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setIsExportDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={handleExportExcelAction}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-semibold">Export Excel (.xlsx)</p>
                      <p className="text-[10px] text-slate-400">Format spreadsheet lengkap</p>
                    </div>
                  </button>
                  <button
                    onClick={handleExportCSVAction}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <div>
                      <p className="font-semibold">Export CSV (.csv)</p>
                      <p className="text-[10px] text-slate-400">Format teks standar</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Mass Print QR Cards */}
            <button
              onClick={() => {
                if (selectedIds.length === 0) {
                  setSelectedIds(filteredTeachers.map((t) => t.id));
                }
                setShowMassCardModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Cetak Kartu QR</span>
            </button>

            {/* Add Teacher */}
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700 text-white transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Guru & Staf</span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{teachers.length}</p>
          </div>
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/40">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Status Aktif</span>
            <p className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
              {teachers.filter((t) => t.status !== 'nonaktif').length}
            </p>
          </div>
          <div className="bg-sky-50/70 dark:bg-sky-950/40 rounded-xl p-3 border border-sky-100 dark:border-sky-800/40">
            <span className="text-[11px] text-sky-700 dark:text-sky-400 font-medium">Jabatan Terdaftar</span>
            <p className="text-xl font-bold text-sky-900 dark:text-sky-200 mt-0.5">{uniqueJabatanList.length}</p>
          </div>
          <div className="bg-amber-50/70 dark:bg-amber-950/40 rounded-xl p-3 border border-amber-100 dark:border-amber-800/40">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Guru Terpilih</span>
            <p className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-0.5">{selectedIds.length} Guru</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama Guru, NIP, atau Jabatan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Jabatan Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterJabatan}
              onChange={(e) => {
                setFilterJabatan(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full sm:w-48 cursor-pointer"
            >
              <option value="Semua">Semua Jabatan</option>
              {uniqueJabatanList.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full sm:w-32 cursor-pointer"
          >
            <option value="Semua">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>

          {/* Reset Filter Button */}
          {isFilterActive && (
            <button
              onClick={resetFilters}
              title="Reset semua filter pencarian"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Selected Batch Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
              {selectedIds.length} guru dipilih
            </span>

            <button
              onClick={() => setShowMassCardModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-xl border border-sky-200 dark:border-sky-800 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-800 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </button>
          </div>
        )}
      </div>

      {/* Teachers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredTeachers.length > 0 && selectedIds.length === filteredTeachers.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5">NIP (Kunci Identitas)</th>
                <th className="p-3.5">Nama Guru / Tenaga Kependidikan</th>
                <th className="p-3.5">Jabatan / Posisi</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">ID QR Code</th>
                <th className="p-3.5 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400 dark:text-slate-500">
                    <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                      Tidak ada data guru yang cocok dengan filter pencarian.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ubah kata kunci atau tambahkan data guru baru.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        onClick={openAddModal}
                        className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                      >
                        + Tambah Guru Baru
                      </button>
                      {isFilterActive && (
                        <button
                          onClick={resetFilters}
                          className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((teacher, index) => {
                  const isSelected = selectedIds.includes(teacher.id);
                  const isNonaktif = teacher.status === 'nonaktif';

                  return (
                    <tr
                      key={teacher.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-sky-50/50 dark:bg-sky-950/30' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(teacher.id, e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 text-center text-slate-500 dark:text-slate-400 font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {teacher.nip}
                        </span>
                        {teacher.rfid_uid && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                              <Radio className="w-2.5 h-2.5 text-sky-500" /> {teacher.rfid_uid}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {teacher.nama}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                          {teacher.jabatan}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(teacher)}
                          title="Klik untuk mengubah status aktif / nonaktif"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer shadow-2xs hover:scale-105 ${
                            isNonaktif
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {isNonaktif ? (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Nonaktif</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTeacher(teacher);
                            setShowCardModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 text-[10px] font-semibold transition cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR Card</span>
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentTeacher(teacher);
                              setShowCardModal(true);
                            }}
                            title="Lihat & Cetak Kartu ID"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(teacher)}
                            title="Edit Data Guru"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTeacher(teacher)}
                            title="Hapus Data Guru"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{paginatedTeachers.length}</span> dari{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredTeachers.length}</span> data guru
            </p>

            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span>Baris:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD TEACHER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-400 rounded-xl">
                  <Plus className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Tambah Data Guru Baru</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Guru (dengan Gelar) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. La Ode Alimin, M.Pd."
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  NIP (Nomor Induk Pegawai) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 196803151994031008"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  NIP digunakan sebagai kunci unik scan QR presensi guru & sinkronisasi Supabase.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jabatan / Posisi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Guru Matematika / Guru Kelas / Kepala Sekolah"
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wali Kelas (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: X-1 / XI IPA 1"
                    value={formData.wali_kelas}
                    onChange={(e) => setFormData({ ...formData, wali_kelas: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No. HP / WA (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>

              {/* RFID UID Input for Teacher */}
              <div className="p-3 bg-sky-50/50 dark:bg-sky-950/30 rounded-xl border border-sky-100 dark:border-sky-900/50">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-300">
                    <Radio className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-pulse" />
                    UID Kartu RFID / Contactless NFC Guru (Opsional)
                  </label>
                  {formData.rfid_uid && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, rfid_uid: '' })}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                    >
                      Hapus Kartu
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.rfid_uid}
                    onChange={(e) => setFormData({ ...formData, rfid_uid: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="Contoh: E28068A1 atau tap kartu ke USB reader..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-sky-200 dark:border-sky-800 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-sky-500 font-mono uppercase tracking-wider"
                  />
                  <CreditCard className="w-4 h-4 text-sky-400 absolute left-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-sky-700/80 dark:text-sky-400/80 mt-1">
                  💡 <strong>Tip:</strong> Tap kartu RFID guru pada reader USB untuk mengisi nomor seri kartu secara instan.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Guru
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'aktif' | 'nonaktif' })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
                >
                  <option value="aktif">Aktif (Dapat Melakukan Presensi)</option>
                  <option value="nonaktif">Nonaktif (Cuti / Mutasi / Pensiun)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TEACHER */}
      {showEditModal && currentTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-400 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Edit Data Guru</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Guru (dengan Gelar) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  NIP (Nomor Induk Pegawai) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jabatan / Posisi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wali Kelas (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: X-1 / XI IPA 1"
                    value={formData.wali_kelas}
                    onChange={(e) => setFormData({ ...formData, wali_kelas: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No. HP / WA (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>

              {/* RFID UID Input for Teacher in Edit Modal */}
              <div className="p-3 bg-sky-50/50 dark:bg-sky-950/30 rounded-xl border border-sky-100 dark:border-sky-900/50">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-300">
                    <Radio className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-pulse" />
                    UID Kartu RFID / Contactless NFC Guru (Opsional)
                  </label>
                  {formData.rfid_uid && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, rfid_uid: '' })}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                    >
                      Hapus Kartu
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.rfid_uid}
                    onChange={(e) => setFormData({ ...formData, rfid_uid: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="Contoh: E28068A1 atau tap kartu ke USB reader..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-sky-200 dark:border-sky-800 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-sky-500 font-mono uppercase tracking-wider"
                  />
                  <CreditCard className="w-4 h-4 text-sky-400 absolute left-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-sky-700/80 dark:text-sky-400/80 mt-1">
                  💡 <strong>Tip:</strong> Tap kartu RFID guru pada reader USB untuk memperbarui nomor kartu.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Guru
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'aktif' | 'nonaktif' })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
                >
                  <option value="aktif">Aktif (Dapat Melakukan Presensi)</option>
                  <option value="nonaktif">Nonaktif (Cuti / Mutasi / Pensiun)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SINGLE TEACHER CONFIRMATION */}
      {deletingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 dark:border-amber-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                <Archive className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Nonaktifkan Data Guru?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Penghapusan Halus (Soft Delete)
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin <strong>menonaktifkan</strong> data guru berikut? Statusnya akan berubah menjadi Nonaktif dan presensi lamanya tetap aman.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100">{deletingTeacher.nama}</p>
                <p className="font-mono text-slate-600 dark:text-slate-400 mt-0.5">NIP: {deletingTeacher.nip}</p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">{deletingTeacher.jabatan}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingTeacher(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Ya, Nonaktifkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BATCH DELETE CONFIRMATION */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 dark:border-amber-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                <Archive className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Nonaktifkan {selectedIds.length} Guru Terpilih?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Penghapusan Halus (Soft Delete Massal)
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Anda akan mengubah status <strong>{selectedIds.length}</strong> data guru menjadi Nonaktif. Mereka tidak akan muncul di daftar presensi harian, namun riwayat presensinya tetap tersimpan.
              </p>
              <div className="max-h-32 overflow-y-auto bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs space-y-1">
                {teachers
                  .filter((t) => selectedIds.includes(t.id))
                  .slice(0, 5)
                  .map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{t.nama}</span>
                      <span className="font-mono text-slate-500">{t.nip}</span>
                    </div>
                  ))}
                {selectedIds.length > 5 && (
                  <p className="text-[10px] text-slate-400 italic pt-1 text-center">
                    ...dan {selectedIds.length - 5} guru lainnya
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Nonaktifkan {selectedIds.length} Guru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SINGLE CARD PREVIEW & PRINT */}
      {showCardModal && currentTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-400 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Kartu Presensi Guru
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{currentTeacher.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Size & Side Selector */}
            <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCardSide('front')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    cardSide === 'front'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Sisi Depan
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide('back')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    cardSide === 'back'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Sisi Belakang
                </button>
              </div>

              <select
                value={selectedCardSize}
                onChange={(e) => setSelectedCardSize(e.target.value as CardSizeOption)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
              >
                <option value="CR80">Ukuran CR80 (Standar KTP 54 x 85.6 mm)</option>
                <option value="B2">Ukuran Plastik B2 (70 x 100 mm)</option>
                <option value="B1">Ukuran Plastik B1 (55 x 90 mm)</option>
              </select>
            </div>

            {/* Printable Container */}
            <div className="py-6 flex items-center justify-center bg-slate-50 dark:bg-slate-950/60 rounded-2xl my-4 border border-slate-100 dark:border-slate-800 overflow-auto">
              <div id="single-teacher-card" className="shadow-lg rounded-2xl">
                {cardSide === 'front' ? (
                  <OfficialTeacherIDCardFront
                    nama={currentTeacher.nama}
                    nip={currentTeacher.nip}
                    jabatan={currentTeacher.jabatan}
                    cardSize={selectedCardSize}
                  />
                ) : (
                  <OfficialTeacherIDCardBack cardSize={selectedCardSize} />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                NIP: <strong className="font-mono">{currentTeacher.nip}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintCards('single-teacher-card')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700 rounded-xl transition shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kartu Ini</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MASS PRINT TEACHER CARDS */}
      {showMassCardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-400 rounded-xl">
                  <Printer className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Cetak Massal Kartu Guru (Grid A4)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mencetak {selectedIds.length} kartu guru siap potong dan laminasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMassCardModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Config options */}
            <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 dark:border-slate-800 flex-wrap flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ukuran Kartu:</span>
                <select
                  value={selectedCardSize}
                  onChange={(e) => setSelectedCardSize(e.target.value as CardSizeOption)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="CR80">CR80 Standar KTP (53.98 x 85.6 mm)</option>
                  <option value="B2">Plastik B2 (70 x 100 mm)</option>
                  <option value="B1">Plastik B1 (55 x 90 mm)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(teachers.map((t) => t.id))}
                  className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Pilih Semua ({teachers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Batal Pilih
                </button>
              </div>
            </div>

            {/* Grid preview */}
            <div className="flex-1 overflow-y-auto py-4">
              {selectedIds.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Belum ada kartu guru yang dipilih.</p>
                  <p className="text-xs text-slate-400 mt-1">Silakan klik 'Pilih Semua' di atas untuk mencetak seluruh kartu guru.</p>
                </div>
              ) : (
                <div
                  id="mass-teacher-cards-grid"
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 justify-items-center bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800"
                >
                  {teachers
                    .filter((t) => selectedIds.includes(t.id))
                    .map((teacher) => (
                      <div key={teacher.id} className="relative group shadow-md rounded-2xl">
                        <OfficialTeacherIDCardFront
                          nama={teacher.nama}
                          nip={teacher.nip}
                          jabatan={teacher.jabatan}
                          cardSize={selectedCardSize}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total kartu yang akan dicetak: <strong className="text-slate-800 dark:text-slate-200">{selectedIds.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMassCardModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={() => handlePrintCards('mass-teacher-cards-grid')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700 disabled:opacity-50 rounded-xl transition shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak {selectedIds.length} Kartu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT EXCEL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 rounded-xl">
                  <Upload className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Import Data Guru dari Excel / CSV</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                  setImportFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div className="bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800/60 rounded-xl p-3 text-xs text-sky-800 dark:text-sky-300 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Format kolom file Excel:</p>
                  <p className="text-[11px] text-sky-700 dark:text-sky-400 mt-0.5 font-mono">
                    NIP, Nama, Jabatan, Status
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 rounded-lg text-xs font-semibold shadow-xs hover:bg-sky-50 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih File Excel / CSV (.xlsx, .xls, .csv)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 dark:file:bg-sky-950 file:text-sky-700 dark:file:text-sky-300 hover:file:bg-sky-100 dark:hover:file:bg-sky-900 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mode Import
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      importMode === 'append'
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p className="font-bold">Tambah / Gabung</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Memperbarui data jika NIP sama & menambahkan yang baru
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      importMode === 'replace'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p className="font-bold text-rose-700 dark:text-rose-400">Ganti Seluruh Data</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Menghapus data lama dan mengganti dengan isi file baru
                    </p>
                  </button>
                </div>
              </div>

              {/* Preview table */}
              {importPreview.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pratinjau ({importPreview.length} baris guru terbaca):
                  </p>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2">NIP</th>
                          <th className="p-2">Nama Guru</th>
                          <th className="p-2">Jabatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importPreview.slice(0, 5).map((row, i) => (
                          <tr key={i} className="dark:bg-slate-900">
                            <td className="p-2 font-mono text-slate-900 dark:text-slate-100">{row.nip}</td>
                            <td className="p-2 font-medium text-slate-900 dark:text-slate-100">{row.nama}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-300">{row.jabatan}</td>
                          </tr>
                        ))}
                        {importPreview.length > 5 && (
                          <tr className="dark:bg-slate-900">
                            <td colSpan={3} className="p-2 text-center text-slate-400 italic">
                              ...dan {importPreview.length - 5} guru lainnya
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview([]);
                    setImportFile(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={importPreview.length === 0 || importLoading}
                  onClick={handleExecuteImport}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition shadow-sm cursor-pointer"
                >
                  {importLoading ? 'Memproses...' : `Import ${importPreview.length} Guru`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
