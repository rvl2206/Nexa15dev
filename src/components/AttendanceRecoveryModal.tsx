import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { MissingAttendanceLogItem } from '../types';
import { formatPetugasRole } from '../lib/exportUtils';
import {
  X,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Clock,
  User,
  ListChecks,
  Database,
  Check,
} from 'lucide-react';

interface AttendanceRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AttendanceRecoveryModal: React.FC<AttendanceRecoveryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [missingItems, setMissingItems] = useState<MissingAttendanceLogItem[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanTime, setScanTime] = useState<string>('');

  const loadMissingItems = () => {
    const items = store.getMissingAttendanceItemsFromLogs();
    setMissingItems(items);
    setSelectedLogIds(items.map((i) => i.logId));
    setScanTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  useEffect(() => {
    if (isOpen) {
      loadMissingItems();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = missingItems.filter((item) => {
    const matchesSearch =
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dateFormatted.includes(searchTerm) ||
      item.petugas.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'all' ||
      (filterType === 'Masuk' && item.jenis === 'Masuk') ||
      (filterType === 'Pulang' && item.jenis === 'Pulang');

    return matchesSearch && matchesType;
  });

  const handleToggleSelectAll = () => {
    if (selectedLogIds.length === filteredItems.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredItems.map((i) => i.logId));
    }
  };

  const handleToggleItem = (logId: string) => {
    if (selectedLogIds.includes(logId)) {
      setSelectedLogIds(selectedLogIds.filter((id) => id !== logId));
    } else {
      setSelectedLogIds([...selectedLogIds, logId]);
    }
  };

  const handleSyncSelected = () => {
    if (selectedLogIds.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      store.restoreSpecificMissingAttendanceItems(selectedLogIds);
      loadMissingItems();
      setIsProcessing(false);
      if (onSuccess) onSuccess();
    }, 400);
  };

  const handleSyncAll = () => {
    const allIds = missingItems.map((i) => i.logId);
    if (allIds.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      store.restoreSpecificMissingAttendanceItems(allIds);
      loadMissingItems();
      setIsProcessing(false);
      if (onSuccess) onSuccess();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Alat Pemulihan Absensi (Attendance Recovery)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Memindai Log Aktivitas &amp; memulihkan rekaman yang belum tersinkronkan di Koleksi Master Absensi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Status Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Status Pemindaian
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {scanTime ? `Diperbarui pkl ${scanTime}` : 'Siap dipindai'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Belum Tersinkronkan
                </span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  {missingItems.length} Rekaman
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Item Dipilih
                </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {selectedLogIds.length} dari {filteredItems.length} Selected
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Search and Filters */}
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, kelas, tanggal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">Semua Jenis</option>
                <option value="Masuk">Presensi Masuk</option>
                <option value="Pulang">Presensi Pulang</option>
              </select>

              <button
                type="button"
                onClick={loadMissingItems}
                className="p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Pindai Ulang Log"
              >
                <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Sync Action Buttons */}
            <div className="flex items-center gap-2">
              {missingItems.length > 0 && (
                <button
                  type="button"
                  disabled={isProcessing || selectedLogIds.length === 0}
                  onClick={handleSyncSelected}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Sinkronkan Dipilih ({selectedLogIds.length})</span>
                </button>
              )}

              {missingItems.length > 0 && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSyncAll}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sinkronkan Semua ({missingItems.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Table list */}
          {missingItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Semua Data Absensi Sudah Sinkron!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1">
                Tidak ditemukan rekaman absensi di Log Aktivitas yang hilang dari Koleksi Master Absensi. Seluruh data presensi Anda dalam kondisi konsisten.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tidak ada rekaman yang sesuai dengan kata kunci pencarian atau filter Anda.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLogIds.length === filteredItems.length && filteredItems.length > 0}
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </th>
                      <th className="p-3">Tanggal &amp; Waktu</th>
                      <th className="p-3">Nama Siswa / Kelas</th>
                      <th className="p-3">Jenis</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Petugas</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                    {filteredItems.map((item) => {
                      const isSelected = selectedLogIds.includes(item.logId);
                      return (
                        <tr
                          key={item.logId}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            isSelected ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItem(item.logId)}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {item.dateFormatted}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.timestamp).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {item.nama}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.kelas} • NISN: {item.nisn}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                                item.jenis === 'Masuk'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                              }`}
                            >
                              {item.jenis}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                                item.status === 'Hadir'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : item.status === 'Terlambat'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {formatPetugasRole(item.petugas)}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => {
                                setIsProcessing(true);
                                setTimeout(() => {
                                  store.restoreSpecificMissingAttendanceItems([item.logId]);
                                  loadMissingItems();
                                  setIsProcessing(false);
                                  if (onSuccess) onSuccess();
                                }, 300);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 transition-colors"
                            >
                              Sinkronkan
                            </button>
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

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sinkronisasi otomatis menyelaraskan database lokal dan Firestore realtime cloud.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
