import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { store, isGenericQrCode } from '../lib/store';
import { toast } from '../lib/toast';
import { Student, UserRole, AttendanceRecord, Teacher } from '../types';
import { exportStudentListToExcel, exportStudentListToCSV, downloadStudentImportTemplate, parseStudentImportFile, printElement, getWhatsAppLink, generateWhatsAppMessage } from '../lib/exportUtils';
import { SchoolLogo } from './SchoolLogo';
import {
  OfficialStudentIDCardFront,
  OfficialStudentIDCardBack,
} from './OfficialStudentIDCard';
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
  Layers,
  Clock,
  FileCheck,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MessageCircle,
  Radio,
  Smartphone,
  CheckCircle2,
  Archive,
  RefreshCw,
} from 'lucide-react';

export type CardSizeOption = 'CR80' | 'B2' | 'B1';

export const CARD_SIZE_CONFIGS: Record<CardSizeOption, {
  name: string;
  badge: string;
  widthMM: number;
  heightMM: number;
  qrSize: number;
  logoSize: string;
  headerTitleClass: string;
  headerSubClass: string;
  nameClass: string;
  badgeClass: string;
  paddingClass: string;
}> = {
  CR80: {
    name: 'CR80 Standar KTP/ATM (53.98 x 85.60 mm)',
    badge: 'UKURAN CR80 (53.98 x 85.60 MM)',
    widthMM: 53.98,
    heightMM: 85.60,
    qrSize: 85,
    logoSize: 'w-6 h-6',
    headerTitleClass: 'text-[8.5px]',
    headerSubClass: 'text-[6.5px]',
    nameClass: 'text-[10px]',
    badgeClass: 'text-[8.5px]',
    paddingClass: 'p-2',
  },
  B2: {
    name: 'B2 Plastik (70 x 100 mm / 7 x 10 cm)',
    badge: 'UKURAN B2 (7 x 10 CM)',
    widthMM: 70,
    heightMM: 100,
    qrSize: 110,
    logoSize: 'w-8 h-8',
    headerTitleClass: 'text-[10px]',
    headerSubClass: 'text-[7.5px]',
    nameClass: 'text-xs',
    badgeClass: 'text-[9.5px]',
    paddingClass: 'p-3',
  },
  B1: {
    name: 'B1 Plastik (55 x 90 mm / 5.5 x 9 cm)',
    badge: 'UKURAN B1 (5.5 x 9 CM)',
    widthMM: 55,
    heightMM: 90,
    qrSize: 90,
    logoSize: 'w-6.5 h-6.5',
    headerTitleClass: 'text-[9px]',
    headerSubClass: 'text-[7px]',
    nameClass: 'text-[10.5px]',
    badgeClass: 'text-[9px]',
    paddingClass: 'p-2.5',
  },
};

export function getGradeFromClass(kelasStr: string): string {
  if (!kelasStr) return 'Lainnya';
  const clean = kelasStr.trim();
  const match = clean.match(/^(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I|\d+)/i);
  if (match) {
    return match[1].toUpperCase();
  }
  const firstWord = clean.split(/\s+/)[0].toUpperCase();
  return firstWord || 'Lainnya';
}

