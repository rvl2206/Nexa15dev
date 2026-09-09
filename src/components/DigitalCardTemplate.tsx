import React, { useState, useMemo } from 'react';
import { store } from '../lib/store';
import { Student } from '../types';
import { printElement } from '../lib/exportUtils';
import {
  CreditCard,
  Printer,
  User,
  RotateCcw,
  Sparkles,
  Info,
  Users,
  Filter,
  Search,
  CheckSquare,
  Square,
  Layers,
} from 'lucide-react';
import {
  OfficialStudentIDCardFront,
  OfficialStudentIDCardBack,
  CARD_SIZES,
  CardSizeOption,
} from './OfficialStudentIDCard';

export const DigitalCardTemplate: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => store.getStudents());
  const [mode, setMode] = useState<'blank' | 'student' | 'custom'>('student');
  const [printType, setPrintType] = useState<'single' | 'bulk'>('single');
  
  const [selectedKelas, setSelectedKelas] = useState<string>('semua');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => store.getStudents()[0]?.id || ''
  );
  
  // Selected IDs for Bulk Printing
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  React.useEffect(() => {
    const list = store.getStudents();
    setStudents(list);
    if (list.length > 0 && selectedStudentIds.length === 0) {
      setSelectedStudentIds(list.map((s) => s.id));
    }
    const unsubscribe = store.subscribe(() => {
      const updated = store.getStudents();
      setStudents(updated);
    });
    return () => unsubscribe();
  }, []);

  // Extract unique classes dynamically
  const availableClasses = useMemo(() => {
    const classSet = new Set(students.map((s) => s.kelas || 'Lainnya'));
    return (Array.from(classSet) as string[]).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [students]);

  // Filtered students by class and search
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesKelas = selectedKelas === 'semua' || s.kelas === selectedKelas;
      const matchesSearch =
        !searchQuery ||
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nisn.includes(searchQuery) ||
        (s.kelas && s.kelas.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesKelas && matchesSearch;
    });
  }, [students, selectedKelas, searchQuery]);

  // Handle Class change
  const handleKelasChange = (newKelas: string) => {
    setSelectedKelas(newKelas);
    const studentsInKelas =
      newKelas === 'semua' ? students : students.filter((s) => s.kelas === newKelas);
    if (studentsInKelas.length > 0) {
      setSelectedStudentId(studentsInKelas[0].id);
      setSelectedStudentIds(studentsInKelas.map((s) => s.id));
    }
  };

  // Bulk Selection Helpers
  const handleSelectAllInFiltered = () => {
    const newIds = Array.from(new Set([...selectedStudentIds, ...filteredStudents.map((s) => s.id)]));
    setSelectedStudentIds(newIds);
  };

  const handleDeselectAllInFiltered = () => {
    const filteredSet = new Set(filteredStudents.map((s) => s.id));
    setSelectedStudentIds(selectedStudentIds.filter((id) => !filteredSet.has(id)));
  };

  const handleToggleStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((item) => item !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  // Custom Editable Fields
  const [customNama, setCustomNama] = useState<string>('');
  const [customNisn, setCustomNisn] = useState<string>('');
  const [customKelas, setCustomKelas] = useState<string>('');
  const [tahunAjaran, setTahunAjaran] = useState<string>('2024/2025');
  const [statusSiswa, setStatusSiswa] = useState<string>('Siswa Aktif');
  const [cardSize, setCardSize] = useState<CardSizeOption>('CR80');
  const [activeSide, setActiveSide] = useState<'both' | 'front' | 'back'>('both');

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const getFieldValues = () => {
    if (mode === 'student' && selectedStudent) {
      return {
        nama: selectedStudent.nama,
        nisn: selectedStudent.nisn,
        kelas: selectedStudent.kelas,
        tahun: tahunAjaran || '2024/2025',
        status: statusSiswa || 'Siswa Aktif',
        qrValue: `69933068.${selectedStudent.nisn}.${selectedStudent.nama}`,
      };
    }
    if (mode === 'custom') {
      return {
        nama: customNama || '____________________',
        nisn: customNisn || '____________________',
        kelas: customKelas || '____________________',
        tahun: tahunAjaran || '____________________',
        status: statusSiswa || '____________________',
        qrValue: customNisn ? `69933068.${customNisn}.${customNama || 'SISWA'}` : 'TEMPLATESMA15AMBON',
      };
    }
    return {
      nama: '____________________',
      nisn: '____________________',
      kelas: '____________________',
      tahun: tahunAjaran ? tahunAjaran : '____________________',
      status: statusSiswa ? statusSiswa : '____________________',
      qrValue: 'SMANEGERI15AMBON_TEMPLATE_ABSENSI_DIGITAL',
    };
  };

  const values = getFieldValues();
  const currentSize = CARD_SIZES[cardSize];

  // Print selected bulk students list
  const bulkSelectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  // Chunk bulk students by A4 page
  const cardPages = useMemo(() => {
    // Both sides = 2 students per page (4 cards front+back)
    // Single side = 9 cards per page (3x3 grid)
    const itemsPerPage = activeSide === 'both' ? 2 : 9;
    const pages: (typeof students)[] = [];
    for (let i = 0; i < bulkSelectedStudents.length; i += itemsPerPage) {
      pages.push(bulkSelectedStudents.slice(i, i + itemsPerPage));
    }
    return pages;
  }, [bulkSelectedStudents, activeSide]);

  const handlePrint = () => {
    if (mode === 'student' && printType === 'bulk') {
      printElement('printable-mass-cards', `Kartu_Absensi_Massal_${selectedKelas}`);
    } else {
      printElement('printable-id-card-area', `Kartu_Absensi_Digital_SMA15Ambon`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-500/10 to-blue-600/10 border border-amber-500/20 rounded-2xl">
            <CreditCard className="w-8 h-8 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Template Kartu Absensi Digital
              </h1>
              <span className="bg-amber-400/20 text-amber-800 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                Resmi SMA N 15 Ambon
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Desain resmi kartu identitas presensi digital SMA Negeri 15 Ambon (Pilihan Individu &amp; Cetak Massal Per Kelas)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            {mode === 'student' && printType === 'bulk'
              ? `Cetak Massal (${bulkSelectedStudents.length} Kartu)`
              : 'Cetak Template'}
          </button>
        </div>
      </div>

      {/* Control Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Column */}
        <div className="lg:col-span-1 space-y-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-2xs transition-colors">
          <h2 className="text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Pengaturan Pratinjau &amp; Cetak
          </h2>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mode Isian Kartu:</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMode('student')}
                className={`py-2 px-1.5 text-[11px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                  mode === 'student'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Data Siswa
              </button>
              <button
                type="button"
                onClick={() => setMode('blank')}
                className={`py-2 px-1.5 text-[11px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                  mode === 'blank'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Kosong
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`py-2 px-1.5 text-[11px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                  mode === 'custom'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* Mode 2: Student Select & Class Filter */}
          {mode === 'student' && (
            <div className="space-y-3.5 bg-blue-950/40 border border-blue-800/50 p-3.5 rounded-xl">
              {/* Opsi Tipe Cetak: Individu / Massal */}
              <div>
                <label className="text-xs font-bold text-blue-300 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Pilihan Cetak:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintType('single')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      printType === 'single'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                        : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Pilihan Individu
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintType('bulk')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      printType === 'bulk'
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-xs'
                        : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Cetak Massal
                  </button>
                </div>
              </div>

              {/* Filter Pilihan Kelas */}
              <div>
                <label className="text-xs font-bold text-blue-300 mb-1 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  Filter Pilihan Kelas:
                </label>
                <select
                  value={selectedKelas}
                  onChange={(e) => handleKelasChange(e.target.value)}
                  className="w-full bg-slate-900 border border-blue-700/60 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="semua">Semua Kelas ({students.length} Siswa)</option>
                  {availableClasses.map((cls) => {
                    const count = students.filter((s) => s.kelas === cls).length;
                    return (
                      <option key={cls} value={cls}>
                        Kelas {cls} ({count} Siswa)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Tipe Individu: Single Student Select */}
              {printType === 'single' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-blue-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Pilih Siswa Spesifik:
                  </label>
                  {filteredStudents.length > 0 ? (
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full bg-slate-900 border border-blue-700/60 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {filteredStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} (Kelas: {s.kelas} - NISN: {s.nisn})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-400">Tidak ada siswa ditemukan di kelas ini.</p>
                  )}
                </div>
              )}

              {/* Tipe Massal: Student Multi Checklist */}
              {printType === 'bulk' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                      Checklist Siswa ({bulkSelectedStudents.length} / {filteredStudents.length} Terpilih)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSelectAllInFiltered}
                        className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllInFiltered}
                        className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>

                  {/* Search Student Box */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama / NISN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-blue-800/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Scrollable Checklist */}
                  <div className="max-h-52 overflow-y-auto space-y-1 bg-slate-900/90 border border-blue-900/60 p-2 rounded-xl text-xs divide-y divide-slate-800/60">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((s) => {
                        const isChecked = selectedStudentIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => handleToggleStudent(s.id)}
                            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-blue-600/30 text-white font-medium'
                                : 'text-slate-400 hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                              <span className="truncate text-[11.5px]">{s.nama}</span>
                            </div>
                            <span className="text-[10px] font-mono text-amber-400/90 shrink-0 bg-slate-950 px-1.5 py-0.5 rounded border border-amber-500/20">
                              {s.kelas}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-amber-400 p-2 text-center">Data siswa tidak ditemukan.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Custom Input */}
          {mode === 'custom' && (
            <div className="space-y-3 bg-indigo-950/40 border border-indigo-800/50 p-3.5 rounded-xl text-xs space-y-2">
              <div>
                <label className="text-slate-300 font-medium mb-1 block">Nama Siswa:</label>
                <input
                  type="text"
                  placeholder="Contoh: AHMAD RIVALDI"
                  value={customNama}
                  onChange={(e) => setCustomNama(e.target.value)}
                  className="w-full bg-slate-900 border border-indigo-700/60 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-medium mb-1 block">NISN:</label>
                  <input
                    type="text"
                    placeholder="0012345678"
                    value={customNisn}
                    onChange={(e) => setCustomNisn(e.target.value)}
                    className="w-full bg-slate-900 border border-indigo-700/60 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium mb-1 block">Kelas:</label>
                  <input
                    type="text"
                    placeholder="X-1"
                    value={customKelas}
                    onChange={(e) => setCustomKelas(e.target.value)}
                    className="w-full bg-slate-900 border border-indigo-700/60 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Universal Field Overrides */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Tahun Ajaran:
              </label>
              <input
                type="text"
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                placeholder="2024/2025"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Status Peserta Didik:
              </label>
              <input
                type="text"
                value={statusSiswa}
                onChange={(e) => setStatusSiswa(e.target.value)}
                placeholder="Siswa Aktif"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Ukuran Cetak Fisik:
              </label>
              <select
                value={cardSize}
                onChange={(e) => setCardSize(e.target.value as CardSizeOption)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="CR80">CR80 Standar KTP/ATM (53.98 x 85.60 mm)</option>
                <option value="B2">Plastik B2 (70 x 100 mm / 7 x 10 cm)</option>
                <option value="B1">Plastik B1 (55 x 90 mm / 5.5 x 9 cm)</option>
              </select>
            </div>
          </div>

          {/* Side View Selector */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              Tampilan Sisi Kartu:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSide('both')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  activeSide === 'both'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Depan &amp; Belakang
              </button>
              <button
                type="button"
                onClick={() => setActiveSide('front')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  activeSide === 'front'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sisi Depan
              </button>
              <button
                type="button"
                onClick={() => setActiveSide('back')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  activeSide === 'back'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sisi Belakang
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-900 dark:text-amber-300/90 leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1 text-amber-800 dark:text-amber-300">
              <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> Ketentuan Cetak Massal:
            </p>
            <p>
              Pilih kelas dan centang daftar siswa yang ingin dicetak secara bersamaan. Klik tombol &quot;Cetak Massal&quot; untuk langsung mencetak seluruh kartu ke Kertas A4/PVC.
            </p>
          </div>
        </div>

        {/* Live Mockup Display Area */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-start min-h-[560px] shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Section Indicator */}
          <div className="mb-6 flex flex-wrap items-center justify-between w-full max-w-4xl gap-2 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {mode === 'student' && printType === 'bulk'
                  ? `Pratinjau Cetak Massal (${bulkSelectedStudents.length} Siswa)`
                  : `Mockup Presentation (${currentSize.badge})`}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Ukuran Fisik: {currentSize.widthMM} x {currentSize.heightMM} mm
            </div>
          </div>

          {/* SINGLE / INDIVIDUAL PREVIEW MODE */}
          {(mode !== 'student' || printType === 'single') && (
            <div
              id="printable-id-card-area"
              className="flex flex-wrap items-center justify-center gap-8 py-2 z-10 w-full my-auto"
            >
              {/* FRONT CARD */}
              {(activeSide === 'both' || activeSide === 'front') && (
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase mb-2 flex items-center gap-1.5 print:hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    KARTU SISI DEPAN (FRONT SIDE)
                  </span>

                  <OfficialStudentIDCardFront
                    nama={values.nama}
                    nisn={values.nisn}
                    kelas={values.kelas}
                    tahunAjaran={values.tahun}
                    statusSiswa={values.status}
                    qrValue={values.qrValue}
                    cardSize={cardSize}
                  />
                </div>
              )}

              {/* BACK CARD */}
              {(activeSide === 'both' || activeSide === 'back') && (
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-bold tracking-wider text-cyan-400 uppercase mb-2 flex items-center gap-1.5 print:hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    KARTU SISI BELAKANG (BACK SIDE)
                  </span>

                  <OfficialStudentIDCardBack cardSize={cardSize} />
                </div>
              )}
            </div>
          )}

          {/* BULK / MASSAL PRINT PREVIEW MODE */}
          {mode === 'student' && printType === 'bulk' && (
            <div className="w-full z-10 space-y-4">
              {bulkSelectedStudents.length > 0 ? (
                <div
                  id="printable-mass-cards"
                  className="w-full space-y-6 max-h-[700px] overflow-y-auto p-2"
                >
                  {cardPages.map((pageStudents, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="print-page bg-slate-900/40 p-4 rounded-2xl border border-slate-800"
                    >
                      <div className="text-xs font-bold text-amber-400 mb-3 print:hidden flex items-center justify-between border-b border-slate-800 pb-2">
                        <span>Halaman Cetak {pageIdx + 1} ({pageStudents.length * (activeSide === 'both' ? 2 : 1)} Kartu)</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Standard A4 — {activeSide === 'both' ? 'Maksimal 2 Siswa (4 Kartu Depan & Belakang)' : 'Maksimal 9 Kartu Per Halaman (Grid 3x3)'}
                        </span>
                      </div>
                      <div
                        className={`print-grid ${
                          activeSide === 'both'
                            ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                            : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print-grid-3cols'
                        } justify-items-center items-center`}
                      >
                        {pageStudents.map((s) => {
                          const qrVal = `69933068.${s.nisn}.${s.nama}`;
                          return (
                            <div
                              key={s.id}
                              className="mass-card-item flex flex-col items-center bg-slate-900/60 p-3 rounded-2xl border border-slate-800 shadow-md w-full"
                            >
                              <div className="text-[10px] font-bold text-amber-400 mb-2 uppercase tracking-wide print:hidden">
                                {s.nama} ({s.kelas})
                              </div>
                              <div className="flex flex-wrap items-center justify-center gap-3">
                                {(activeSide === 'both' || activeSide === 'front') && (
                                  <OfficialStudentIDCardFront
                                    nama={s.nama}
                                    nisn={s.nisn}
                                    kelas={s.kelas}
                                    tahunAjaran={tahunAjaran || '2024/2025'}
                                    statusSiswa={statusSiswa || 'Siswa Aktif'}
                                    qrValue={qrVal}
                                    cardSize={cardSize}
                                  />
                                )}
                                {(activeSide === 'both' || activeSide === 'back') && (
                                  <OfficialStudentIDCardBack cardSize={cardSize} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="font-bold text-sm">Tidak ada siswa yang dicentang untuk cetak massal.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Silakan pilih kelas atau centang nama siswa pada panel pengaturan sebelah kiri.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons below preview */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 z-10">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {mode === 'student' && printType === 'bulk'
                ? `Cetak Massal (${bulkSelectedStudents.length} Kartu)`
                : 'Cetak Dialog Browser'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('student');
                setPrintType('single');
                setSelectedKelas('semua');
                setTahunAjaran('2024/2025');
                setStatusSiswa('Siswa Aktif');
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Ke Standar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
