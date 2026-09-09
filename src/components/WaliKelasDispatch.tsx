import React, { useState, useMemo } from 'react';
import {
  Send,
  MessageSquare,
  Phone,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Printer,
  Download,
  Search,
  Filter,
  Settings,
  Calendar,
  User,
  Users,
  FileText,
  FileSpreadsheet,
  ChevronRight,
  RefreshCw,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  Plus,
  X,
  Building2,
  CheckCircle,
  Eye,
  Info,
  ChevronDown,
} from 'lucide-react';
import { Student, Teacher, ProblematicStudentDispatch, SchoolSettings, AttendanceRecord } from '../types';
import { store } from '../lib/store';
import { toast } from '../lib/toast';
import {
  getWhatsAppLink,
  formatWhatsAppNumber,
  exportProblematicStudentsToExcel,
  exportProblematicStudentsToPDF,
  formatIndoMonth,
} from '../lib/exportUtils';

interface WaliKelasDispatchProps {
  students: Student[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
  currentUserRole?: string;
}

export const WaliKelasDispatch: React.FC<WaliKelasDispatchProps> = ({
  students,
  teachers,
  attendance,
  settings,
  currentUserRole = 'Admin',
}) => {
  // Tabs: 'alerts' | 'batch' | 'history' | 'mapping' | 'settings'
  const [activeTab, setActiveTab] = useState<'alerts' | 'batch' | 'history' | 'mapping' | 'settings'>('alerts');

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('Semua Kelas');
  const [selectedMonth, setSelectedMonth] = useState<string>('Semua');
  const [selectedRisk, setSelectedRisk] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIssueType, setSelectedIssueType] = useState<'all' | 'alpa' | 'terlambat' | 'rate'>('all');

  // Interactive Modals State
  const [selectedItemForDispatch, setSelectedItemForDispatch] = useState<any | null>(null);
  const [customNote, setCustomNote] = useState<string>('');
  const [customRecipientPhone, setCustomRecipientPhone] = useState<string>('');
  const [customRecipientName, setCustomRecipientName] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Batch Send State
  const [selectedBatchClass, setSelectedBatchClass] = useState<string>('');
  const [batchModalOpen, setBatchModalOpen] = useState<boolean>(false);

  // Print Slip State
  const [printSlipItem, setPrintSlipItem] = useState<any | null>(null);

  // Follow-up status update modal
  const [selectedDispatchForFollowUp, setSelectedDispatchForFollowUp] = useState<ProblematicStudentDispatch | null>(null);
  const [followUpStatus, setFollowUpStatus] = useState<ProblematicStudentDispatch['status']>('Menunggu Tindak Lanjut');
  const [followUpNotes, setFollowUpNotes] = useState<string>('');

  // Mapping Edit State
  const [editingMappingClass, setEditingMappingClass] = useState<string | null>(null);
  const [mappingTeacherNip, setMappingTeacherNip] = useState<string>('');
  const [mappingTeacherName, setMappingTeacherName] = useState<string>('');
  const [mappingPhone, setMappingPhone] = useState<string>('');

  // Template & Thresholds settings state
  const [tempTemplate, setTempTemplate] = useState<string>(settings.waTemplateWaliKelas || '');
  const [tempAlpaThreshold, setTempAlpaThreshold] = useState<number>(settings.problemThresholdAlpa || 2);
  const [tempTerlambatThreshold, setTempTerlambatThreshold] = useState<number>(settings.problemThresholdTerlambat || 3);
  const [tempMinRateThreshold, setTempMinRateThreshold] = useState<number>(settings.problemThresholdMinRate || 75);

  // Get available classes from student data and teacher assignments
  const allClasses = useMemo(() => {
    const classSet = new Set<string>();
    students.forEach((s) => {
      if (s.kelas && s.kelas.trim()) classSet.add(s.kelas.trim());
    });
    teachers.forEach((t) => {
      if (t.wali_kelas && t.wali_kelas.trim()) classSet.add(t.wali_kelas.trim());
    });
    const arr = Array.from(classSet);
    arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return arr.length > 0 ? arr : ['X-1', 'X-2', 'XI IPA 1', 'XI IPA 2', 'XI IPS 1', 'XI IPS 2', 'XII MIPA 1', 'XII MIPA 2'];
  }, [students, teachers]);