interface StudentManagementProps {
  userRole?: UserRole;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ userRole = 'Admin' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTingkat, setSelectedTingkat] = useState('Semua');
  const [selectedKelas, setSelectedKelas] = useState('Semua');
  const [selectedAccountStatus, setSelectedAccountStatus] = useState('Semua');
  const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [qrModalStudent, setQrModalStudent] = useState<Student | null>(null);

  // RFID Card Binding State
  const [rfidBindStudent, setRfidBindStudent] = useState<Student | null>(null);
  const [rfidInputVal, setRfidInputVal] = useState('');
  const [rfidConflict, setRfidConflict] = useState<{
    type: 'siswa' | 'guru';
    student?: Student;
    teacher?: Teacher;
  } | null>(null);
  const [isNfcActive, setIsNfcActive] = useState(false);
  const rfidInputRef = useRef<HTMLInputElement>(null);

  // Selection & Batch Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [batchTargetClass, setBatchTargetClass] = useState('');
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Import Excel Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Omit<Student, 'id' | 'createdAt'>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importTotalRows, setImportTotalRows] = useState(0);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mass Card Print State
  const [cardSize, setCardSize] = useState<CardSizeOption>('CR80');
  const activeConfig = CARD_SIZE_CONFIGS[cardSize];
  const [massPrintSide, setMassPrintSide] = useState<'both' | 'front' | 'back'>('both');
  const [isMassPrintModalOpen, setIsMassPrintModalOpen] = useState(false);
  const [massPrintKelasFilter, setMassPrintKelasFilter] = useState('Semua');
  const [massPrintSearch, setMassPrintSearch] = useState('');
  const [massPrintSelectedIds, setMassPrintSelectedIds] = useState<string[]>([]);

  // Export Dropdown State & Handlers
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const handleExportExcel = (customList?: Student[]) => {
    const target = customList || (selectedIds.length > 0 ? students.filter((s) => selectedIds.includes(s.id)) : filteredStudents);
    const classLabel = selectedKelas !== 'Semua' ? `Kelas_${selectedKelas.replace(/\s+/g, '_')}` : '';
    const searchLabel = searchTerm ? `Filter_Cari` : '';
    const prefix = `Data_Siswa_NEXA15${classLabel ? '_' + classLabel : ''}${searchLabel ? '_' + searchLabel : ''}`;
    exportStudentListToExcel(target, prefix);
  };

  const handleExportCSV = (customList?: Student[]) => {
    const target = customList || (selectedIds.length > 0 ? students.filter((s) => selectedIds.includes(s.id)) : filteredStudents);
    const classLabel = selectedKelas !== 'Semua' ? `Kelas_${selectedKelas.replace(/\s+/g, '_')}` : '';
    const searchLabel = searchTerm ? `Filter_Cari` : '';
    const prefix = `Data_Siswa_NEXA15${classLabel ? '_' + classLabel : ''}${searchLabel ? '_' + searchLabel : ''}`;
    exportStudentListToCSV(target, prefix);
  };

  const handleOpenMassPrint = (preselectedIds?: string[]) => {
    const listToUse = preselectedIds && preselectedIds.length > 0 ? preselectedIds : filteredStudents.map((s) => s.id);
    setMassPrintSelectedIds(listToUse);
    setIsMassPrintModalOpen(true);
  };

  const handlePrintAllQRCodes = () => {
    setMassPrintKelasFilter('Semua');
    setMassPrintSearch('');
    setMassPrintSelectedIds(students.map((s) => s.id));
    setIsMassPrintModalOpen(true);
  };

  // Form State
  const [formData, setFormData] = useState({
    id_qr: '',
    nisn: '',
    nama: '',
    kelas: 'X 1',
    no_hp_ortu: '',
    rfid_uid: '',
    foto: '',
    status: 'aktif' as 'aktif' | 'nonaktif',
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setStudents(store.getStudents());
    setAttendance(store.getAttendance());
    store.fetchFromServer();
    const unsubscribe = store.subscribe(() => {
      setStudents(store.getStudents());
      setAttendance(store.getAttendance());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (rfidBindStudent) {
      setRfidInputVal(rfidBindStudent.rfid_uid || '');
      setRfidConflict(null);
      setIsNfcActive(false);
      const timer = setTimeout(() => {
        rfidInputRef.current?.focus();
        rfidInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [rfidBindStudent]);

  const { hexFormatted, decFormatted } = useMemo(() => {
    const clean = rfidInputVal.trim().toUpperCase().replace(/[\s:-]/g, '');
    if (!clean) return { hexFormatted: '', decFormatted: '' };

    let hex = '';
    let dec = '';

    // Check if input is hex
    if (/^[0-9A-F]+$/.test(clean)) {
      if (clean.length <= 8) {
        try {
          const decNum = parseInt(clean, 16);
          if (!isNaN(decNum)) {
            dec = String(decNum).padStart(10, '0');
            hex = clean.padStart(8, '0');
          }
        } catch {}
      } else {
        hex = clean;
      }
    }

    // Check if input is decimal
    if (/^\d+$/.test(clean)) {
      try {
        const decVal = parseInt(clean, 10);
        if (!isNaN(decVal)) {
          const hexStr = decVal.toString(16).toUpperCase();
          if (!hex) hex = hexStr.padStart(8, '0');
          if (!dec) dec = clean.padStart(10, '0');
        }
      } catch {}
    }

    return { hexFormatted: hex, decFormatted: dec };
  }, [rfidInputVal]);

  const handleTingkatChange = (tingkat: string) => {
    setSelectedTingkat(tingkat);
    if (tingkat !== 'Semua' && selectedKelas !== 'Semua') {
      const matchingClasses = students
        .filter((s) => getGradeFromClass(s.kelas) === tingkat)
        .map((s) => s.kelas);
      if (!matchingClasses.includes(selectedKelas)) {
        setSelectedKelas('Semua');
      }
    }
  };

  const gradeOptions = useMemo(() => {
    const grades = new Set<string>();
    students.forEach((s) => {
      const g = getGradeFromClass(s.kelas);
      if (g) grades.add(g);
    });
    const order = ['X', 'XI', 'XII', 'VII', 'VIII', 'IX', '10', '11', '12', '7', '8', '9', '1', '2', '3', '4', '5', '6'];
    return Array.from(grades).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [students]);

  const classOptions = useMemo(() => {
    let list = students;
    if (selectedTingkat !== 'Semua') {
      list = students.filter((s) => getGradeFromClass(s.kelas) === selectedTingkat);
    }
    const classCounts = new Map<string, number>();
    list.forEach((s) => {
      if (s.kelas) {
        classCounts.set(s.kelas, (classCounts.get(s.kelas) || 0) + 1);
      }
    });
    return Array.from(classCounts.keys()).sort().map((c) => ({
      name: c,
      count: classCounts.get(c) || 0,
    }));
  }, [students, selectedTingkat]);

  // Fast O(1) attendance lookup map instead of scanning full attendance array on every student
  const todayAttendanceMap = useMemo(() => {
    const todayMap = new Map<string, AttendanceRecord>();
    const fallbackMap = new Map<string, AttendanceRecord>();

    for (let i = 0; i < attendance.length; i++) {
      const a = attendance[i];
      const isToday = store.isRecordForToday(a);
      const nisn = (a.nisn || '').trim();
      const idQr = (a.id_qr || '').trim();
      const namaKelas = `${(a.nama || '').trim().toLowerCase()}_${(a.kelas || '').trim().toLowerCase()}`;

      const targetMap = isToday ? todayMap : fallbackMap;

      if (nisn && !targetMap.has(`nisn:${nisn}`)) targetMap.set(`nisn:${nisn}`, a);
      if (idQr && !isGenericQrCode(idQr) && !targetMap.has(`qr:${idQr.toLowerCase()}`)) targetMap.set(`qr:${idQr.toLowerCase()}`, a);
      if (namaKelas && !targetMap.has(`namakelas:${namaKelas}`)) targetMap.set(`namakelas:${namaKelas}`, a);
    }

    return { todayMap, fallbackMap };
  }, [attendance]);

  const getStudentTodayAttendance = (student: Student): AttendanceRecord | undefined => {
    const targetNisn = (student.nisn || '').trim();
    const targetQr = (student.id_qr || '').trim();
    const targetNamaKelas = `${(student.nama || '').trim().toLowerCase()}_${(student.kelas || '').trim().toLowerCase()}`;

    const { todayMap, fallbackMap } = todayAttendanceMap;

    if (targetNisn && todayMap.has(`nisn:${targetNisn}`)) return todayMap.get(`nisn:${targetNisn}`);
    if (targetQr && !isGenericQrCode(targetQr) && todayMap.has(`qr:${targetQr.toLowerCase()}`)) return todayMap.get(`qr:${targetQr.toLowerCase()}`);
    if (targetNamaKelas && todayMap.has(`namakelas:${targetNamaKelas}`)) return todayMap.get(`namakelas:${targetNamaKelas}`);

    if (targetNisn && fallbackMap.has(`nisn:${targetNisn}`)) return fallbackMap.get(`nisn:${targetNisn}`);
    if (targetQr && !isGenericQrCode(targetQr) && fallbackMap.has(`qr:${targetQr.toLowerCase()}`)) return fallbackMap.get(`qr:${targetQr.toLowerCase()}`);
    if (targetNamaKelas && fallbackMap.has(`namakelas:${targetNamaKelas}`)) return fallbackMap.get(`namakelas:${targetNamaKelas}`);

    return undefined;
  };

  const filteredStudents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return students.filter((s) => {
      // 1. Text Search
      const matchSearch =
        !term ||
        s.nama.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        s.nisn.toLowerCase().includes(term) ||
        s.id_qr.toLowerCase().includes(term) ||
        (s.rfid_uid && s.rfid_uid.toLowerCase().includes(term)) ||
        s.kelas.toLowerCase().includes(term);

      if (!matchSearch) return false;

      // 2. Grade Level (Tingkat) match
      if (selectedTingkat !== 'Semua') {
        const grade = getGradeFromClass(s.kelas);
        if (grade !== selectedTingkat) return false;
      }

      // 3. Class section (Kelas) match
      if (selectedKelas !== 'Semua') {
        if (s.kelas !== selectedKelas) return false;
      }

      // 4. Account Status match
      if (selectedAccountStatus !== 'Semua') {
        if (s.status !== selectedAccountStatus) return false;
      }

      // 5. Attendance Status match
      if (selectedAttendanceStatus !== 'Semua') {
        const todayRec = getStudentTodayAttendance(s);
        const isToday = todayRec ? store.isRecordForToday(todayRec) : false;
        const currentStatus = isToday && todayRec ? todayRec.status : 'Belum Absen';

        if (selectedAttendanceStatus === 'Hadir_All') {
          if (currentStatus !== 'Hadir' && currentStatus !== 'Terlambat') return false;
        } else if (selectedAttendanceStatus === 'Excused') {
          if (currentStatus !== 'Izin' && currentStatus !== 'Sakit') return false;
        } else if (currentStatus !== selectedAttendanceStatus) {
          return false;
        }
      }

      return true;
    });
  }, [
    students,
    searchTerm,
    selectedTingkat,
    selectedKelas,
    selectedAccountStatus,
    selectedAttendanceStatus,
    todayAttendanceMap,
  ]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedTingkat !== 'Semua' ||
    selectedKelas !== 'Semua' ||
    selectedAccountStatus !== 'Semua' ||
    selectedAttendanceStatus !== 'Semua';

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedTingkat('Semua');
    setSelectedKelas('Semua');
    setSelectedAccountStatus('Semua');
    setSelectedAttendanceStatus('Semua');
  };

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedTingkat,
    selectedKelas,
    selectedAccountStatus,
    selectedAttendanceStatus,
    pageSize,
  ]);

  const totalStudentsCount = filteredStudents.length;
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalStudentsCount / pageSize));

  const paginatedStudents = useMemo(() => {
    if (pageSize === 0) return filteredStudents;
    const startIdx = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIdx, startIdx + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Select All Checkbox Handler
  const isAllSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.includes(s.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleSelectStudent = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConfirmBatchDelete = () => {
    if (selectedIds.length > 0) {
      store.deleteMultipleStudents(selectedIds);
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
    }
  };

  const handleConfirmBatchMove = async () => {
    if (selectedIds.length > 0 && batchTargetClass) {
      await store.updateMultipleStudents(selectedIds, { kelas: batchTargetClass });
      setSelectedIds([]);
      setBatchTargetClass('');
      setIsBatchMoveModalOpen(false);
    }
  };

  const handleConfirmClearAll = () => {
    store.deleteAllStudents();
    setSelectedIds([]);
    setIsClearAllModalOpen(false);
  };

  // Import Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const selected = files[0];
      setImportFile(selected);
      setIsParsing(true);
      const res = await parseStudentImportFile(selected);
      setIsParsing(false);
      setImportPreview(res.data);
      setImportErrors(res.errors);
      setImportTotalRows(res.totalRows);
    }
  };

  const handleExecuteImport = () => {
    if (importPreview.length === 0) return;
    store.importStudents(importPreview, importMode);
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
    setImportTotalRows(0);
    setIsImportModalOpen(false);
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    const newNISN = String(Math.floor(3000000000 + Math.random() * 900000000));
    setFormData({
      id_qr: `69933068.${newNISN}.`,
      nisn: newNISN,
      nama: '',
      kelas: 'X 1',
      no_hp_ortu: '',
      rfid_uid: '',
      foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      status: 'aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setFormData({
      id_qr: s.id_qr || `69933068.${s.nisn}.${s.nama}`,
      nisn: s.nisn,
      nama: s.nama,
      kelas: s.kelas,
      no_hp_ortu: s.no_hp_ortu || '',
      rfid_uid: s.rfid_uid || '',
      foto: s.foto || '',
      status: s.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nisn.trim()) {
      toast.error('Form Belum Lengkap', 'Nama Siswa dan NISN wajib diisi.');
      return;
    }

    const cleanRfid = formData.rfid_uid.trim().toUpperCase();

    // Check if another student already uses this RFID UID
    if (cleanRfid) {
      const existingWithRfid = students.find(
        (s) => s.rfid_uid && s.rfid_uid.trim().toUpperCase() === cleanRfid && s.id !== editingStudent?.id
      );
      if (existingWithRfid) {
        toast.error('UID RFID Sudah Dipakai', `Kartu RFID [${cleanRfid}] sudah digunakan oleh ${existingWithRfid.nama} (${existingWithRfid.kelas}).`);
        return;
      }
    }

    const formattedData = {
      ...formData,
      nama: formData.nama.trim(),
      nisn: formData.nisn.trim(),
      id_qr: `69933068.${formData.nisn.trim()}.${formData.nama.trim()}`,
      rfid_uid: cleanRfid || undefined,
    };

    if (editingStudent) {
      store.updateStudent(editingStudent.id, formattedData);
      toast.success('Data Diperbarui', `Data siswa ${formattedData.nama} berhasil diperbarui.`);
    } else {
      store.addStudent(formattedData);
      toast.success('Siswa Ditambahkan', `Siswa baru ${formattedData.nama} berhasil didaftarkan.`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (s: Student) => {
    setDeletingStudent(s);
  };

  const confirmDeleteStudent = () => {
    if (deletingStudent) {
      store.deleteStudent(deletingStudent.id);
      setDeletingStudent(null);
    }
  };

  // RFID Binding Handlers & Helpers
  const handleOpenBindRfid = (s: Student) => {
    setRfidBindStudent(s);
    setRfidInputVal(s.rfid_uid || '');
    setRfidConflict(null);
    setIsNfcActive(false);
  };

  const handleRfidInputChange = (val: string) => {
    setRfidInputVal(val);
    const clean = val.trim().toUpperCase().replace(/[\s:-]/g, '');
    if (!clean) {
      setRfidConflict(null);
      return;
    }
    const match = store.findByRfidUid(clean);
    if (match) {
      if (match.type === 'siswa' && match.student?.id === rfidBindStudent?.id) {
        setRfidConflict(null);
      } else {
        setRfidConflict(match);
      }
    } else {
      setRfidConflict(null);
    }
  };

  const handleSaveRfidBind = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rfidBindStudent) return;
    const clean = rfidInputVal.trim().toUpperCase().replace(/[\s:-]/g, '');
    if (!clean) {
      toast.error('UID Kosong', 'Silakan ketik atau tempelkan kartu RFID fisik ke reader.');
      return;
    }

    store.assignRfidToStudent(rfidBindStudent.id, clean);
    toast.success(
      'Kartu RFID Ditautkan',
      `Kartu [${clean}] berhasil dipetakan ke profil siswa ${rfidBindStudent.nama} (${rfidBindStudent.kelas}).`
    );
    setRfidBindStudent(null);
  };

  const handleUnbindRfid = () => {
    if (!rfidBindStudent) return;
    store.updateStudent(rfidBindStudent.id, { rfid_uid: undefined });
    toast.info(
      'Tautan Kartu Dihapus',
      `Kartu RFID untuk siswa ${rfidBindStudent.nama} berhasil dilepas.`
    );
    setRfidBindStudent(null);
  };

  const handleStartNfcScan = async () => {
    if (typeof window === 'undefined' || !('NDEFReader' in window)) {
      toast.error('NFC Tidak Didukung', 'Browser atau perangkat tidak mendukung Web NFC API.');
      return;
    }
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      setIsNfcActive(true);
      toast.info('NFC Smartphone Aktif', 'Tempelkan kartu RFID/NFC ke bagian belakang smartphone Anda.');
      ndef.addEventListener('reading', (event: any) => {
        const serial = (event.serialNumber || '').replace(/[:\s-]/g, '').toUpperCase();
        if (serial) {
          handleRfidInputChange(serial);
          toast.success('Kartu Terdeteksi', `UID [${serial}] berhasil dipindai via NFC!`);
        }
      });
    } catch (err: any) {
      setIsNfcActive(false);
      toast.error('Gagal Mengaktifkan NFC', err?.message || 'Izin NFC ditolak atau tidak tersedia.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Database Siswa Terintegrasi</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Single DB Admin & Piket ({students.length} Siswa)
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manajemen Data Siswa & QR</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Database utama siswa terpusat untuk Admin, Guru Piket, & Kepala Sekolah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            title="Import data siswa dari file Excel / CSV"
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          {students.length > 0 && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3.5 py-2.5 bg-red-100 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900 text-red-700 dark:text-red-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-red-200 dark:border-red-900"
              title="Hapus keseluruhan data siswa dari database agar bisa di-import ulang tanpa tercatat ganda"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Hapus Seluruh Data Siswa</span>
            </button>
          )}

          {students.length > 0 && (
            <>
              <button
                onClick={handlePrintAllQRCodes}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                title="Tampilkan & cetak tampilan printable seluruh QR code siswa dalam layout grid"
              >
                <QrCode className="w-4 h-4" />
                <Printer className="w-4 h-4" />
                <span>Cetak Semua QR Code</span>
              </button>

              <button
                onClick={() => handleOpenMassPrint()}
                className="px-3.5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                title="Cetak Kartu Presensi Digital QR secara massal"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu Masal</span>
              </button>
            </>
          )}

          {/* Export Dropdown Menu (Excel & CSV) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm"
              title="Unduh Data Siswa (Excel / CSV)"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Data Siswa ({filteredStudents.length})</span>
            </button>

            {isExportDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsExportDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Export ({filteredStudents.length} Siswa Terfilter)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportExcel();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-2.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div>Download Excel (.xlsx)</div>
                      <div className="text-[10px] font-normal text-slate-400">Format Spreadsheet Excel</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportCSV();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div>Download CSV (.csv)</div>
                      <div className="text-[10px] font-normal text-slate-400">Format Teks Komutatif (CSV)</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Batch Actions Bar (When checkboxes are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-bold">
            <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg font-mono">
              {selectedIds.length} Siswa Terpilih
            </span>
            <span>Data siswa terpilih dapat dihapus secara masal sekaligus.</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleExportExcel(students.filter((s) => selectedIds.includes(s.id)))}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              title="Export data siswa terpilih ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel ({selectedIds.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportCSV(students.filter((s) => selectedIds.includes(s.id)))}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              title="Export data siswa terpilih ke CSV (.csv)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export CSV ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => handleOpenMassPrint(selectedIds)}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              title="Cetak Kartu Presensi Digital untuk siswa terpilih"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              Batal Pilih
            </button>
            <button
              onClick={() => setIsBatchMoveModalOpen(true)}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Mutasi Kelas ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedIds.length} Siswa Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        {/* Top Search Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama siswa, NISN, ID QR, atau kelas..."
              className="w-full pl-10 pr-9 py-2.5 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800/90 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md transition-colors"
                title="Bersihkan pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Result Count & Reset Button */}
          <div className="flex items-center justify-between lg:justify-end gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Menampilkan <strong className="text-blue-600 dark:text-blue-400 font-bold">{filteredStudents.length}</strong> dari {students.length} siswa
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* 1. Grade Level (Tingkat Kelas) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Tingkat Kelas
            </label>
            <select
              value={selectedTingkat}
              onChange={(e) => handleTingkatChange(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-800 dark:text-white transition-all cursor-pointer font-semibold"
            >
              <option value="Semua">Semua Tingkat ({gradeOptions.length})</option>
              {gradeOptions.map((g) => (
                <option key={g} value={g}>
                  Tingkat {g}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Class Section (Kelas / Rombel) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Kelas / Section
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-800 dark:text-white transition-all cursor-pointer font-semibold"
            >
              <option value="Semua">
                {selectedTingkat !== 'Semua' ? `Semua Kelas (Tingkat ${selectedTingkat})` : `Semua Kelas (${classOptions.length})`}
              </option>
              {classOptions.map((c) => (
                <option key={c.name} value={c.name}>
                  Kelas {c.name} ({c.count} Siswa)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Presensi Hari Ini */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Presensi Hari Ini
            </label>
            <select
              value={selectedAttendanceStatus}
              onChange={(e) => setSelectedAttendanceStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-800 dark:text-white transition-all cursor-pointer font-semibold"
            >
              <option value="Semua">Semua Status Presensi</option>
              <option value="Hadir_All">🟢 Hadir & Terlambat</option>
              <option value="Hadir">✅ Hadir Tepat Waktu</option>
              <option value="Terlambat">⏰ Terlambat</option>
              <option value="Excused">ℹ️ Izin & Sakit</option>
              <option value="Izin">📄 Izin</option>
              <option value="Sakit">🏥 Sakit</option>
              <option value="Alpa">❌ Alpa / Tanpa Keterangan</option>
              <option value="Belum Absen">⏳ Belum Absen Hari Ini</option>
            </select>
          </div>

          {/* 4. Status Akun Siswa */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Status Akun
            </label>
            <select
              value={selectedAccountStatus}
              onChange={(e) => setSelectedAccountStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-800 dark:text-white transition-all cursor-pointer font-semibold"
            >
              <option value="Semua">Semua Status Akun</option>
              <option value="aktif">🟢 Aktif</option>
              <option value="nonaktif">🔴 Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter Aktif:
            </span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Pencarian: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-blue-900 dark:hover:text-white cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTingkat !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Tingkat: {selectedTingkat}
                <button onClick={() => setSelectedTingkat('Semua')} className="hover:text-indigo-900 dark:hover:text-white cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedKelas !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Kelas: {selectedKelas}
                <button onClick={() => setSelectedKelas('Semua')} className="hover:text-purple-900 dark:hover:text-white cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedAttendanceStatus !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Presensi: {selectedAttendanceStatus}
                <button onClick={() => setSelectedAttendanceStatus('Semua')} className="hover:text-emerald-900 dark:hover:text-white cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedAccountStatus !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Status Akun: {selectedAccountStatus}
                <button onClick={() => setSelectedAccountStatus('Semua')} className="hover:text-amber-900 dark:hover:text-white cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Student Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    title="Pilih Semua Siswa"
                  />
                </th>
                <th className="p-3.5">No</th>
                <th className="p-3.5">Foto & Nama</th>
                <th className="p-3.5">NISN</th>
                <th className="p-3.5">ID QR Code</th>
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5">Presensi Hari Ini</th>
                <th className="p-3.5">Status Akun</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((s, index) => {
                  const isSelected = selectedIds.includes(s.id);
                  const todayRec = getStudentTodayAttendance(s);
                  const isToday = todayRec ? store.isRecordForToday(todayRec) : false;
                  const itemNumber = pageSize === 0 ? index + 1 : (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/50'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectStudent(s.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-medium text-slate-400 dark:text-slate-500">{itemNumber}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={s.foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                            alt={s.nama}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{s.nama}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">QR: 69933068.{s.nisn}.{s.nama}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        <div>{s.nisn}</div>
                        {s.rfid_uid ? (
                          <button
                            type="button"
                            onClick={() => handleOpenBindRfid(s)}
                            className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 mt-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                            title={`UID Kartu: ${s.rfid_uid} (Klik untuk ubah / kelola tautan kartu RFID)`}
                          >
                            <Radio className="w-2.5 h-2.5 text-indigo-500 animate-pulse" /> {s.rfid_uid}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenBindRfid(s)}
                            className="inline-flex items-center gap-1 text-[9.5px] text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 mt-1 hover:underline cursor-pointer"
                            title={`Tautkan Kartu RFID Fisik untuk ${s.nama}`}
                          >
                            <CreditCard className="w-2.5 h-2.5" /> +Taut RFID
                          </button>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-blue-700 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/40 px-2 py-1 rounded w-max">
                        {s.id_qr}
                      </td>
                      <td className="p-3.5 font-medium">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-semibold">
                          {s.kelas}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {(() => {
                          if (!isToday || !todayRec) {
                            return (
                              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                <Clock className="w-3 h-3 text-slate-400" /> Belum Absen
                              </span>
                            );
                          }
                          switch (todayRec.status) {
                            case 'Hadir':
                              return (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Hadir ({todayRec.jenis})
                                </span>
                              );
                            case 'Terlambat':
                              return (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Terlambat
                                </span>
                              );
                            case 'Izin':
                              return (
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                                  <FileCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Izin
                                </span>
                              );
                            case 'Sakit':
                              return (
                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                  <Stethoscope className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Sakit
                                </span>
                              );
                            case 'Alpa':
                              return (
                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                  <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Alpa
                                </span>
                              );
                            default:
                              return (
                                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                  <Clock className="w-3 h-3" /> {todayRec.status}
                                </span>
                              );
                          }
                        })()}
                      </td>
                      <td className="p-3.5">
                        {s.status === 'aktif' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-3 h-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                            <XCircle className="w-3 h-3" /> Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Bind RFID Card Button */}
                          <button
                            onClick={() => handleOpenBindRfid(s)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              s.rfid_uid
                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
                                : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                            }`}
                            title={
                              s.rfid_uid
                                ? `Kartu RFID Tertaut: ${s.rfid_uid} (Klik untuk kelola/ganti kartu)`
                                : `Tautkan Kartu Fisik RFID untuk ${s.nama}`
                            }
                          >
                            <Radio className={`w-4 h-4 ${s.rfid_uid ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            onClick={() => setQrModalStudent(s)}
                            className="p-1.5 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 rounded-lg transition-colors"
                            title="Lihat Kartu QR Siswa"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {/* WhatsApp Parent Notification Button */}
                          <button
                            onClick={() => {
                              if (s.no_hp_ortu) {
                                const waMsg = generateWhatsAppMessage(s, todayRec);
                                const waUrl = getWhatsAppLink(s.no_hp_ortu, waMsg);
                                window.open(waUrl, '_blank');
                              } else {
                                const phone = prompt(`Masukkan No WhatsApp Orang Tua untuk ${s.nama}:`, '08123456789');
                                if (phone && phone.trim()) {
                                  store.updateStudent(s.id, { no_hp_ortu: phone.trim() });
                                  const waMsg = generateWhatsAppMessage({ ...s, no_hp_ortu: phone.trim() }, todayRec);
                                  const waUrl = getWhatsAppLink(phone.trim(), waMsg);
                                  window.open(waUrl, '_blank');
                                }
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              s.no_hp_ortu
                                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={s.no_hp_ortu ? `Kirim Notifikasi WA ke Ortu (${s.no_hp_ortu})` : 'Tambah No WA Ortu & Kirim Pesan'}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                            title="Edit Data Siswa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(s)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                            title="Hapus Data Siswa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 text-xs">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">Belum Ada Data Siswa</p>
                    <p className="mt-1 text-[11px] text-slate-400">Silakan gunakan tombol "Import Excel" atau "Tambah Siswa" untuk mengisi database.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredStudents.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs transition-colors">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <span>
              Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1}</span> -{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {pageSize === 0 ? totalStudentsCount : Math.min(currentPage * pageSize, totalStudentsCount)}
              </span>{' '}
              dari <span className="font-bold text-slate-800 dark:text-slate-200">{totalStudentsCount}</span> siswa
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px]">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value={10}>10 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
                <option value={100}>100 / hal</option>
                <option value={0}>Semua ({totalStudentsCount})</option>
              </select>
            </div>
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-2 font-semibold">
                <span className="text-blue-600 dark:text-blue-400 font-bold">{currentPage}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-600 dark:text-slate-300">{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Add / Edit Student */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">ID QR Code (Otomatis)</label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, id_qr: `69933068.${formData.nisn.trim()}.${formData.nama.trim()}` })}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        title="Format ulang ID QR"
                      >
                        = Format Ulang
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={`69933068.${formData.nisn.trim()}.${formData.nama.trim()}`}
                    onChange={(e) => setFormData({ ...formData, id_qr: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono bg-slate-50 dark:bg-slate-900"
                    placeholder="69933068.nisn.nama siswa"
                    readOnly
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Format ID QR: <code>69933068.nisn.nama siswa</code></p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NISN / No. Kartu</label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => {
                      const newNisn = e.target.value;
                      setFormData({
                        ...formData,
                        nisn: newNisn,
                        id_qr: `69933068.${newNisn.trim()}.${formData.nama.trim()}`
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
                    placeholder="Contoh: 0081234567"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Nomor Induk Siswa Nasional.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => {
                    const newNama = e.target.value;
                    setFormData({
                      ...formData,
                      nama: newNama,
                      id_qr: `69933068.${formData.nisn.trim()}.${newNama.trim()}`
                    });
                  }}
                  placeholder="Contoh: DADANG BUAMONA"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kelas</label>
                <input
                  type="text"
                  value={formData.kelas}
                  onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                  placeholder="Contoh: X IPA 1, XI MIPA 2, XII IPS 3"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              {/* RFID / NFC Card UID */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    <Radio className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    UID Kartu RFID / Contactless NFC (Opsional)
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
                    placeholder="Contoh: E28068A1 atau tempelkan kartu ke reader..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-indigo-200 dark:border-indigo-800 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono uppercase tracking-wider"
                  />
                  <CreditCard className="w-4 h-4 text-indigo-400 absolute left-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80 mt-1">
                  💡 <strong>Tip Cepat:</strong> Klik kolom ini lalu tempelkan kartu RFID siswa pada alat USB RFID Reader untuk mengisi otomatis.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">No. WhatsApp / HP Orang Tua</label>
                <input
                  type="text"
                  value={formData.no_hp_ortu}
                  onChange={(e) => setFormData({ ...formData, no_hp_ortu: e.target.value })}
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk pengiriman notifikasi presensi langsung ke WhatsApp orang tua.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">URL Foto Profil</label>
                <input
                  type="text"
                  value={formData.foto}
                  onChange={(e) => setFormData({ ...formData, foto: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Keaktifan</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'aktif' | 'nonaktif' })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
                >
                  <option value="aktif">Aktif (Bisa Absen)</option>
                  <option value="nonaktif">Nonaktif (Ditolak Saat Absen)</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-bold">Tips Pemindaian Siswa Manual:</p>
                <p>Siswa baru yang ditambahkan bisa langsung dipindai menggunakan <strong>ID QR</strong>, <strong>NISN</strong>, atau <strong>Nama Lengkap</strong> pada scanner piket.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Student (Admin Only) */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden transition-colors">
            <div className="bg-amber-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Konfirmasi Nonaktifkan Data Siswa
              </h3>
              <button onClick={() => setDeletingStudent(null)} className="text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-bold">⚠️ Perhatian Admin (Soft Delete):</p>
                <p className="mt-1">
                  Data siswa ini akan diubah statusnya menjadi <strong>Nonaktif</strong>. Rekaman presensi historis <strong>tidak akan dihapus</strong>, namun siswa ini tidak akan bisa melakukan scan presensi baru sebelum diaktifkan kembali.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <p>
                  <span className="text-slate-500 dark:text-slate-400">Nama Siswa:</span>{' '}
                  <strong className="text-slate-900 dark:text-white font-bold">{deletingStudent.nama}</strong>
                </p>
                <p>
                  <span className="text-slate-500 dark:text-slate-400">NISN:</span>{' '}
                  <strong className="font-mono text-blue-600 dark:text-blue-400">{deletingStudent.nisn}</strong>
                </p>
                <p>
                  <span className="text-slate-500 dark:text-slate-400">ID QR Code:</span>{' '}
                  <strong className="font-mono text-cyan-600 dark:text-cyan-400">{deletingStudent.id_qr}</strong>
                </p>
                <p>
                  <span className="text-slate-500 dark:text-slate-400">Kelas:</span>{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{deletingStudent.kelas}</strong>
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteStudent}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-md transition-all flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Nonaktifkan Siswa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tautkan Kartu RFID / Bind RFID Card */}
      {rfidBindStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-2">
                    <span>Tautkan Kartu RFID / NFC Fisik</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      Siswa
                    </span>
                  </h3>
                  <p className="text-[11px] text-indigo-200/80 mt-0.5">
                    Petakan UID kartu fisik (13.56 MHz / 125 kHz) ke profil siswa untuk absensi instan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRfidBindStudent(null)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRfidBind} className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
              {/* Student Profile Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
                <img
                  src={rfidBindStudent.foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                  alt={rfidBindStudent.nama}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-indigo-500/30 shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase truncate">
                      {rfidBindStudent.nama}
                    </h4>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 shrink-0">
                      Kelas {rfidBindStudent.kelas}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono">
                    <span>NISN: <strong className="text-slate-800 dark:text-slate-200">{rfidBindStudent.nisn}</strong></span>
                    <span>ID QR: <strong className="text-cyan-700 dark:text-cyan-300 text-[10px]">{rfidBindStudent.id_qr}</strong></span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Status Kartu Saat Ini:</span>
                    {rfidBindStudent.rfid_uid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                        <Radio className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />
                        Tertaut: {rfidBindStudent.rfid_uid}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 italic">
                        Belum memiliki kartu RFID tertaut
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* RFID Input Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    UID Kartu RFID / NFC Fisik:
                  </label>
                  {typeof window !== 'undefined' && 'NDEFReader' in window && (
                    <button
                      type="button"
                      onClick={handleStartNfcScan}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 border transition cursor-pointer ${
                        isNfcActive
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>{isNfcActive ? 'NFC HP Aktif...' : 'Scan via NFC HP'}</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    ref={rfidInputRef}
                    type="text"
                    value={rfidInputVal}
                    onChange={(e) => handleRfidInputChange(e.target.value)}
                    placeholder="Tempelkan kartu RFID pada reader USB atau ketik UID..."
                    className="w-full pl-9 pr-20 py-2.5 text-xs border border-indigo-300 dark:border-indigo-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-600 font-mono uppercase tracking-wider font-bold shadow-inner"
                    autoComplete="off"
                    autoFocus
                  />
                  <Radio className="w-4 h-4 text-indigo-500 absolute left-3 top-3 animate-pulse" />
                  {rfidInputVal && (
                    <button
                      type="button"
                      onClick={() => handleRfidInputChange('')}
                      className="absolute right-2.5 top-2.5 px-2 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>
                    <strong>USB Reader:</strong> Klik kolom di atas lalu tempelkan kartu RFID ke alat USB Reader untuk membaca nomor UID otomatis.
                  </span>
                </p>
              </div>

              {/* Format Conversions Preview (Hex & Dec) */}
              {(hexFormatted || decFormatted) && (
                <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-1.5 text-xs">
                  <div className="text-[10px] font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Konversi Format Kartu Otomatis</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      <span className="text-[10px] text-slate-400 block">Hexadecimal (Hex):</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {hexFormatted || '-'}
                      </span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      <span className="text-[10px] text-slate-400 block">Decimal (Dec):</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {decFormatted || '-'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Sistem otomatis mengenali kartu ini baik saat dipindai reader USB bertipe Hex maupun Dec.
                  </p>
                </div>
              )}

              {/* Conflict / Occupancy Warning */}
              {rfidConflict && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl space-y-1.5 text-xs text-amber-950 dark:text-amber-200 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Perhatian: Kartu Sedang Dipakai!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Kartu UID <strong>[{rfidInputVal}]</strong> saat ini sedang ditautkan ke{' '}
                    <strong>
                      {rfidConflict.type === 'siswa' ? rfidConflict.student?.nama : rfidConflict.teacher?.nama}
                    </strong>{' '}
                    ({rfidConflict.type === 'siswa' ? `Siswa Kelas ${rfidConflict.student?.kelas}` : `Guru - ${rfidConflict.teacher?.jabatan}`}).
                  </p>
                  <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/50 p-2 rounded-lg">
                    ⚡ Jika Anda melanjutkan penyimpanan, kepemilikan kartu RFID ini akan otomatis dialihkan secara eksklusif ke <strong>{rfidBindStudent.nama}</strong>.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                {rfidBindStudent.rfid_uid ? (
                  <button
                    type="button"
                    onClick={handleUnbindRfid}
                    className="px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl transition-all cursor-pointer"
                  >
                    Lepas Tautan Kartu
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRfidBindStudent(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!rfidInputVal.trim()}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    <span>Tautkan Kartu RFID</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Printable QR Card Preview */}
      {qrModalStudent && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 overflow-y-auto"
          onClick={() => setQrModalStudent(null)}
        >
          {/* Floating close button on backdrop */}
          <button
            onClick={() => setQrModalStudent(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center transition-colors shadow-lg border border-slate-700 cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Size Selector Bar */}
          <div
            className="mb-3 bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center gap-2 print:hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CreditCard className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-300">Ukuran Kartu:</span>
            <select
              value={cardSize}
              onChange={(e) => setCardSize(e.target.value as CardSizeOption)}
              className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="CR80">CR80 Standar (53.98 x 85.60 mm / KTP/ATM)</option>
              <option value="B2">Plastik B2 (70 x 100 mm / 7 x 10 cm)</option>
              <option value="B1">Plastik B1 (55 x 90 mm / 5,5 x 9 cm)</option>
            </select>
          </div>

          {/* ID Badge Card */}
          <div
            id="printable-card"
            onClick={(e) => {
              e.stopPropagation();
              printElement(
                'printable-card',
                `Kartu Presensi - ${qrModalStudent.nama}`,
                activeConfig.widthMM,
                activeConfig.heightMM
              );
            }}
            style={{
              width: `${activeConfig.widthMM}mm`,
              height: `${activeConfig.heightMM}mm`,
              minWidth: `${activeConfig.widthMM}mm`,
              minHeight: `${activeConfig.heightMM}mm`,
              maxWidth: `${activeConfig.widthMM}mm`,
              maxHeight: `${activeConfig.heightMM}mm`,
            }}
            className={`bg-gradient-to-b from-blue-950 via-blue-900 to-slate-950 text-white rounded-2xl ${activeConfig.paddingClass} shadow-2xl relative overflow-hidden text-center cursor-pointer hover:scale-[1.01] transition-transform border border-blue-800/60 flex flex-col justify-between`}
            title={`Klik untuk mencetak Kartu QR ${activeConfig.name}`}
          >
            {/* Badge Indicator */}
            <div className="text-center print:hidden mb-0.5">
              <span className="text-[7.5px] font-bold text-cyan-300 uppercase tracking-widest bg-blue-950/90 px-2 py-0.5 rounded-full border border-cyan-800/60">
                {activeConfig.badge}
              </span>
            </div>

            {/* Header: Logo Sekolah di bagian atas QR Code */}
            <div className="flex flex-col items-center mb-1 pb-1 border-b border-blue-800/80">
              <SchoolLogo className={`${activeConfig.logoSize} drop-shadow-md mb-0.5`} />
              <h3 className={`${activeConfig.headerTitleClass} font-black uppercase tracking-wider text-white leading-tight`}>
                SMA NEGERI 15 AMBON
              </h3>
              <p className={`${activeConfig.headerSubClass} font-bold text-cyan-300 uppercase tracking-widest mt-0.5`}>
                KARTU PRESENSI DIGITAL SISWA
              </p>
            </div>

            {/* QR Code */}
            <div className="bg-white p-1.5 rounded-xl inline-block shadow-lg my-0.5 mx-auto">
              <QRCodeSVG
                value={`69933068.${qrModalStudent.nisn}.${qrModalStudent.nama}`}
                size={activeConfig.qrSize}
                level="H"
                includeMargin={false}
                fgColor="#000000"
                bgColor="#ffffff"
                className="rounded-lg"
              />
            </div>

            {/* Footer: Identitas Pemilik QR Code */}
            <div className="mt-1 pt-1.5 border-t border-blue-800/80 space-y-0.5">
              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest block">
                IDENTITAS PEMILIK KARTU
              </span>
              <h4 className={`font-black ${activeConfig.nameClass} text-white uppercase tracking-tight line-clamp-1`}>
                {qrModalStudent.nama}
              </h4>
              <div className="flex items-center justify-center gap-1 pt-0.5">
                <span className={`bg-blue-800/80 text-blue-200 ${activeConfig.badgeClass} font-mono font-bold px-1.5 py-0.5 rounded-full border border-blue-700/60`}>
                  NISN: {qrModalStudent.nisn}
                </span>
                <span className={`bg-cyan-900/80 text-cyan-200 ${activeConfig.badgeClass} font-bold px-1.5 py-0.5 rounded-full border border-cyan-700/60`}>
                  KELAS {qrModalStudent.kelas}
                </span>
              </div>
            </div>
          </div>

          {/* Action Print Buttons */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 print:hidden" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                printElement(
                  'printable-card',
                  `Kartu Presensi - ${qrModalStudent.nama}`,
                  activeConfig.widthMM,
                  activeConfig.heightMM
                );
              }}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-cyan-400/30"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu Sekarang ({activeConfig.badge})</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <span>Cetak Standar Browser</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 font-medium select-none">
            Klik kartu atau tombol "Cetak Kartu Sekarang" di atas • Klik di luar kartu untuk menutup
          </p>
        </div>
      )}

      {/* Modal Batch Move (Mutasi Kelas Massal) */}
      {isBatchMoveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden transition-colors">
            <div className="bg-amber-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Mutasi Kelas {selectedIds.length} Siswa
              </h3>
              <button onClick={() => setIsBatchMoveModalOpen(false)} className="text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-700 dark:text-amber-300">
                <p className="font-bold">Info Pembaruan Massal:</p>
                <p className="mt-1">
                  Anda akan mengubah data kelas untuk <strong>{selectedIds.length} siswa</strong> yang Anda centang secara bersamaan. Sangat berguna untuk kenaikan kelas atau pemindahan kelas paralel.
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
                  Pilih Kelas Tujuan
                </label>
                <select
                  value={batchTargetClass}
                  onChange={(e) => setBatchTargetClass(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="">-- Pilih Kelas Tujuan --</option>
                  {classOptions.map((cls) => (
                    <option key={cls.name} value={cls.name}>
                      {cls.name} ({cls.count} siswa)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => setIsBatchMoveModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmBatchMove}
                disabled={!batchTargetClass}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-2 text-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Batch Delete (Admin Only) */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden transition-colors">
            <div className="bg-red-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Hapus {selectedIds.length} Data Siswa Terpilih
              </h3>
              <button onClick={() => setIsBatchDeleteModalOpen(false)} className="text-red-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
                <p className="font-bold">⚠️ Perhatian Admin:</p>
                <p className="mt-1">
                  Anda akan menghapus <strong>{selectedIds.length} data siswa</strong> yang Anda centang secara bersamaan. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {selectedIds.length} Siswa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clear All Database (Admin Only) */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden transition-colors">
            <div className="bg-red-700 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Hapus & Kosongkan Seluruh Database Siswa
              </h3>
              <button onClick={() => setIsClearAllModalOpen(false)} className="text-red-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
              <div className="p-3.5 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 space-y-1.5">
                <p className="font-bold flex items-center gap-1 text-red-800 dark:text-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> PERINGATAN HAPUS TOTAL DATA:
                </p>
                <p>
                  Sistem akan secara otomatis <strong>menghapus keseluruhan {students.length} data siswa</strong> yang tersimpan di database saat ini.
                </p>
                <p className="text-[11px] font-semibold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/60 p-2 rounded-lg border border-red-300 dark:border-red-800">
                  💡 <strong>Tujuan:</strong> Mengosongkan database sepenuhnya agar Anda dapat melakukan <u>import ulang data siswa dari file Excel tanpa ada risiko tercatat ganda / duplikat</u>.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClearAllModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-md transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus & Kosongkan Database Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Data Siswa dari Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden transition-colors flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Import Data Siswa dari Template Excel / CSV
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">Unggah berkas Excel berisi data siswa untuk dimasukkan otomatis ke database.</p>
              </div>
              <button onClick={resetImportModal} className="text-emerald-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
              {/* Quick Delete Alert inside Import Modal if students already exist */}
              {students.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Trash2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950 dark:text-amber-100">Database Saat Ini: {students.length} Siswa Terdaftar</p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                        Ingin meng-import ulang seluruh siswa dari awal agar tidak tercatat ganda? Anda dapat menghapus semua siswa saat ini terlebih dahulu.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const count = students.length;
                      store.deleteAllStudents();
                      toast.success('Database Dikosongkan', `Berhasil menghapus ${count} data siswa untuk persiapan import.`);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg transition-all shrink-0 shadow-sm flex items-center gap-1.5 border border-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan DB Sekarang</span>
                  </button>
                </div>
              )}

              {/* Step 1: Unduh Template */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    Langkah 1: Unduh Format Template Excel (.xlsx)
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Template Excel hanya memerlukan kolom: <code>Nama</code>, <code>NISN</code>, dan <code>Kelas</code>.
                  </p>
                </div>
                <button
                  onClick={downloadStudentImportTemplate}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template .xlsx</span>
                </button>
              </div>

              {/* Automatic QR Generation Info Badge */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">✨ Auto-Generate Kode QR Presensi:</p>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300">
                    Sistem akan secara otomatis membuat <strong>ID QR presensi</strong> untuk setiap siswa saat import dengan format NPSN resmi: <code>69933068.[NISN].[NAMA]</code> yang langsung dapat dicetak dan dipindai.
                  </p>
                </div>
              </div>

              {/* Step 2: Upload File */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  Langkah 2: Pilih File Excel (.xlsx / .xls / .csv)
                </h4>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/40"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  {importFile ? (
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{importFile.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{(importFile.size / 1024).toFixed(1)} KB • Klik untuk ganti file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">Klik di sini untuk memilih file Excel</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Mendukung format .xlsx, .xls, dan .csv</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parsing State */}
              {isParsing && (
                <div className="p-4 text-center text-slate-500 font-medium animate-pulse">
                  Membaca dan memvalidasi file Excel...
                </div>
              )}

              {/* Import Options & Preview */}
              {importPreview.length > 0 && !isParsing && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Pratinjau Data ({importPreview.length} Siswa Valid Dari {importTotalRows} Baris)
                    </h4>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Mode Import:</label>
                      <select
                        value={importMode}
                        onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                        className="px-2 py-1 text-[11px] border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg font-bold"
                      >
                        <option value="replace">Ganti Total DB (Hapus Data Lama & Ganti Baru)</option>
                        <option value="append">Tambah / Gabung ke DB Saat Ini ({students.length} Siswa)</option>
                      </select>
                    </div>
                  </div>

                  {/* Errors warning */}
                  {importErrors.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Catatan Baris Dilewati ({importErrors.length}):
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 max-h-20 overflow-y-auto">
                        {importErrors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">No</th>
                          <th className="p-2">Nama</th>
                          <th className="p-2">NISN</th>
                          <th className="p-2">Kelas</th>
                          <th className="p-2">ID QR Auto-Generated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2 text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-bold">{item.nama}</td>
                            <td className="p-2 font-mono">{item.nisn}</td>
                            <td className="p-2 font-semibold">{item.kelas}</td>
                            <td className="p-2 font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/40 px-2 py-0.5 rounded w-max">
                              {item.id_qr}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetImportModal}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan & Import {importPreview.length} Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mass Card Print Preview */}
      {isMassPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-5xl w-full h-[92vh] flex flex-col overflow-hidden text-white">
            {/* Modal Header */}
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-600/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    Cetak Kartu Presensi Digital QR (Masal)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total {massPrintSelectedIds.length} dari {students.length} kartu terpilih untuk dicetak ({activeConfig.name}).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() =>
                    printElement(
                      'printable-mass-cards',
                      'Cetak Kartu Presensi Masal',
                      activeConfig.widthMM,
                      activeConfig.heightMM
                    )
                  }
                  disabled={massPrintSelectedIds.length === 0}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak {massPrintSelectedIds.length} Kartu Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={massPrintSelectedIds.length === 0}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  title="Cetak langsung melalui dialog browser"
                >
                  Cetak Standar
                </button>
                <button
                  type="button"
                  onClick={() => setIsMassPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Controls Bar inside Modal */}
            <div className="bg-slate-900/90 p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                    Ukuran:
                  </span>
                  <select
                    value={cardSize}
                    onChange={(e) => setCardSize(e.target.value as CardSizeOption)}
                    className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="CR80">CR80 Standar (53.98 x 85.60 mm)</option>
                    <option value="B2">Plastik B2 (70 x 100 mm)</option>
                    <option value="B1">Plastik B1 (55 x 90 mm)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Sisi Kartu:</span>
                  <select
                    value={massPrintSide}
                    onChange={(e) => setMassPrintSide(e.target.value as 'both' | 'front' | 'back')}
                    className="bg-slate-800 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="both">Depan &amp; Belakang</option>
                    <option value="front">Hanya Depan</option>
                    <option value="back">Hanya Belakang</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Kelas:</span>
                  <select
                    value={massPrintKelasFilter}
                    onChange={(e) => {
                      const newKelas = e.target.value;
                      setMassPrintKelasFilter(newKelas);
                      // Auto select students in this class
                      const matching = students.filter(
                        (s) => newKelas === 'Semua' || s.kelas === newKelas
                      );
                      setMassPrintSelectedIds(matching.map((s) => s.id));
                    }}
                    className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="Semua">Semua Kelas ({students.length})</option>
                    {Array.from(new Set(students.map((s) => s.kelas)))
                      .sort()
                      .map((k) => (
                        <option key={k} value={k}>
                          Kelas {k} ({students.filter((s) => s.kelas === k).length})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={massPrintSearch}
                    onChange={(e) => setMassPrintSearch(e.target.value)}
                    placeholder="Cari nama / NISN..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const visibleIds = students
                      .filter((s) => {
                        const matchK = massPrintKelasFilter === 'Semua' || s.kelas === massPrintKelasFilter;
                        const matchS =
                          !massPrintSearch ||
                          s.nama.toLowerCase().includes(massPrintSearch.toLowerCase()) ||
                          s.nisn.includes(massPrintSearch);
                        return matchK && matchS;
                      })
                      .map((s) => s.id);
                    setMassPrintSelectedIds(visibleIds);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700 cursor-pointer"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setMassPrintSelectedIds([])}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700 cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            {/* Cards Grid Preview Area */}
            <div className="p-4 overflow-y-auto flex-1 bg-slate-950">
              <div
                id="printable-mass-cards"
                className="flex flex-wrap justify-center gap-3"
              >
                {students
                  .filter((s) => {
                    const matchK = massPrintKelasFilter === 'Semua' || s.kelas === massPrintKelasFilter;
                    const matchS =
                      !massPrintSearch ||
                      s.nama.toLowerCase().includes(massPrintSearch.toLowerCase()) ||
                      s.nisn.includes(massPrintSearch);
                    return matchK && matchS;
                  })
                  .map((student) => {
                    const isSelected = massPrintSelectedIds.includes(student.id);

                    return (
                      <React.Fragment key={student.id}>
                        {/* FRONT SIDE CARD */}
                        {(massPrintSide === 'both' || massPrintSide === 'front') && (
                          <OfficialStudentIDCardFront
                            nama={student.nama}
                            nisn={student.nisn}
                            kelas={student.kelas}
                            isSelected={isSelected}
                            showCheckbox={true}
                            onClick={() => {
                              if (isSelected) {
                                setMassPrintSelectedIds(massPrintSelectedIds.filter((id) => id !== student.id));
                              } else {
                                setMassPrintSelectedIds([...massPrintSelectedIds, student.id]);
                              }
                            }}
                            className="cursor-pointer"
                          />
                        )}

                        {/* BACK SIDE CARD */}
                        {(massPrintSide === 'both' || massPrintSide === 'back') && (
                          <OfficialStudentIDCardBack
                            isSelected={isSelected}
                            showCheckbox={true}
                            onClick={() => {
                              if (isSelected) {
                                setMassPrintSelectedIds(massPrintSelectedIds.filter((id) => id !== student.id));
                              } else {
                                setMassPrintSelectedIds([...massPrintSelectedIds, student.id]);
                              }
                            }}
                            className="cursor-pointer"
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