  // Available months from attendance logs
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    attendance.forEach((a) => {
      if (a.tanggal && a.tanggal.length >= 7) {
        monthsSet.add(a.tanggal.slice(0, 7));
      }
    });
    const currentM = new Date().toISOString().slice(0, 7);
    monthsSet.add(currentM);
    return Array.from(monthsSet).sort().reverse();
  }, [attendance]);

  // Compute problematic students analysis
  const problematicList = useMemo(() => {
    return store.getProblematicStudentsAnalysis({
      kelas: selectedClass === 'Semua Kelas' ? undefined : selectedClass,
      bulan: selectedMonth === 'Semua' ? undefined : selectedMonth,
      riskLevel: selectedRisk,
      searchQuery: searchQuery,
      minAlpa: tempAlpaThreshold,
      minTerlambat: tempTerlambatThreshold,
      maxAttendanceRate: tempMinRateThreshold,
    });
  }, [selectedClass, selectedMonth, selectedRisk, searchQuery, tempAlpaThreshold, tempTerlambatThreshold, tempMinRateThreshold, students, attendance, teachers, settings]);

  // Filter by issue type
  const filteredList = useMemo(() => {
    if (selectedIssueType === 'all') return problematicList;
    if (selectedIssueType === 'alpa') return problematicList.filter((p) => p.alpaCount >= tempAlpaThreshold);
    if (selectedIssueType === 'terlambat') return problematicList.filter((p) => p.terlambatCount >= tempTerlambatThreshold);
    if (selectedIssueType === 'rate') return problematicList.filter((p) => p.attendanceRate < tempMinRateThreshold);
    return problematicList;
  }, [problematicList, selectedIssueType, tempAlpaThreshold, tempTerlambatThreshold, tempMinRateThreshold]);

  // Dispatches history
  const dispatchesHistory = useMemo(() => {
    return store.getDispatches();
  }, [store.getDispatches()]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const tinggi = problematicList.filter((p) => p.riskLevel === 'Tinggi').length;
    const sedang = problematicList.filter((p) => p.riskLevel === 'Sedang').length;
    const perhatian = problematicList.filter((p) => p.riskLevel === 'Perhatian').length;
    const dispatchesCount = dispatchesHistory.length;
    const completedCount = dispatchesHistory.filter((d) => d.status === 'Selesai / Ditangani').length;
    return { tinggi, sedang, perhatian, total: problematicList.length, dispatchesCount, completedCount };
  }, [problematicList, dispatchesHistory]);

  // Classes with problematic count breakdown
  const classBreakdown = useMemo(() => {
    const map = new Map<string, typeof problematicList>();
    problematicList.forEach((item) => {
      const cls = item.student.kelas || 'Lainnya';
      if (!map.has(cls)) map.set(cls, []);
      map.get(cls)!.push(item);
    });
    return map;
  }, [problematicList]);

  // Open individual dispatch modal
  const handleOpenDispatchModal = (item: any) => {
    setSelectedItemForDispatch(item);
    setCustomNote('');
    setCustomRecipientName(item.waliKelas.name || '');
    setCustomRecipientPhone(item.waliKelas.phone || '');
    setCopied(false);
  };

  // Generate WhatsApp message preview for individual student
  const previewWaMessage = useMemo(() => {
    if (!selectedItemForDispatch) return '';
    return store.generateWaliKelasWhatsAppMessage(
      selectedItemForDispatch.student,
      {
        alpaCount: selectedItemForDispatch.alpaCount,
        terlambatCount: selectedItemForDispatch.terlambatCount,
        sakitCount: selectedItemForDispatch.sakitCount,
        izinCount: selectedItemForDispatch.izinCount,
        attendanceRate: selectedItemForDispatch.attendanceRate,
        reasons: selectedItemForDispatch.reasons,
        notes: customNote,
        aiRecommendation: selectedItemForDispatch.aiRecommendation,
        datesWithIssues: selectedItemForDispatch.datesWithIssues,
      },
      customRecipientName || selectedItemForDispatch.waliKelas.name
    );
  }, [selectedItemForDispatch, customNote, customRecipientName]);

  // Execute Individual WhatsApp Dispatch
  const handleSendIndividualWhatsApp = () => {
    if (!selectedItemForDispatch) return;

    const phoneToUse = customRecipientPhone.trim() || selectedItemForDispatch.waliKelas.phone || '';
    if (!phoneToUse) {
      toast.warning(
        'Nomor WhatsApp Belum Ada',
        `Silakan masukkan nomor HP/WhatsApp Wali Kelas (${customRecipientName || selectedItemForDispatch.waliKelas.name}) terlebih dahulu.`
      );
      return;
    }

    const message = previewWaMessage;
    const waUrl = getWhatsAppLink(phoneToUse, message);

    if (!waUrl) {
      toast.error('Format Nomor Tidak Valid', 'Nomor telepon tidak valid untuk WhatsApp.');
      return;
    }

    // Record dispatch in store
    store.addDispatch({
      studentId: selectedItemForDispatch.student.id,
      studentName: selectedItemForDispatch.student.nama,
      nisn: selectedItemForDispatch.student.nisn,
      kelas: selectedItemForDispatch.student.kelas,
      waliKelasName: customRecipientName || selectedItemForDispatch.waliKelas.name,
      waliKelasPhone: phoneToUse,
      waliKelasNip: selectedItemForDispatch.waliKelas.nip,
      riskLevel: selectedItemForDispatch.riskLevel,
      alpaCount: selectedItemForDispatch.alpaCount,
      terlambatCount: selectedItemForDispatch.terlambatCount,
      sakitCount: selectedItemForDispatch.sakitCount,
      izinCount: selectedItemForDispatch.izinCount,
      attendanceRate: selectedItemForDispatch.attendanceRate,
      reasons: selectedItemForDispatch.reasons,
      notes: customNote,
      aiRecommendation: selectedItemForDispatch.aiRecommendation,
      dispatchedBy: store.getCurrentUser()?.name || 'Admin',
      channel: 'WhatsApp',
      status: 'Terkirim',
    });

    // If homeroom phone was updated manually in modal, optionally save to mapping
    if (customRecipientPhone && customRecipientPhone !== selectedItemForDispatch.waliKelas.phone) {
      store.setHomeroomAssignment(selectedItemForDispatch.student.kelas, {
        teacherName: customRecipientName || selectedItemForDispatch.waliKelas.name,
        teacherNip: selectedItemForDispatch.waliKelas.nip,
        phone: customRecipientPhone,
      });
    }

    toast.success(
      'Disposisi WhatsApp Disiapkan',
      `Membuka WhatsApp untuk mengirim data ${selectedItemForDispatch.student.nama} ke Wali Kelas ${customRecipientName || selectedItemForDispatch.waliKelas.name}.`
    );

    // Open WhatsApp
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setSelectedItemForDispatch(null);
  };

  // Copy message text
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Pesan Disalin', 'Teks laporan siswa berhasil disalin ke clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  // Open Batch Send Modal for a Class
  const handleOpenBatchModal = (kelas: string) => {
    setSelectedBatchClass(kelas);
    const wali = store.getHomeroomTeacherForClass(kelas);
    setCustomRecipientName(wali.name);
    setCustomRecipientPhone(wali.phone || '');
    setBatchModalOpen(true);
  };

  // Batch WhatsApp Message Preview
  const batchStudents = useMemo(() => {
    if (!selectedBatchClass) return [];
    return problematicList.filter((item) => item.student.kelas === selectedBatchClass);
  }, [selectedBatchClass, problematicList]);

  const batchWaMessage = useMemo(() => {
    if (!selectedBatchClass || batchStudents.length === 0) return '';
    return store.generateClassBatchWaliKelasWhatsAppMessage(
      selectedBatchClass,
      batchStudents.map((item) => ({
        student: item.student,
        alpaCount: item.alpaCount,
        terlambatCount: item.terlambatCount,
        sakitCount: item.sakitCount,
        izinCount: item.izinCount,
        attendanceRate: item.attendanceRate,
        riskLevel: item.riskLevel,
        reasons: item.reasons,
      })),
      customRecipientName
    );
  }, [selectedBatchClass, batchStudents, customRecipientName]);

  // Execute Batch WhatsApp Dispatch
  const handleSendBatchWhatsApp = () => {
    if (!selectedBatchClass || batchStudents.length === 0) return;

    const phoneToUse = customRecipientPhone.trim();
    if (!phoneToUse) {
      toast.warning('Nomor WhatsApp Belum Ada', `Silakan isi nomor HP/WhatsApp Wali Kelas ${selectedBatchClass} terlebih dahulu.`);
      return;
    }

    const waUrl = getWhatsAppLink(phoneToUse, batchWaMessage);
    if (!waUrl) {
      toast.error('Nomor Tidak Valid', 'Format nomor telepon tidak sesuai.');
      return;
    }

    // Record dispatches for all students in batch
    batchStudents.forEach((item) => {
      store.addDispatch({
        studentId: item.student.id,
        studentName: item.student.nama,
        nisn: item.student.nisn,
        kelas: item.student.kelas,
        waliKelasName: customRecipientName,
        waliKelasPhone: phoneToUse,
        waliKelasNip: item.waliKelas.nip,
        riskLevel: item.riskLevel,
        alpaCount: item.alpaCount,
        terlambatCount: item.terlambatCount,
        sakitCount: item.sakitCount,
        izinCount: item.izinCount,
        attendanceRate: item.attendanceRate,
        reasons: item.reasons,
        notes: `Disposisi Kolektif Kelas ${selectedBatchClass} (${batchStudents.length} Siswa)`,
        aiRecommendation: item.aiRecommendation,
        dispatchedBy: store.getCurrentUser()?.name || 'Admin',
        channel: 'WhatsApp',
        status: 'Terkirim',
      });
    });

    toast.success(
      'Rekap Kelas Terkirim',
      `Membuka WhatsApp ke Wali Kelas ${selectedBatchClass} (${batchStudents.length} data siswa bermasalah).`
    );

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setBatchModalOpen(false);
  };

  // Open Direct WhatsApp to Student's Parent
  const handleSendParentWhatsApp = (item: any) => {
    if (!item.student.no_hp_ortu) {
      toast.warning('Nomor Orang Tua Kosong', `Data nomor HP Orang Tua untuk ${item.student.nama} belum terdaftar di database siswa.`);
      return;
    }

    const sName = settings.schoolName || 'SMA NEGERI 15 AMBON';
    const msg = `Yth. Bapak/Ibu Orang Tua / Wali murid dari *${item.student.nama}* (Kelas ${item.student.kelas}),\n\nKami dari Tim Kedisiplinan & Bimbingan *${sName}* menyampaikan laporan presensi siswa:\n• Persentase Kehadiran: *${item.attendanceRate}%*\n• Alpa: *${item.alpaCount} hari*\n• Terlambat: *${item.terlambatCount} kali*\n• Izin/Sakit: *${item.sakitCount + item.izinCount} hari*\n\nCatatan: ${item.reasons.join(', ')}\n\nMohon kerja sama Bapak/Ibu untuk memperhatikan kehadiran dan kedisiplinan ananda di sekolah.\n\nTerima kasih.\n_${sName}_`;

    const waUrl = getWhatsAppLink(item.student.no_hp_ortu, msg);
    if (waUrl) {
      toast.success('Menghubungi Orang Tua', `Membuka WhatsApp ke Orang Tua ${item.student.nama}.`);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Print Case Disposition Slip
  const handlePrintDispositionSlip = (item: any) => {
    setPrintSlipItem(item);
    setTimeout(() => {
      const printArea = document.getElementById('printable-disposition-area');
      if (printArea) {
        const win = window.open('', '_blank', 'width=900,height=950');
        if (win) {
          win.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Lembar Disposisi Siswa - ${item.student.nama}</title>
                <meta charset="utf-8" />
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  @page { size: A4 portrait; margin: 12mm 15mm; }
                  body { font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; line-height: 1.4; }
                  .border-double-bottom { border-bottom: 3px double #000; }
                </style>
              </head>
              <body class="p-6">
                ${printArea.innerHTML}
                <script>
                  window.onload = function() { window.print(); }
                </script>
              </body>
            </html>
          `);
          win.document.close();
        } else {
          window.print();
        }
      }
    }, 150);
  };

  // Save Homeroom Mapping
  const handleSaveMapping = (kelas: string) => {
    store.setHomeroomAssignment(kelas, {
      teacherName: mappingTeacherName.trim(),
      teacherNip: mappingTeacherNip.trim(),
      phone: mappingPhone.trim(),
    });
    toast.success('Wali Kelas Disimpan', `Pemetaan Wali Kelas ${kelas} berhasil diperbarui.`);
    setEditingMappingClass(null);
  };

  // Save Settings & Template
  const handleSaveSettings = () => {
    store.updateSettings({
      waTemplateWaliKelas: tempTemplate,
      problemThresholdAlpa: Number(tempAlpaThreshold),
      problemThresholdTerlambat: Number(tempTerlambatThreshold),
      problemThresholdMinRate: Number(tempMinRateThreshold),
    });
    toast.success('Pengaturan Disimpan', 'Template pesan WhatsApp dan ambang batas deteksi masalah berhasil diperbarui.');
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      toast.info('Data Kosong', 'Tidak ada data siswa bermasalah untuk diekspor pada filter yang dipilih.');
      return;
    }
    const classLabel = selectedClass === 'Semua Kelas' ? 'Semua' : selectedClass;
    exportProblematicStudentsToExcel(
      filteredList,
      settings.schoolName || 'SMA NEGERI 15 AMBON',
      classLabel,
      selectedMonth
    );
    const monthLabel = formatIndoMonth(selectedMonth);
    const displayClass = selectedClass === 'Semua Kelas' ? 'Semua Kelas' : `Kelas ${selectedClass}`;
    toast.success('File Excel Terunduh', `Rekap ${displayClass} (${monthLabel}) berhasil diekspor (${filteredList.length} siswa).`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (filteredList.length === 0) {
      toast.info('Data Kosong', 'Tidak ada data siswa bermasalah untuk diekspor pada filter yang dipilih.');
      return;
    }
    const classLabel = selectedClass === 'Semua Kelas' ? 'Semua' : selectedClass;
    exportProblematicStudentsToPDF(
      filteredList,
      settings.schoolName || 'SMA NEGERI 15 AMBON',
      classLabel,
      selectedMonth
    );
    const monthLabel = formatIndoMonth(selectedMonth);
    const displayClass = selectedClass === 'Semua Kelas' ? 'Semua Kelas' : `Kelas ${selectedClass}`;
    toast.success('Dokumen PDF Terunduh', `Dokumen PDF resmi ${displayClass} (${monthLabel}) berhasil dicetak (${filteredList.length} siswa).`);
  };

  return (
    <div className="space-y-6 pb-12" id="wali-kelas-dispatch-root">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Layanan Disposisi & Pembinaan
              </span>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-medium">
                {settings.schoolName || 'SMA Negeri 15 Ambon'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <UserCheck className="w-8 h-8 text-blue-400" />
              Disposisi Siswa Bermasalah ke Wali Kelas
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Otomatisasi pengiriman laporan dan notifikasi data siswa butuh perhatian (sering alpa, terlambat, atau kehadiran rendah) langsung ke WhatsApp Wali Kelas masing-masing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              id="btn-export-problematic-excel"
              className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 rounded-xl text-xs font-semibold backdrop-blur-sm border border-emerald-500/30 transition-all flex items-center gap-2 shadow-sm"
              title="Unduh rekap siswa bermasalah format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              id="btn-export-problematic-pdf"
              className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 rounded-xl text-xs font-semibold backdrop-blur-sm border border-rose-500/30 transition-all flex items-center gap-2 shadow-sm"
              title="Unduh rekap siswa bermasalah format PDF resmi berkop surat"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              Export PDF (Resmi)
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              id="btn-nav-batch-send"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              Kirim Rekap Kelas
            </button>
          </div>
        </div>

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-black/25 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{metrics.tinggi}</div>
              <div className="text-xs text-rose-300">Risiko Tinggi (SP)</div>
            </div>
          </div>

          <div className="bg-black/25 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{metrics.sedang}</div>
              <div className="text-xs text-amber-300">Perlu Perhatian</div>
            </div>
          </div>

          <div className="bg-black/25 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{metrics.perhatian}</div>
              <div className="text-xs text-blue-300">Pemantauan</div>
            </div>
          </div>

          <div className="bg-black/25 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{metrics.dispatchesCount}</div>
              <div className="text-xs text-emerald-300">Disposisi Terkirim</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('alerts')}
            id="tab-btn-alerts"
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Siswa Bermasalah & Kirim WA
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'alerts' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              {filteredList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            id="tab-btn-batch"
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'batch'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Rekap Per Kelas & Batch WA
          </button>

          <button
            onClick={() => setActiveTab('history')}
            id="tab-btn-history"
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Riwayat Disposisi & Tindak Lanjut
            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px]">
              {dispatchesHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('mapping')}
            id="tab-btn-mapping"
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'mapping'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Pemetaan Wali Kelas
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            id="tab-btn-settings"
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            Pengaturan & Template
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Ambang Batas: Alpa &ge; {tempAlpaThreshold}x | Terlambat &ge; {tempTerlambatThreshold}x | Kehadiran &lt; {tempMinRateThreshold}%
        </div>
      </div>

      {/* TAB 1: SISWA BERMASALAH (INDIVIDUAL DISPATCH) */}
      {activeTab === 'alerts' && (
        <div className="space-y-5">
          {/* Filtering Controls */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, NISN, atau kelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  id="input-search-problematic"
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Month / Period Filter */}
              <div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  id="select-filter-month"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Semua">Semua Bulan (Akumulasi)</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatIndoMonth(m)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  id="select-filter-class"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Semua Kelas">Semua Kelas ({allClasses.length} Kelas)</option>
                  {allClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Risk Level Filter */}
              <div>
                <select
                  value={selectedRisk}
                  onChange={(e) => setSelectedRisk(e.target.value)}
                  id="select-filter-risk"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Semua">Semua Tingkat Risiko</option>
                  <option value="Tinggi">🔴 Risiko Tinggi (Kritis)</option>
                  <option value="Sedang">🟠 Perlu Perhatian (Sedang)</option>
                  <option value="Perhatian">🟡 Pemantauan (Ringan)</option>
                </select>
              </div>

              {/* Issue Type Quick Toggle */}
              <div>
                <select
                  value={selectedIssueType}
                  onChange={(e) => setSelectedIssueType(e.target.value as any)}
                  id="select-filter-issue-type"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="all">Semua Jenis Pelanggaran</option>
                  <option value="alpa">❌ Sering Alpa (≥ {tempAlpaThreshold}x)</option>
                  <option value="terlambat">⏰ Sering Terlambat (≥ {tempTerlambatThreshold}x)</option>
                  <option value="rate">📉 Kehadiran Rendah (&lt; {tempMinRateThreshold}%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* List of Problematic Students */}
          {filteredList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Tidak Ditemukan Siswa Bermasalah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {selectedClass !== 'Semua Kelas'
                  ? `Tidak ada siswa di kelas ${selectedClass} yang melebihi ambang batas risiko kehadiran saat ini.`
                  : 'Seluruh siswa terpantau memiliki tingkat kehadiran yang baik dan berada di atas ambang batas kedisiplinan.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredList.map((item, idx) => {
                const isHighRisk = item.riskLevel === 'Tinggi';
                const isMediumRisk = item.riskLevel === 'Sedang';
                const hasDispatch = !!item.latestDispatch;
                const hasWaliPhone = !!item.waliKelas.phone;

                return (
                  <div
                    key={item.student.id || item.student.nisn}
                    id={`student-card-${item.student.nisn}`}
                    className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all hover:shadow-md ${
                      isHighRisk
                        ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/10'
                        : isMediumRisk
                        ? 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-500/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Card Top: Student Profile & Risk Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 overflow-hidden shrink-0">
                          {item.student.foto ? (
                            <img
                              src={item.student.foto}
                              alt={item.student.nama}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm">{item.student.nama.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                              {item.student.nama}
                            </h3>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded text-[10px] font-bold">
                              {item.student.kelas}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>NISN: <strong className="text-slate-700 dark:text-slate-300">{item.student.nisn}</strong></span>
                            <span>•</span>
                            <span>Total Hari: {item.totalDays}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                            isHighRisk
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : isMediumRisk
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {isHighRisk ? 'Risiko Tinggi' : isMediumRisk ? 'Perlu Perhatian' : 'Pemantauan'}
                        </span>

                        {hasDispatch && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                            item.latestDispatch?.status === 'Selesai / Ditangani'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {item.latestDispatch?.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attendance Stats Counters */}
                    <div className="grid grid-cols-5 gap-2 my-3.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Kehadiran</div>
                        <div className={`text-xs font-extrabold ${item.attendanceRate < 75 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {item.attendanceRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Alpa</div>
                        <div className={`text-xs font-extrabold ${item.alpaCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {item.alpaCount}x
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Terlambat</div>
                        <div className={`text-xs font-extrabold ${item.terlambatCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {item.terlambatCount}x
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Sakit/Izin</div>
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {item.sakitCount + item.izinCount}x
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Tepat Waktu</div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {item.hadirCount}x
                        </div>
                      </div>
                    </div>

                    {/* Reasons & Indications */}
                    <div className="space-y-1.5 mb-3.5">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        Indikasi Masalah Terdeteksi:
                      </div>
                      <ul className="space-y-1 pl-1">
                        {item.reasons.map((r: string, rIdx: number) => (
                          <li key={rIdx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Assigned Homeroom Teacher Info */}
                    <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                            Wali Kelas {item.student.kelas}
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {item.waliKelas.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {hasWaliPhone ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                WA: {formatWhatsAppNumber(item.waliKelas.phone || '')}
                              </span>
                            ) : (
                              <span className="text-rose-500 font-medium">Nomor WA belum disetel</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('mapping');
                          setEditingMappingClass(item.student.kelas);
                          setMappingTeacherName(item.waliKelas.name);
                          setMappingTeacherNip(item.waliKelas.nip || '');
                          setMappingPhone(item.waliKelas.phone || '');
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-600 dark:text-blue-300 rounded-lg text-[10px] font-semibold border border-blue-200 dark:border-blue-800 transition-all"
                      >
                        Ubah Kontak
                      </button>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {/* Primary WhatsApp to Homeroom Teacher Button */}
                      <button
                        onClick={() => handleOpenDispatchModal(item)}
                        id={`btn-send-wa-wali-${item.student.nisn}`}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-[0.98]"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Kirim ke Wali Kelas
                      </button>

                      {/* Print Case Disposition Slip Button */}
                      <button
                        onClick={() => handlePrintDispositionSlip(item)}
                        id={`btn-print-slip-${item.student.nisn}`}
                        title="Cetak Lembar Disposisi Kasus & Surat Panggilan"
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        <span className="hidden sm:inline">Cetak Disposisi</span>
                      </button>

                      {/* WhatsApp to Parents Button */}
                      {item.student.no_hp_ortu && (
                        <button
                          onClick={() => handleSendParentWhatsApp(item)}
                          id={`btn-send-wa-parent-${item.student.nisn}`}
                          title="Hubungi Orang Tua Siswa via WhatsApp"
                          className="p-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-all flex items-center gap-1.5"
                        >
                          <Phone className="w-4 h-4 text-blue-600" />
                          <span className="hidden sm:inline">Hubungi Ortu</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REKAP PER KELAS & BATCH WA SEND */}
      {activeTab === 'batch' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Kirim Rekapitulasi Siswa Bermasalah Kolektif per Kelas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Kirimkan ringkasan lengkap seluruh siswa bermasalah di suatu kelas sekaligus ke nomor WhatsApp Wali Kelas yang bertugas hanya dengan satu kali klik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allClasses.map((cls) => {
              const studentsInClass = classBreakdown.get(cls) || [];
              const wali = store.getHomeroomTeacherForClass(cls);
              const highRiskCount = studentsInClass.filter((s) => s.riskLevel === 'Tinggi').length;
              const hasStudents = studentsInClass.length > 0;

              return (
                <div
                  key={cls}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                    hasStudents
                      ? highRiskCount > 0
                        ? 'border-rose-300 dark:border-rose-900/60 shadow-sm'
                        : 'border-amber-300 dark:border-amber-900/60 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-extrabold text-sm rounded-lg">
                        Kelas {cls}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          hasStudents
                            ? highRiskCount > 0
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {hasStudents ? `${studentsInClass.length} Siswa Butuh Pembinaan` : 'Nihil Masalah'}
                      </span>
                    </div>

                    {/* Wali Kelas Info */}
                    <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-3 space-y-1">
                      <div className="text-[10px] text-slate-400 font-medium uppercase">Wali Kelas:</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{wali.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {wali.phone ? `WA: ${formatWhatsAppNumber(wali.phone)}` : <span className="text-rose-500">Belum ada no WA</span>}
                      </div>
                    </div>

                    {/* Student Mini List */}
                    {hasStudents ? (
                      <div className="space-y-1.5 mb-4 max-h-36 overflow-y-auto pr-1">
                        {studentsInClass.map((st, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                              {st.student.nama}
                            </div>
                            <div className="text-[10px] shrink-0 font-bold">
                              {st.riskLevel === 'Tinggi' ? (
                                <span className="text-rose-600 dark:text-rose-400">🔴 Kritis ({st.alpaCount}A, {st.terlambatCount}T)</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">🟠 {st.attendanceRate}%</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 my-4 text-center italic">
                        Kehadiran kelas tertib dan aman.
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      disabled={!hasStudents}
                      onClick={() => handleOpenBatchModal(cls)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        hasStudents
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 active:scale-[0.98]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Kirim Rekap Kelas {cls} ke Wali Kelas
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RIWAYAT DISPOSISI & TRACKING LOG */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Riwayat Pengiriman Disposisi & Status Tindak Lanjut
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Catatan resmi seluruh data siswa bermasalah yang telah diteruskan ke Wali Kelas beserta perkembangan hasil pembinaannya.
              </p>
            </div>

            {dispatchesHistory.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin mengosongkan seluruh riwayat disposisi?')) {
                    store.clearDispatches();
                    toast.success('Riwayat Dibersihkan', 'Seluruh riwayat disposisi telah dihapus.');
                  }
                }}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Bersihkan Riwayat
              </button>
            )}
          </div>

          {dispatchesHistory.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Belum Ada Riwayat Disposisi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Riwayat akan otomatis tercatat setiap kali Anda mengirimkan laporan siswa bermasalah ke Wali Kelas via WhatsApp atau lembar disposisi.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5">Waktu Disposisi</th>
                      <th className="p-3.5">Nama Siswa / NISN</th>
                      <th className="p-3.5">Kelas</th>
                      <th className="p-3.5">Wali Kelas Tujuan</th>
                      <th className="p-3.5">Saluran</th>
                      <th className="p-3.5">Status Tindak Lanjut</th>
                      <th className="p-3.5">Catatan Kasus</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {dispatchesHistory.map((item) => {
                      const dateFormatted = new Date(item.dispatchedAt).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                            {dateFormatted}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">{item.studentName}</div>
                            <div className="text-[11px] text-slate-500">NISN: {item.nisn}</div>
                          </td>
                          <td className="p-3.5 font-semibold text-blue-600 dark:text-blue-400">
                            {item.kelas}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.waliKelasName}</div>
                            {item.waliKelasPhone && (
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                                {item.waliKelasPhone}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                              {item.channel}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <button
                              onClick={() => {
                                setSelectedDispatchForFollowUp(item);
                                setFollowUpStatus(item.status);
                                setFollowUpNotes(item.tindakLanjutNotes || '');
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 ${
                                item.status === 'Selesai / Ditangani'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                  : item.status === 'Menunggu Tindak Lanjut'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {item.status}
                              <Edit3 className="w-2.5 h-2.5 ml-0.5" />
                            </button>
                            {item.tindakLanjutNotes && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs italic line-clamp-1">
                                "{item.tindakLanjutNotes}"
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 max-w-xs text-[11px]">
                            {item.reasons && item.reasons.length > 0 ? (
                              <span className="line-clamp-2">{item.reasons.join(', ')}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.waliKelasPhone && (
                                <a
                                  href={`https://wa.me/${formatWhatsAppNumber(item.waliKelasPhone)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Buka Chat WhatsApp"
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  store.deleteDispatch(item.id);
                                  toast.success('Disposisi Dihapus', 'Riwayat disposisi telah dihapus.');
                                }}
                                title="Hapus Log"
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PEMETAAN WALI KELAS (HOMEROOM ASSIGNMENT) */}
      {activeTab === 'mapping' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Daftar & Pemetaan Wali Kelas per Rombongan Belajar
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tentukan guru penanggung jawab dan nomor WhatsApp resmi untuk tiap kelas agar notifikasi disposisi terkirim tepat sasaran.
              </p>
            </div>

            <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl font-medium">
              Total Rombel: {allClasses.length} Kelas
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allClasses.map((cls) => {
              const assigned = store.getHomeroomTeacherForClass(cls);
              const isEditing = editingMappingClass === cls;

              return (
                <div
                  key={cls}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-sm rounded-lg">
                        Kelas {cls}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Sumber: {assigned.source === 'teacher_db' ? 'Data Guru' : assigned.source === 'settings_map' ? 'Pemetaan Khusus' : 'Belum Ditentukan'}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Pilih dari Database Guru:
                          </label>
                          <select
                            value={mappingTeacherNip}
                            onChange={(e) => {
                              const selNip = e.target.value;
                              setMappingTeacherNip(selNip);
                              const found = teachers.find((t) => t.nip === selNip);
                              if (found) {
                                setMappingTeacherName(found.nama);
                                if (found.no_hp) setMappingPhone(found.no_hp);
                              }
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                          >
                            <option value="">-- Pilih Guru --</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.nip}>
                                {t.nama} (NIP: {t.nip})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Nama Wali Kelas:
                          </label>
                          <input
                            type="text"
                            value={mappingTeacherName}
                            onChange={(e) => setMappingTeacherName(e.target.value)}
                            placeholder="Nama Lengkap & Gelar"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Nomor WhatsApp Wali Kelas:
                          </label>
                          <input
                            type="text"
                            value={mappingPhone}
                            onChange={(e) => setMappingPhone(e.target.value)}
                            placeholder="Contoh: 081234567890"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 py-2">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl border border-blue-100 dark:border-blue-900/40">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {assigned.name}
                            </div>
                            {assigned.nip && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                NIP: {assigned.nip}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs pt-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {assigned.phone ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatWhatsAppNumber(assigned.phone)}
                            </span>
                          ) : (
                            <span className="text-rose-500 font-medium">Nomor WA belum tercatat</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-3 flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => setEditingMappingClass(null)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-medium"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleSaveMapping(cls)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
                        >
                          Simpan
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingMappingClass(cls);
                          setMappingTeacherName(assigned.name === `Wali Kelas ${cls}` ? '' : assigned.name);
                          setMappingTeacherNip(assigned.nip || '');
                          setMappingPhone(assigned.phone || '');
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Wali Kelas
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: PENGATURAN AMBANG BATAS & TEMPLATE WA */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Kriteria & Ambang Batas Deteksi Siswa Bermasalah
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Atur batasan otomatis sistem dalam menggolongkan siswa ke dalam kategori bermasalah/berisiko presensi.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Minimal Alpa (Tanpa Keterangan)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tempAlpaThreshold}
                    onChange={(e) => setTempAlpaThreshold(Math.max(1, Number(e.target.value)))}
                    className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center"
                  />
                  <span className="text-xs text-slate-500">kali / semester</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Siswa yang memiliki alpa &ge; nilai ini akan langsung ditandai berisiko.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Minimal Sering Terlambat
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={tempTerlambatThreshold}
                    onChange={(e) => setTempTerlambatThreshold(Math.max(1, Number(e.target.value)))}
                    className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center"
                  />
                  <span className="text-xs text-slate-500">kali keterlambatan</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Siswa yang terlambat masuk sekolah &ge; nilai ini akan masuk kategori perlu perhatian.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Batas Minimal Kehadiran (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="95"
                    value={tempMinRateThreshold}
                    onChange={(e) => setTempMinRateThreshold(Math.min(95, Math.max(50, Number(e.target.value))))}
                    className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center"
                  />
                  <span className="text-xs text-slate-500">% kehadiran</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Persentase kehadiran di bawah angka ini dianggap kritis (standar kelulusan).
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Format Template Pesan WhatsApp ke Wali Kelas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gunakan variabel placeholder: <code className="text-blue-600">{'{nama}'}</code>, <code className="text-blue-600">{'{nisn}'}</code>, <code className="text-blue-600">{'{kelas}'}</code>, <code className="text-blue-600">{'{wali_kelas}'}</code>, <code className="text-blue-600">{'{persentase_kehadiran}'}</code>, <code className="text-blue-600">{'{alpa}'}</code>, <code className="text-blue-600">{'{terlambat}'}</code>, <code className="text-blue-600">{'{alasan_masalah}'}</code>, <code className="text-blue-600">{'{rekomendasi}'}</code>, <code className="text-blue-600">{'{catatan_petugas}'}</code>.
                  </p>
                </div>
              </div>

              <textarea
                rows={10}
                value={tempTemplate}
                onChange={(e) => setTempTemplate(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSaveSettings}
                id="btn-save-dispatch-settings"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Simpan Seluruh Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INDIVIDUAL WHATSAPP DISPATCH PREVIEW & EDIT                      */}
      {/* ========================================================================= */}
      {selectedItemForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    Kirim Disposisi Siswa ke Wali Kelas
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Siswa: <strong>{selectedItemForDispatch.student.nama}</strong> ({selectedItemForDispatch.student.kelas})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForDispatch(null)}
                className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Recipient details */}
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Wali Kelas Tujuan:
                  </label>
                  <input
                    type="text"
                    value={customRecipientName}
                    onChange={(e) => setCustomRecipientName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nomor WhatsApp Wali Kelas:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={customRecipientPhone}
                    onChange={(e) => setCustomRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Custom Note for Homeroom Teacher */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan Tambahan / Arahan Petugas untuk Wali Kelas (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Mohon koordinasi panggilan orang tua pada hari Kamis..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              {/* WhatsApp Message Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    Pratinjau Pesan WhatsApp Otomatis:
                  </label>
                  <button
                    onClick={() => handleCopyMessage(previewWaMessage)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Tersalin' : 'Salin Pesan'}
                  </button>
                </div>
                <div className="bg-emerald-950/10 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-500/20 text-slate-800 dark:text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {previewWaMessage}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedItemForDispatch(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyMessage(previewWaMessage)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Salin Teks
                </button>
                <button
                  onClick={handleSendIndividualWhatsApp}
                  id="btn-execute-send-wa"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim via WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BATCH CLASS REKAP WHATSAPP DISPATCH PREVIEW                      */}
      {/* ========================================================================= */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    Kirim Rekapitulasi Kelas {selectedBatchClass} ke Wali Kelas
                  </h3>
                  <p className="text-xs text-blue-100">
                    Total: {batchStudents.length} siswa bermasalah terangkum dalam 1 pesan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Wali Kelas {selectedBatchClass}:
                  </label>
                  <input
                    type="text"
                    value={customRecipientName}
                    onChange={(e) => setCustomRecipientName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nomor WhatsApp:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={customRecipientPhone}
                    onChange={(e) => setCustomRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    Pratinjau Pesan Rekap Kolektif:
                  </label>
                  <button
                    onClick={() => handleCopyMessage(batchWaMessage)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Tersalin' : 'Salin Pesan'}
                  </button>
                </div>
                <div className="bg-blue-950/10 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-500/20 text-slate-800 dark:text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {batchWaMessage}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <button
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>

              <button
                onClick={handleSendBatchWhatsApp}
                id="btn-execute-batch-send-wa"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Kirim Rekap ke WhatsApp Wali Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: FOLLOW-UP STATUS UPDATE MODAL                                    */}
      {/* ========================================================================= */}
      {selectedDispatchForFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Update Status Tindak Lanjut Siswa
              </h3>
              <button
                onClick={() => setSelectedDispatchForFollowUp(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Siswa:</span>{' '}
                <strong className="text-slate-800 dark:text-slate-200">{selectedDispatchForFollowUp.studentName}</strong> ({selectedDispatchForFollowUp.kelas})
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Status Penanganan Kasus:
                </label>
                <select
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="Terkirim">Terkirim (Menunggu Respon Wali Kelas)</option>
                  <option value="Menunggu Tindak Lanjut">Menunggu Tindak Lanjut (Sedang Diproses)</option>
                  <option value="Selesai / Ditangani">Selesai / Ditangani (Orang Tua Hadir / Sudah Dibina)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan Tindak Lanjut / Hasil Pembinaan:
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Orang tua sudah hadir di sekolah tanggal 15 Juli 2026 dan menandatangani surat perjanjian..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedDispatchForFollowUp(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  store.updateDispatchStatus(selectedDispatchForFollowUp.id, followUpStatus, followUpNotes);
                  toast.success('Status Diperbarui', 'Status tindak lanjut disposisi berhasil disimpan.');
                  setSelectedDispatchForFollowUp(null);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIDDEN PRINTABLE CASE DISPOSITION SHEET (A4 STANDARD FORMAT)              */}
      {/* ========================================================================= */}
      <div id="printable-disposition-area" className="hidden">
        {printSlipItem && (
          <div className="max-w-3xl mx-auto p-4 text-black bg-white">
            {/* Header Kop Surat */}
            <div className="text-center pb-3 mb-4 border-b-2 border-black">
              <div className="text-xs tracking-wider uppercase font-bold text-gray-700">
                Pemerintah Provinsi Maluku • Dinas Pendidikan dan Kebudayaan
              </div>
              <div className="text-xl font-bold uppercase tracking-wide my-1">
                {settings.schoolName || 'SMA NEGERI 15 AMBON'}
              </div>
              <div className="text-xs text-gray-600">
                NPSN: {settings.schoolNPSN || '69933068'} • {settings.schoolAddress || 'Jalan Raya Laha, Kota Ambon, Maluku'}
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-4">
              <h2 className="text-base font-bold uppercase tracking-wider underline">
                LEMBAR DISPOSISI & LAPORAN PEMBINAAN SISWA BERMASALAH
              </h2>
              <div className="text-xs text-gray-600 mt-0.5">
                Nomor: DISP/{new Date().getFullYear()}/{printSlipItem.student.kelas}/{printSlipItem.student.nisn}
              </div>
            </div>

            {/* Student Info Box */}
            <div className="border border-black p-3.5 my-3 rounded">
              <div className="text-xs font-bold uppercase mb-2 border-b border-black pb-1">
                I. IDENTITAS SISWA
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="w-36 py-1 font-semibold">Nama Lengkap Siswa</td>
                    <td className="w-4 py-1">:</td>
                    <td className="py-1 font-bold">{printSlipItem.student.nama}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">NISN</td>
                    <td className="py-1">:</td>
                    <td className="py-1">{printSlipItem.student.nisn}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Kelas / Rombel</td>
                    <td className="py-1">:</td>
                    <td className="py-1 font-bold">{printSlipItem.student.kelas}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Wali Kelas yang Bertugas</td>
                    <td className="py-1">:</td>
                    <td className="py-1 font-bold">{printSlipItem.waliKelas.name} {printSlipItem.waliKelas.nip ? `(NIP. ${printSlipItem.waliKelas.nip})` : ''}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">No. HP / WA Orang Tua</td>
                    <td className="py-1">:</td>
                    <td className="py-1">{printSlipItem.student.no_hp_ortu || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Attendance & Violation Stats */}
            <div className="border border-black p-3.5 my-3 rounded">
              <div className="text-xs font-bold uppercase mb-2 border-b border-black pb-1">
                II. REKAM KEHADIRAN & INDIKASI PELANGGARAN KEDISIPLINAN
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs my-2 font-bold">
                <div className="border p-1.5">Kehadiran: {printSlipItem.attendanceRate}%</div>
                <div className="border p-1.5">Alpa: {printSlipItem.alpaCount} Hari</div>
                <div className="border p-1.5">Terlambat: {printSlipItem.terlambatCount} Kali</div>
                <div className="border p-1.5">Sakit/Izin: {printSlipItem.sakitCount + printSlipItem.izinCount} Hari</div>
              </div>

              <div className="text-xs mt-2">
                <span className="font-bold">Uraian Masalah:</span>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {printSlipItem.reasons.map((r: string, rIdx: number) => (
                    <li key={rIdx}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Checklist for Homeroom & BK */}
            <div className="border border-black p-3.5 my-3 rounded text-xs space-y-2">
              <div className="font-bold uppercase border-b border-black pb-1">
                III. REKOMENDASI & TINDAK LANJUT WALI KELAS / GURU BK
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border border-black" />
                  <span>Pembinaan Langsung oleh Wali Kelas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border border-black" />
                  <span>Pemanggilan Orang Tua / Wali Murid</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border border-black" />
                  <span>Sesi Konseling Individual Guru BK</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border border-black" />
                  <span>Penerbitan Surat Peringatan (SP-1 / SP-2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border border-black" />
                  <span>Kunjungan Rumah (Home Visit)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border border-black" />
                  <span>Penandatanganan Pakta Integritas Siswa</span>
                </div>
              </div>
            </div>

            {/* Signatures Area */}
            <div className="grid grid-cols-3 gap-4 text-center text-xs mt-8 pt-4">
              <div>
                <div>Wali Kelas {printSlipItem.student.kelas},</div>
                <div className="h-16" />
                <div className="font-bold underline">{printSlipItem.waliKelas.name}</div>
                <div>NIP. {printSlipItem.waliKelas.nip || '................................'}</div>
              </div>

              <div>
                <div>Guru Bimbingan Konseling (BK),</div>
                <div className="h-16" />
                <div className="font-bold underline">Stevanus Siahaya, S.Pd</div>
                <div>NIP. 198712032011011009</div>
              </div>

              <div>
                <div>Mengetahui,<br />Kepala Sekolah,</div>
                <div className="h-16" />
                <div className="font-bold underline">Drs. Ramli Latuconsina, M.Pd</div>
                <div>NIP. 196803151994031008</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
