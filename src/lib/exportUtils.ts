import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, Student, Teacher, TeacherAttendanceRecord } from '../types';

export function printElement(
  elementId: string,
  title = 'Cetak Kartu Presensi',
  cardWidthMM = 53.98,
  cardHeightMM = 85.60
) {
  const targetElem = document.getElementById(elementId);
  if (!targetElem) {
    window.print();
    return;
  }

  const contentHtml = targetElem.outerHTML;

  // Try opening dedicated print window to bypass iframe print restrictions
  try {
    const printWin = window.open('', '_blank', 'width=900,height=950');
    if (printWin) {
      const stylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((s) => s.outerHTML)
        .join('\n');

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <script src="https://cdn.tailwindcss.com"></script>
            ${stylesheets}
            <style>
              @page {
                size: A4 portrait;
                margin: 6mm;
              }
              *, *::before, *::after {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: system-ui, -apple-system, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .print-wrapper {
                display: block !important;
                width: 100% !important;
              }
              #printable-card, #printable-id-card-area, #printable-mass-cards, .print-page, .mass-card-item, .official-id-card {
                visibility: visible !important;
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              #printable-mass-cards {
                display: block !important;
                width: 100% !important;
                max-height: none !important;
                overflow: visible !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-page {
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-around !important;
                align-items: center !important;
                width: 100% !important;
                min-height: 270mm !important;
                max-height: 275mm !important;
                padding: 4mm !important;
                box-sizing: border-box !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                background: transparent !important;
                border: none !important;
                margin: 0 auto !important;
              }
              .print-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .print-grid {
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 6mm 8mm !important;
                width: 100% !important;
                justify-items: center !important;
                align-items: center !important;
                align-content: center !important;
              }
              .print-grid-3cols {
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 3mm 4mm !important;
              }
              .mass-card-item {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .official-id-card {
                visibility: visible !important;
                box-shadow: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .print\:hidden {
                display: none !important;
              }
            </style>
          </head>
          <body>
            <div class="print-wrapper">
              ${contentHtml}
            </div>
            <script>
              window.addEventListener('load', function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 350);
              });
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
      return;
    }
  } catch (err) {
    console.warn('Popup print window failed, triggering direct window.print()', err);
  }

  window.print();
}

export function calculateLateMinutes(record: AttendanceRecord, cutoffTime = '07:15'): number {
  if (record.terlambatMenit !== undefined && record.terlambatMenit > 0) {
    return record.terlambatMenit;
  }
  if (record.status !== 'Terlambat' || record.jenis !== 'Masuk' || !record.timestamp) {
    return 0;
  }
  try {
    const scanDate = new Date(record.timestamp);
    const [cutoffHour, cutoffMin] = cutoffTime.split(':').map(Number);
    const cutoffDate = new Date(scanDate);
    cutoffDate.setHours(cutoffHour || 7, cutoffMin || 15, 0, 0);

    if (scanDate > cutoffDate) {
      const diffMs = scanDate.getTime() - cutoffDate.getTime();
      return Math.ceil(diffMs / (1000 * 60));
    }
  } catch {
    // ignore error
  }
  return 0;
}

export function formatPetugasRole(petugas?: string): string {
  if (!petugas) return 'Petugas Piket';
  const p = petugas.toLowerCase().trim();
  if (p === 'admin' || p.includes('admin') || p.includes('smanlibas@gmail.com')) {
    return 'Administrator';
  }
  if (p.includes('kepsek') || p.includes('kepala sekolah')) {
    return 'Kepala Sekolah';
  }
  if (p.includes('piket') || p.includes('guru') || p.includes('piket.smanlibas@gmail.com')) {
    return 'Petugas Piket';
  }
  if (p.includes('@')) {
    const userPart = p.split('@')[0];
    if (userPart.includes('piket') || userPart.includes('guru')) return 'Petugas Piket';
    if (userPart.includes('admin')) return 'Administrator';
    if (userPart.includes('kepsek')) return 'Kepala Sekolah';
    return 'Petugas Piket';
  }
  return petugas;
}

export function formatLateDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (remainingMin === 0) return `${hours} jam`;
  return `${hours} jam ${remainingMin} menit`;
}

export function exportAttendanceToExcel(records: AttendanceRecord[], filenamePrefix = 'Rekap_Absensi_NEXA15', cutoffTime = '07:15') {
  const data = records.map((r, index) => {
    const lateMinutes = calculateLateMinutes(r, cutoffTime);
    return {
      No: index + 1,
      Tanggal: r.tanggal,
      'Waktu Scan': r.timestamp
        ? new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jayapura' }) + ' WIT'
        : '-',
      NISN: r.nisn,
      Nama: r.nama,
      Kelas: r.kelas,
      'ID QR': r.id_qr,
      'Jenis Absensi': r.jenis,
      Status: r.status,
      'Waktu Terlambat': formatLateDuration(lateMinutes),
      'Jumlah Menit Terlambat': lateMinutes > 0 ? lateMinutes : 0,
      Petugas: formatPetugasRole(r.petugas),
      Catatan: r.catatan || '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set auto column widths
  const colWidths = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 12 }, // Waktu
    { wch: 14 }, // NISN
    { wch: 25 }, // Nama
    { wch: 12 }, // Kelas
    { wch: 12 }, // ID QR
    { wch: 12 }, // Jenis
    { wch: 12 }, // Status
    { wch: 18 }, // Waktu Terlambat
    { wch: 20 }, // Menit Terlambat
    { wch: 22 }, // Petugas
    { wch: 20 }, // Catatan
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
}

export function exportAttendanceToPDF(records: AttendanceRecord[], title = 'Laporan Rekapitulasi Absensi Siswa', cutoffTime = '07:15') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Kop Surat Resmi
  const startY = drawOfficialKopSurat(doc, 'landscape');

  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), 148.5, startY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Data: ${records.length} Record | Diunduh: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jayapura' })} WIT`, 148.5, startY + 8.5, { align: 'center' });

  // Table content
  const tableHead = [['No', 'Tanggal', 'Jam Scan', 'NISN', 'Nama Siswa', 'Kelas', 'Jenis', 'Status', 'Waktu Terlambat', 'Petugas']];
  const tableBody = records.map((r, i) => {
    const lateMinutes = calculateLateMinutes(r, cutoffTime);
    return [
      i + 1,
      r.tanggal,
      r.timestamp ? new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' }) + ' WIT' : '-',
      r.nisn,
      r.nama,
      r.kelas,
      r.jenis,
      r.status,
      formatLateDuration(lateMinutes),
      r.petugas,
    ];
  });

  autoTable(doc, {
    startY: startY + 12,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // #2563eb
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Footer
      const str = `Halaman ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
    },
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Laporan_Absensi_${dateStr}.pdf`);
}

export function formatWhatsAppNumber(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

export function sanitizeUnicodeMessage(text?: string): string {
  if (!text) return '';
  try {
    let cleanStr = text.normalize('NFC');
    cleanStr = cleanStr.replace(/[\uFFFD\uFFFE\uFFFF\uFEFF]/g, '');
    // Remove unmatched surrogate pairs
    cleanStr = cleanStr.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g, '');
    return cleanStr;
  } catch {
    return (text || '').replace(/[\uFFFD\uFFFE\uFFFF\uFEFF]/g, '');
  }
}

export function cleanWhatsAppTemplate(template?: string, fallbackType: 'Hadir' | 'Terlambat' | 'IzinSakit' | 'Alpa' = 'Hadir'): string {
  const sanitized = sanitizeUnicodeMessage(template);
  if (!sanitized || !sanitized.trim() || sanitized.includes('? Tanggal') || sanitized.includes('? Waktu')) {
    switch (fallbackType) {
      case 'Hadir':
        return 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ✅ *HADIR (Tepat Waktu)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_';
      case 'Terlambat':
        return 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ⏰ *TERLAMBAT* ({terlambat})\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_';
      case 'IzinSakit':
        return 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: 📄 *{status}*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_';
      case 'Alpa':
        return 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: ❌ *ALPA (Tanpa Keterangan)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_';
    }
  }

  let cleaned = sanitized
    .replace(/^[\s\?\uFFFD\uFEFF]*Tanggal:/gim, '📅 Tanggal:')
    .replace(/^[\s\?\uFFFD\uFEFF]*Waktu Scan:/gim, '⏰ Waktu Scan:')
    .replace(/^[\s\?\uFFFD\uFEFF]*Status Presensi:/gim, '📌 Status Presensi:')
    .replace(/^[\s\?\uFFFD\uFEFF]*Petugas Scan:/gim, '👤 Petugas Scan:')
    .replace(/^[\s\?\uFFFD\uFEFF]*Catatan:/gim, '📝 Catatan:');

  return cleaned.trim();
}

export function generateWhatsAppMessage(
  student: Partial<Student>,
  record?: Partial<AttendanceRecord>,
  schoolName = 'SMA NEGERI 15 AMBON',
  customTemplate?: string
): string {
  const timeStr = record?.timestamp
    ? new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' }) + ' WIT'
    : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' }) + ' WIT';
  const dateStr = record?.tanggal || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const status = record?.status || 'Hadir';
  const lateMinutes = record?.terlambatMenit ? `${record.terlambatMenit} menit` : '';

  let fallbackType: 'Hadir' | 'Terlambat' | 'IzinSakit' | 'Alpa' = 'Hadir';
  if (status === 'Terlambat') fallbackType = 'Terlambat';
  else if (status === 'Izin' || status === 'Sakit') fallbackType = 'IzinSakit';
  else if (status === 'Alpa') fallbackType = 'Alpa';

  const cleanedTemplate = cleanWhatsAppTemplate(customTemplate, fallbackType);

  let msg = cleanedTemplate
    .replace(/\{nama\}/g, student.nama || 'Siswa')
    .replace(/\{kelas\}/g, student.kelas || '-')
    .replace(/\{nisn\}/g, student.nisn || '-')
    .replace(/\{sekolah\}/g, schoolName)
    .replace(/\{status\}/g, status)
    .replace(/\{tanggal\}/g, dateStr)
    .replace(/\{waktu\}/g, timeStr)
    .replace(/\{terlambat\}/g, lateMinutes ? lateMinutes : 'sesuai jam batas sekolah');

  if (record?.petugas && !msg.includes('Petugas Scan')) {
    const roleTitle = formatPetugasRole(record.petugas);
    msg = msg.replace(/(\n\nTerima kasih|_Pesan otomatis)/i, `\n👤 Petugas Scan: ${roleTitle}\n$1`);
  }
  if (record?.catatan && !msg.includes('Catatan')) {
    msg = msg.replace(/(\n\nTerima kasih|_Pesan otomatis)/i, `\n📝 Catatan: ${record.catatan}\n$1`);
  }

  // Clean corrupted unicode / replacement characters / space artifacts
  msg = msg
    .replace(/[\uFFFD\uFFFE\uFFFF\uFEFF]/g, '')
    .replace(/^[\s\?\uFFFD\uFEFF]*Tanggal:/gm, '📅 Tanggal:')
    .replace(/^[\s\?\uFFFD\uFEFF]*Waktu Scan:/gm, '⏰ Waktu Scan:')
    .replace(/^[\s\?\uFFFD\uFEFF]*Status Presensi:\s*[\uFFFD\uFFFE\uFFFF\uFEFF\?]*\s*/gm, '📌 Status Presensi: ')
    .replace(/^[\s\?\uFFFD\uFEFF]*Petugas Scan:/gm, '👤 Petugas Scan:')
    .replace(/^[\s\?\uFFFD\uFEFF]*Catatan:/gm, '📝 Catatan:');

  // Repair missing emojis in Status Presensi line
  if (msg.includes('Status Presensi:')) {
    if (msg.includes('*TERLAMBAT*') && !msg.includes('⏰ *TERLAMBAT*')) {
      msg = msg.replace(/Status Presensi:\s*[\s\?]*\*TERLAMBAT\*/i, 'Status Presensi: ⏰ *TERLAMBAT*');
    } else if (msg.includes('*HADIR') && !msg.includes('✅ *HADIR')) {
      msg = msg.replace(/Status Presensi:\s*[\s\?]*\*HADIR/i, 'Status Presensi: ✅ *HADIR');
    } else if (msg.includes('*ALPA') && !msg.includes('❌ *ALPA')) {
      msg = msg.replace(/Status Presensi:\s*[\s\?]*\*ALPA/i, 'Status Presensi: ❌ *ALPA');
    } else if ((msg.includes('*IZIN') || msg.includes('*SAKIT')) && !msg.includes('📄 *')) {
      msg = msg.replace(/Status Presensi:\s*[\s\?]*\*/i, 'Status Presensi: 📄 *');
    }
  }

  const finalMsg = sanitizeUnicodeMessage(msg);
  return finalMsg.trim();
}

export function getWhatsAppLink(phone: string, message: string): string {
  const clean = formatWhatsAppNumber(phone);
  if (!clean) return '';
  const sanitized = sanitizeUnicodeMessage(message);
  try {
    return `https://wa.me/${clean}?text=${encodeURIComponent(sanitized)}`;
  } catch {
    const safeAscii = sanitized.replace(/[\uFFFD\uFFFE\uFFFF\uFEFF]/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(safeAscii)}`;
  }
}

export function exportStudentListToExcel(students: Student[], filenamePrefix = 'Data_Siswa_NEXA15') {
  const data = students.map((s, index) => ({
    No: index + 1,
    NPSN: s.id_qr || '69933068',
    'Format QR Code': `69933068.${s.nisn}.${s.nama}`,
    'UID Kartu RFID': s.rfid_uid || '',
    NISN: s.nisn,
    Nama: s.nama,
    Kelas: s.kelas,
    'No HP Ortu / WA': s.no_hp_ortu || '',
    Status: s.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 35 },
    { wch: 18 },
    { wch: 16 },
    { wch: 30 },
    { wch: 12 },
    { wch: 20 },
    { wch: 10 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
  XLSX.writeFile(workbook, `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportStudentListToCSV(students: Student[], filenamePrefix = 'Data_Siswa_NEXA15') {
  const data = students.map((s, index) => ({
    No: index + 1,
    NPSN: s.id_qr || '69933068',
    'Format QR Code': `69933068.${s.nisn}.${s.nama}`,
    'UID Kartu RFID': s.rfid_uid || '',
    NISN: s.nisn,
    Nama: s.nama,
    Kelas: s.kelas,
    'No HP Ortu / WA': s.no_hp_ortu || '',
    Status: s.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads standard template file for importing student data into NEXA15 system
 */
export function downloadStudentImportTemplate() {
  const templateData = [
    {
      'Nama': 'AHMAD RIDWAN',
      'NISN': '0061234567',
      'Kelas': 'X 1',
      'No HP Ortu': '081234567890',
      'UID Kartu RFID': 'E28068A1',
      'Status': 'aktif',
    },
    {
      'Nama': 'BETI SALIHAT',
      'NISN': '0061234568',
      'Kelas': 'XI 2',
      'No HP Ortu': '081298765432',
      'UID Kartu RFID': 'B492C1D0',
      'Status': 'aktif',
    },
    {
      'Nama': 'CHRISTIAN TUHUMURY',
      'NISN': '0061234569',
      'Kelas': 'XII 1',
      'No HP Ortu': '085211223344',
      'UID Kartu RFID': '',
      'Status': 'aktif',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Column width configuration
  worksheet['!cols'] = [
    { wch: 28 }, // Nama
    { wch: 16 }, // NISN
    { wch: 14 }, // Kelas
    { wch: 18 }, // No HP Ortu
    { wch: 18 }, // UID Kartu RFID
    { wch: 12 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Import Siswa');

  XLSX.writeFile(workbook, 'Template_Import_Siswa_NEXA15.xlsx');
}

/**
 * Parses uploaded Excel / CSV file into array of Student objects
 */
export function parseStudentImportFile(file: File): Promise<{
  success: boolean;
  data: Omit<Student, 'id' | 'createdAt'>[];
  errors: string[];
  totalRows: number;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const dataBuffer = e.target?.result;
        if (!dataBuffer) {
          resolve({ success: false, data: [], errors: ['Gagal membaca file.'], totalRows: 0 });
          return;
        }

        const workbook = XLSX.read(dataBuffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          resolve({
            success: false,
            data: [],
            errors: ['File Excel/CSV kosong atau tidak memiliki data.'],
            totalRows: 0,
          });
          return;
        }

        const parsedData: Omit<Student, 'id' | 'createdAt'>[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, index) => {
          const rowNum = index + 2; // header is row 1
          
          // Normalize column names (case-insensitive & trim)
          const normalizedRow: Record<string, string> = {};
          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            normalizedRow[cleanKey] = String(row[key] ?? '').trim();
          });

          // Extract fields with multiple key aliases
          const id_qr =
            normalizedRow['idqr'] ||
            normalizedRow['qr'] ||
            normalizedRow['kodeqr'] ||
            normalizedRow['id'] ||
            '';

          const nisn =
            normalizedRow['nisn'] ||
            normalizedRow['nis'] ||
            normalizedRow['nomorinduk'] ||
            '';

          const nama =
            normalizedRow['namasiswa'] ||
            normalizedRow['nama'] ||
            normalizedRow['fullname'] ||
            normalizedRow['name'] ||
            '';

          const kelas =
            normalizedRow['kelas'] ||
            normalizedRow['class'] ||
            normalizedRow['tingkat'] ||
            'X 1';

          const no_hp_ortu =
            normalizedRow['nohportu'] ||
            normalizedRow['hportu'] ||
            normalizedRow['whatsapportu'] ||
            normalizedRow['waortu'] ||
            normalizedRow['whatsapp'] ||
            normalizedRow['wa'] ||
            normalizedRow['nohp'] ||
            normalizedRow['teleponortu'] ||
            normalizedRow['telepon'] ||
            '';

          const rfid_uid =
            normalizedRow['uidkarturfid'] ||
            normalizedRow['karturfid'] ||
            normalizedRow['rfiduid'] ||
            normalizedRow['rfid'] ||
            normalizedRow['uidrfid'] ||
            normalizedRow['nfc'] ||
            normalizedRow['nfcuid'] ||
            normalizedRow['kartupintar'] ||
            normalizedRow['uid'] ||
            '';

          const statusRaw = (
            normalizedRow['status'] || 'aktif'
          ).toLowerCase();

          const status: 'aktif' | 'nonaktif' =
            statusRaw.includes('non') || statusRaw.includes('pasif') || statusRaw.includes('off')
              ? 'nonaktif'
              : 'aktif';

          // Validation
          if (!nama && !nisn) {
            errors.push(`Baris ${rowNum}: Dilewati karena Nama dan NISN kosong.`);
            return;
          }

          const finalNISN = nisn || String(Math.floor(3000000000 + Math.random() * 900000000));
          const finalNama = nama || 'Siswa tanpa nama';
          const finalQR = `69933068.${finalNISN}.${finalNama}`;

          parsedData.push({
            id_qr: finalQR,
            nisn: finalNISN,
            nama: finalNama,
            kelas: kelas || 'X 1',
            no_hp_ortu: no_hp_ortu,
            rfid_uid: rfid_uid ? rfid_uid.trim().toUpperCase() : undefined,
            foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
            status: status,
          });
        });

        resolve({
          success: parsedData.length > 0,
          data: parsedData,
          errors,
          totalRows: rawJson.length,
        });
      } catch (err) {
        resolve({
          success: false,
          data: [],
          errors: [`Error membaca file: ${(err as Error).message || 'Format tidak valid'}`],
          totalRows: 0,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['Terjadi kesalahan saat membaca file.'],
        totalRows: 0,
      });
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Downloads standard template file for importing attendance/presensi data into NEXA15 system
 */
export function downloadAttendanceImportTemplate() {
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '-');

  const templateData = [
    {
      'Tanggal': todayFormatted,
      'NISN': '0081234567',
      'Nama': 'DADANG BUAMONA',
      'Kelas': 'X 1',
      'Jenis': 'Masuk',
      'Status': 'Hadir',
      'Jam Scan': '07:05',
      'Catatan': 'Presensi Tepat Waktu',
    },
    {
      'Tanggal': todayFormatted,
      'NISN': '0081234568',
      'Nama': 'SITI RAHMA',
      'Kelas': 'X 1',
      'Jenis': 'Masuk',
      'Status': 'Terlambat',
      'Jam Scan': '07:30',
      'Catatan': 'Macet perjalanan',
    },
    {
      'Tanggal': todayFormatted,
      'NISN': '0081234569',
      'Nama': 'AHMAD RIDWAN',
      'Kelas': 'XI IPA 1',
      'Jenis': 'Masuk',
      'Status': 'Izin',
      'Jam Scan': '07:15',
      'Catatan': 'Surat izin diserahkan',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  worksheet['!cols'] = [
    { wch: 14 }, // Tanggal
    { wch: 16 }, // NISN
    { wch: 26 }, // Nama
    { wch: 12 }, // Kelas
    { wch: 12 }, // Jenis
    { wch: 12 }, // Status
    { wch: 12 }, // Jam Scan
    { wch: 25 }, // Catatan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Import Kehadiran');
  XLSX.writeFile(workbook, 'Template_Import_Kehadiran_NEXA15.xlsx');
}

/**
 * Parses uploaded Excel / CSV file into array of AttendanceRecord objects
 */
export function parseAttendanceImportFile(
  file: File,
  existingStudents: Student[] = [],
  currentOfficer = 'Petugas Import'
): Promise<{
  success: boolean;
  data: Omit<AttendanceRecord, 'id'>[];
  errors: string[];
  totalRows: number;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const dataBuffer = e.target?.result;
        if (!dataBuffer) {
          resolve({ success: false, data: [], errors: ['Gagal membaca file.'], totalRows: 0 });
          return;
        }

        const workbook = XLSX.read(dataBuffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          resolve({
            success: false,
            data: [],
            errors: ['File Excel/CSV kosong atau tidak memiliki data.'],
            totalRows: 0,
          });
          return;
        }

        const parsedData: Omit<AttendanceRecord, 'id'>[] = [];
        const errors: string[] = [];

        const defaultDateStr = new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).replace(/\//g, '-');

        rawJson.forEach((row, index) => {
          const rowNum = index + 2;

          const normalizedRow: Record<string, string> = {};
          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            normalizedRow[cleanKey] = String(row[key] ?? '').trim();
          });

          const tanggalRaw =
            normalizedRow['tanggal'] ||
            normalizedRow['tgl'] ||
            normalizedRow['date'] ||
            defaultDateStr;

          const nisnRaw =
            normalizedRow['nisn'] ||
            normalizedRow['nis'] ||
            normalizedRow['nomorinduk'] ||
            '';

          const namaRaw =
            normalizedRow['namasiswa'] ||
            normalizedRow['nama'] ||
            normalizedRow['fullname'] ||
            normalizedRow['name'] ||
            '';

          const kelasRaw =
            normalizedRow['kelas'] ||
            normalizedRow['class'] ||
            '';

          const idQrRaw =
            normalizedRow['idqr'] ||
            normalizedRow['qr'] ||
            '';

          const jenisRaw = (
            normalizedRow['jenis'] ||
            normalizedRow['tipe'] ||
            normalizedRow['jeniskehadiran'] ||
            'Masuk'
          ).toLowerCase();

          const jenis: 'Masuk' | 'Pulang' = jenisRaw.includes('pulang') || jenisRaw.includes('out') ? 'Pulang' : 'Masuk';

          const statusRaw = (
            normalizedRow['status'] ||
            normalizedRow['keterangan'] ||
            'Hadir'
          ).toLowerCase();

          let status: 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa' = 'Hadir';
          if (statusRaw.includes('lambat') || statusRaw.includes('late')) {
            status = 'Terlambat';
          } else if (statusRaw.includes('izin') || statusRaw.includes('ijin')) {
            status = 'Izin';
          } else if (statusRaw.includes('sakit') || statusRaw.includes('sick')) {
            status = 'Sakit';
          } else if (statusRaw.includes('alpa') || statusRaw.includes('alpha') || statusRaw.includes('tanpa')) {
            status = 'Alpa';
          }

          const jamRaw =
            normalizedRow['jam'] ||
            normalizedRow['jamscan'] ||
            normalizedRow['waktu'] ||
            normalizedRow['time'] ||
            '07:15';

          const catatan =
            normalizedRow['catatan'] ||
            normalizedRow['keterangan'] ||
            'Import Manual File Excel';

          // Match student in DB if exists
          const matchedStudent = existingStudents.find(
            (s) =>
              (nisnRaw && s.nisn === nisnRaw) ||
              (idQrRaw && s.id_qr === idQrRaw) ||
              (namaRaw && s.nama.toLowerCase() === namaRaw.toLowerCase())
          );

          const finalNisn = matchedStudent ? matchedStudent.nisn : nisnRaw || '0000000000';
          const finalNama = matchedStudent ? matchedStudent.nama : namaRaw || 'Siswa Import';
          const finalKelas = matchedStudent ? matchedStudent.kelas : kelasRaw || 'X 1';
          const finalIdQr = matchedStudent ? matchedStudent.id_qr : idQrRaw || String(Math.floor(60000000 + Math.random() * 30000000));

          if (!nisnRaw && !namaRaw && !matchedStudent) {
            errors.push(`Baris ${rowNum}: Dilewati karena NISN dan Nama tidak ditemukan.`);
            return;
          }

          // Build ISO timestamp
          let timeISO = new Date().toISOString();
          try {
            const dateParts = tanggalRaw.split(/[-/.]/);
            let year = new Date().getFullYear();
            let month = new Date().getMonth();
            let day = new Date().getDate();

            if (dateParts.length === 3) {
              if (dateParts[0].length === 4) {
                // YYYY-MM-DD
                year = parseInt(dateParts[0], 10);
                month = parseInt(dateParts[1], 10) - 1;
                day = parseInt(dateParts[2], 10);
              } else {
                // DD-MM-YYYY
                day = parseInt(dateParts[0], 10);
                month = parseInt(dateParts[1], 10) - 1;
                year = parseInt(dateParts[2], 10);
              }
            }

            const [hStr, mStr] = jamRaw.split(':');
            const hour = parseInt(hStr || '7', 10);
            const min = parseInt(mStr || '15', 10);

            const timestampDate = new Date(year, month, day, hour, min, 0);
            if (!isNaN(timestampDate.getTime())) {
              timeISO = timestampDate.toISOString();
            }
          } catch {
            // fallback to current ISO string
          }

          parsedData.push({
            tanggal: tanggalRaw,
            timestamp: timeISO,
            nisn: finalNisn,
            nama: finalNama,
            kelas: finalKelas,
            id_qr: finalIdQr,
            jenis,
            status,
            petugas: currentOfficer || 'Petugas Import',
            catatan,
          });
        });

        resolve({
          success: parsedData.length > 0,
          data: parsedData,
          errors,
          totalRows: rawJson.length,
        });
      } catch (err) {
        resolve({
          success: false,
          data: [],
          errors: [`Error membaca file: ${(err as Error).message || 'Format tidak valid'}`],
          totalRows: 0,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['Terjadi kesalahan saat membaca file.'],
        totalRows: 0,
      });
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Exports attendance records array to CSV file format
 */
export function exportAttendanceToCSV(
  records: AttendanceRecord[],
  filenamePrefix = 'Rekap_Absensi_NEXA15',
  cutoffTime = '07:15'
) {
  const headers = [
    'No',
    'Tanggal',
    'Waktu Scan',
    'NISN',
    'Nama',
    'Kelas',
    'ID QR',
    'Jenis Absensi',
    'Status',
    'Waktu Terlambat',
    'Jumlah Menit Terlambat',
    'Petugas',
    'Catatan',
  ];

  const rows = records.map((r, index) => {
    const lateMinutes = calculateLateMinutes(r, cutoffTime);
    const timeScan = r.timestamp
      ? new Date(r.timestamp).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jayapura',
        }) + ' WIT'
      : '-';

    return [
      index + 1,
      r.tanggal,
      timeScan,
      r.nisn,
      r.nama,
      r.kelas,
      r.id_qr,
      r.jenis,
      r.status,
      formatLateDuration(lateMinutes),
      lateMinutes > 0 ? lateMinutes : 0,
      r.petugas,
      r.catatan || '-',
    ];
  });

  const escapeCSV = (val: unknown) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports monthly aggregate summaries to CSV file format
 */
export function exportMonthlyAggregateToCSV(
  summaries: Array<{
    student: Student;
    hadir: number;
    terlambat: number;
    totalTerlambatMenit: number;
    izin: number;
    sakit: number;
    alpa: number;
    totalMasuk: number;
    persentaseHadir: number;
  }>,
  monthFilter: string
) {
  const headers = [
    'No',
    'NISN',
    'Nama',
    'Kelas',
    'Hadir',
    'Terlambat',
    'Total Waktu Terlambat',
    'Jumlah Menit Terlambat',
    'Izin',
    'Sakit',
    'Alpa',
    'Total Kehadiran',
    'Persentase Kehadiran',
  ];

  const rows = summaries.map((item, idx) => [
    idx + 1,
    item.student.nisn,
    item.student.nama,
    item.student.kelas,
    item.hadir,
    item.terlambat,
    formatLateDuration(item.totalTerlambatMenit),
    item.totalTerlambatMenit,
    item.izin,
    item.sakit,
    item.alpa,
    item.totalMasuk,
    `${item.persentaseHadir}%`,
  ]);

  const escapeCSV = (val: unknown) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Rekap_Bulanan_Absensi_NEXA15_${monthFilter}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface LateDetailItem {
  tanggal: string;
  lateMinutes: number;
  jamMasuk?: string;
}

export interface LateGuidanceExportItem {
  student: Student;
  lateCount: number;
  totalLateMinutes: number;
  avgLateMinutes: number;
  lateDates: string[];
  lateDetails?: LateDetailItem[];
  alpaCount: number;
  alpaDates: string[];
  sakitCount?: number;
  izinCount?: number;
  riskLevel: 'Kritis' | 'Sedang' | 'Ringan' | 'Normal';
  rekomendasiPembinaan: string;
  tindakanSelanjutnya: string;
}

export function generateWhatsAppLateGuidanceMessage(
  student: Student,
  lateCount: number,
  totalLateMinutes: number,
  lateDates: string[],
  schoolName = 'SMA Negeri 15 Ambon',
  lateDetails?: LateDetailItem[],
  alpaCount = 0,
  alpaDates: string[] = []
): string {
  let datesFormatted = '';
  if (lateDetails && lateDetails.length > 0) {
    datesFormatted = lateDetails.slice(0, 5).map((d) => `${d.tanggal} (+${d.lateMinutes}m)`).join(', ') + (lateDetails.length > 5 ? ` (+${lateDetails.length - 5} hari lainnya)` : '');
  } else {
    datesFormatted = lateDates.slice(0, 5).join(', ') + (lateDates.length > 5 ? ` (+${lateDates.length - 5} hari lainnya)` : '');
  }
  const durationText = formatLateDuration(totalLateMinutes);
  const alpaDatesFormatted = alpaDates.slice(0, 5).join(', ') + (alpaDates.length > 5 ? ` (+${alpaDates.length - 5} hari lainnya)` : '');

  let guidanceText = '';
  if (alpaCount >= 3 || lateCount >= 5) {
    guidanceText = 'Siswa terdaftar dalam pembinaan khusus kesiswaan & Bimbingan Konseling (BK). Bapak/Ibu Orang Tua dimohon hadir ke sekolah untuk koordinasi dengan Wali Kelas dan Tim BK.';
  } else if (alpaCount >= 1 || lateCount >= 3) {
    guidanceText = 'Siswa diberikan peringatan kedisiplinan dan pembinaan oleh Wali Kelas. Mohon bantuan Bapak/Ibu untuk memastikan kehadiran dan jam berangkat putra/putri dari rumah.';
  } else {
    guidanceText = 'Siswa telah diberikan teguran lisan & pengarahan kedisiplinan agar selalu hadir tepat waktu sebelum bel masuk (07.15 WIT).';
  }

  let detailsSection = '';
  if (lateCount > 0) {
    detailsSection += `⏰ Keterlambatan: *${lateCount} Kali* (Total Durasi: ${durationText})\n📅 Tanggal Terlambat: ${datesFormatted || '-'}\n`;
  }
  if (alpaCount > 0) {
    detailsSection += `❌ Tanpa Keterangan (Alpa): *${alpaCount} Hari*\n📅 Tanggal Alpa: ${alpaDatesFormatted || '-'}\n`;
  }
  if (!detailsSection) {
    detailsSection = `✅ Catatan Kehadiran: Tepat waktu & tidak ada alpa.\n`;
  }

  return (
    `Yth. Orang Tua / Wali Murid dari *${student.nama || 'Siswa'}* (Kelas ${student.kelas || '-'}),\n\n` +
    `Salam hormat dari *${schoolName}*.\n\n` +
    `Pemberitahuan Rekapitulasi Kedisiplinan & Kehadiran Siswa:\n` +
    `📌 Nama Siswa: *${student.nama}*\n` +
    `🏫 Kelas: ${student.kelas}\n` +
    detailsSection + `\n` +
    `📋 *Rekomendasi Pembinaan Kedisiplinan & BK*:\n` +
    `${guidanceText}\n\n` +
    `Mari bersama-sama membimbing kedisiplinan dan kehadiran putra/putri kita demi kebaikan dan masa depan mereka.\n\n` +
    `Terima kasih atas kerja sama dan perhatian Bapak/Ibu.\n` +
    `_Pesan Otomatis Tim Kesiswaan & BK ${schoolName}_`
  );
}

export function exportLateGuidanceToExcel(items: LateGuidanceExportItem[], periodTitle = 'Periode Aktif', filterKelas = 'Semua') {
  const data = items.map((item, idx) => ({
    No: idx + 1,
    NISN: item.student.nisn,
    'Nama Siswa': item.student.nama,
    Kelas: item.student.kelas,
    'Frekuensi Terlambat': item.lateCount > 0 ? `${item.lateCount}x` : '-',
    'Total Menit Terlambat': item.totalLateMinutes,
    'Total Durasi Terlambat': item.lateCount > 0 ? formatLateDuration(item.totalLateMinutes) : '-',
    'Rincian Tanggal Terlambat': item.lateDetails && item.lateDetails.length > 0
      ? item.lateDetails.map((d) => `${d.tanggal} (${d.lateMinutes} mnt)`).join('; ')
      : item.lateDates.length > 0 ? item.lateDates.join(', ') : '-',
    'Jumlah Hari Alpa': item.alpaCount > 0 ? `${item.alpaCount} Hari` : '0 Hari',
    'Rincian Tanggal Alpa': item.alpaDates.length > 0 ? item.alpaDates.join(', ') : '-',
    'Tingkat Risiko Kedisiplinan': item.riskLevel,
    'Rekomendasi Pembinaan BK & Wali Kelas': item.rekomendasiPembinaan,
    'Tindakan Selanjutnya': item.tindakanSelanjutnya,
    'No HP Ortu / WA': item.student.no_hp_ortu || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 28 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 30 },
    { wch: 16 },
    { wch: 25 },
    { wch: 16 },
    { wch: 45 },
    { wch: 30 },
    { wch: 18 },
  ];
  const workbook = XLSX.utils.book_new();
  const sheetName = `Kedisiplinan_${filterKelas.replace(/\s+/g, '_')}`;
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `Laporan_Resmi_Kedisiplinan_Alpa_${filterKelas}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export const MALUKU_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
  <path d="M 100,5 C 160,5 195,30 195,120 C 195,190 140,230 100,238 C 60,230 5,190 5,120 C 5,30 40,5 100,5 Z" fill="#15803D" stroke="#EAB308" stroke-width="8"/>
  <path d="M 100,15 C 150,15 182,38 182,120 C 182,180 135,218 100,225 C 65,218 18,180 18,120 C 18,38 50,15 100,15 Z" fill="#166534" stroke="#FACC15" stroke-width="3"/>
  <ellipse cx="100" cy="110" rx="55" ry="70" fill="#DC2626" stroke="#FEF08A" stroke-width="3"/>
  <path d="M 100,50 L 100,155 M 80,100 Q 100,80 120,100 M 75,120 Q 100,95 125,120" stroke="#FACC15" stroke-width="6" fill="none"/>
  <polygon points="100,38 104,48 115,48 106,55 109,66 100,59 91,66 94,55 85,48 96,48" fill="#FACC15" />
  <path d="M 50,165 Q 100,150 150,165 L 145,185 Q 100,170 55,185 Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
  <text x="100" y="178" font-size="16" font-weight="900" fill="#0F172A" text-anchor="middle" font-family="sans-serif">SIWALIMA</text>
</svg>`;

export const SMAN15_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="200" height="220">
  <defs>
    <clipPath id="pentagonClipExport">
      <polygon points="100,6 194,72 160,194 40,194 6,72" />
    </clipPath>
    <path id="textArcExport" d="M 35,92 A 65,65 0 0,1 165,92" fill="none" />
    <linearGradient id="skyGradExport" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#BAE6FD" />
      <stop offset="100%" stop-color="#7DD3FC" />
    </linearGradient>
  </defs>
  <g clip-path="url(#pentagonClipExport)">
    <rect x="0" y="0" width="200" height="72" fill="#FFFFFF" />
    <rect x="0" y="72" width="200" height="128" fill="url(#skyGradExport)" />
  </g>
  <polygon points="100,6 194,72 160,194 40,194 6,72" fill="none" stroke="#0F172A" stroke-width="4" stroke-linejoin="round" />
  <polygon points="100,12 105,25 119,25 108,34 112,47 100,39 88,47 92,34 81,25 95,25" fill="#F59E0B" stroke="#B45309" stroke-width="1.2" />
  <text fill="#0F172A" font-size="13" font-weight="900" font-family="sans-serif">
    <textPath href="#textArcExport" startOffset="50%" text-anchor="middle">SMA NEGERI 15</textPath>
  </text>
  <g stroke="#15803D" fill="#166534">
    <path d="M 68,130 Q 52,105 65,80" fill="none" stroke-width="2.5" />
    <circle cx="56" cy="88" r="4" fill="#15803D" />
    <circle cx="53" cy="98" r="4.5" fill="#15803D" />
    <circle cx="56" cy="110" r="4" fill="#15803D" />
    <circle cx="62" cy="120" r="3.5" fill="#15803D" />
    <circle cx="62" cy="82" r="3" fill="#FFFFFF" stroke="#047857" stroke-width="1" />
    <circle cx="48" cy="94" r="3" fill="#FFFFFF" stroke="#047857" stroke-width="1" />
    <circle cx="50" cy="106" r="3" fill="#FFFFFF" stroke="#047857" stroke-width="1" />
    <circle cx="57" cy="116" r="3" fill="#FFFFFF" stroke="#047857" stroke-width="1" />
  </g>
  <g fill="#EAB308" stroke="#CA8A04" stroke-width="0.8">
    <path d="M 132,130 Q 148,105 135,80" fill="none" stroke="#CA8A04" stroke-width="2.5" />
    <ellipse cx="138" cy="82" rx="3" ry="5" transform="rotate(30 138 82)" />
    <ellipse cx="145" cy="90" rx="3" ry="5" transform="rotate(35 145 90)" />
    <ellipse cx="148" cy="100" rx="3" ry="5" transform="rotate(25 148 100)" />
    <ellipse cx="146" cy="110" rx="3" ry="5" transform="rotate(15 146 110)" />
    <ellipse cx="141" cy="120" rx="3" ry="5" transform="rotate(5 141 120)" />
  </g>
  <path d="M 95,145 L 105,145 L 102,110 L 98,110 Z" fill="#334155" />
  <path d="M 100,85 C 92,98 90,105 100,112 C 110,105 108,98 100,85 Z" fill="#DC2626" />
  <path d="M 100,90 C 95,98 94,103 100,108 C 106,103 105,98 100,90 Z" fill="#FACC15" />
  <path d="M 75,160 Q 100,152 125,160 L 125,178 Q 100,170 75,178 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="2" />
  <path d="M 100,155 L 100,174" stroke="#1E293B" stroke-width="1.5" />
  <text x="100" y="190" font-size="12" font-weight="900" fill="#0F172A" text-anchor="middle" font-family="sans-serif">AMBON</text>
</svg>`;

let malukuLogoPng: string | null = null;
let sman15LogoPng: string | null = null;

export function initKopLogos() {
  if (typeof window === 'undefined' || (malukuLogoPng && sman15LogoPng)) return;

  const renderSvgToPng = (svgStr: string, w: number, h: number, setter: (url: string) => void) => {
    try {
      const img = new Image();
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          setter(dataUrl);
        }
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    } catch {
      // ignore
    }
  };

  renderSvgToPng(MALUKU_LOGO_SVG, 200, 240, (url) => { malukuLogoPng = url; });
  renderSvgToPng(SMAN15_LOGO_SVG, 200, 220, (url) => { sman15LogoPng = url; });
}

if (typeof window !== 'undefined') {
  initKopLogos();
}

export function drawOfficialKopSurat(doc: jsPDF, orientation: 'landscape' | 'portrait' = 'landscape'): number {
  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? 297 : 210;
  const centerX = pageWidth / 2;
  const marginX = isLandscape ? 14 : 12;
  const rightX = pageWidth - marginX;

  const logoW = isLandscape ? 22 : 18;
  const logoH = isLandscape ? 25 : 21;
  const leftLogoX = marginX;
  const rightLogoX = rightX - logoW;

  // Render Left Logo (Maluku Siwalima)
  if (malukuLogoPng) {
    try {
      doc.addImage(malukuLogoPng, 'PNG', leftLogoX, 4, logoW, logoH);
    } catch {
      // Fallback
    }
  } else {
    doc.setFillColor(21, 128, 61);
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.5);
    doc.roundedRect(leftLogoX, 5, logoW, logoH, 2, 2, 'FD');
    doc.setFillColor(220, 38, 38);
    doc.ellipse(leftLogoX + logoW/2, 13, logoW/2 - 3, logoH/2 - 5, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(leftLogoX + 2, 22, logoW - 4, 5, 'F');
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('SIWALIMA', leftLogoX + logoW/2, 25.5, { align: 'center' });
  }

  // Render Right Logo (SMA Negeri 15 Ambon)
  if (sman15LogoPng) {
    try {
      doc.addImage(sman15LogoPng, 'PNG', rightLogoX, 4, logoW, logoH);
    } catch {
      // Fallback
    }
  } else {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.roundedRect(rightLogoX, 5, logoW, logoH, 2, 2, 'FD');
    doc.setFillColor(125, 211, 252);
    doc.rect(rightLogoX, 15, logoW, logoH - 10, 'F');
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('SMAN 15', rightLogoX + logoW/2, 13, { align: 'center' });
    doc.text('AMBON', rightLogoX + logoW/2, 25.5, { align: 'center' });
  }

  // Header Typography
  doc.setTextColor(0, 0, 0);

  // Line 1: PEMERINTAH PROVINSI MALUKU
  doc.setFont('times', 'bold');
  doc.setFontSize(isLandscape ? 13 : 11);
  doc.text('PEMERINTAH PROVINSI MALUKU', centerX, 10.5, { align: 'center' });

  // Line 2: DINAS PENDIDIKAN DAN KEBUDAYAAN
  doc.setFont('times', 'bold');
  doc.setFontSize(isLandscape ? 14 : 12);
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', centerX, 16, { align: 'center' });

  // Line 3: SMA NEGERI 15 AMBON
  doc.setFont('times', 'bold');
  doc.setFontSize(isLandscape ? 16.5 : 14.5);
  doc.text('SMA NEGERI 15 AMBON', centerX, 22.5, { align: 'center' });

  // Line 4: Jln. Wara Kembang Buton, Hative Kecil, Ambon, 97128
  doc.setFont('times', 'normal');
  doc.setFontSize(isLandscape ? 9.5 : 8.5);
  doc.text('Jln. Wara Kembang Buton, Hative Kecil, Ambon, 97128', centerX, 27, { align: 'center' });

  // Double Line Separator
  // Top Line (Thick)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.0);
  doc.line(marginX, 29.5, rightX, 29.5);

  // Bottom Line (Thin)
  doc.setLineWidth(0.3);
  doc.line(marginX, 30.8, rightX, 30.8);

  return 33;
}

export function exportLateGuidanceToPDF(items: LateGuidanceExportItem[], periodTitle = 'Periode Aktif', filterKelas = 'Semua') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Kop Surat Resmi
  const startY = drawOfficialKopSurat(doc, 'landscape');

  doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PEMBINAAN KEDISIPLINAN & KETIDAKHADIRAN SISWA', 148.5, startY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const classLabel = filterKelas !== 'Semua' ? `KELAS: ${filterKelas}` : 'SEMUA KELAS';
  doc.text(`Laporan Rekapitulasi Keterlambatan & Alpa (${periodTitle}) | ${classLabel} - Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 148.5, startY + 8.5, { align: 'center' });
  doc.text(`Total Siswa Indisiplin/Alpa: ${items.length} Siswa | Dokumen Pertanggungjawaban Resmi Kepada Orang Tua / Wali`, 148.5, startY + 12.5, { align: 'center' });

  const tableHead = [['No', 'NISN', 'Nama Siswa', 'Kelas', 'Terlambat', 'Alpa', 'Rincian Tanggal Terlambat', 'Rincian Tanggal Alpa', 'Risiko', 'Rekomendasi Pembinaan BK', 'No. WA Ortu']];
  const tableBody = items.map((item, i) => {
    let lateDetailsText = '';
    if (item.lateDetails && item.lateDetails.length > 0) {
      lateDetailsText = item.lateDetails
        .map((d) => `${d.tanggal}: +${d.lateMinutes} mnt`)
        .join('\n');
    } else if (item.lateDates && item.lateDates.length > 0) {
      lateDetailsText = item.lateDates.join('\n');
    } else {
      lateDetailsText = '-';
    }

    const alpaDetailsText = item.alpaDates && item.alpaDates.length > 0 ? item.alpaDates.join('\n') : '-';

    return [
      i + 1,
      item.student.nisn,
      item.student.nama,
      item.student.kelas,
      item.lateCount > 0 ? `${item.lateCount}x (${formatLateDuration(item.totalLateMinutes)})` : '-',
      item.alpaCount > 0 ? `${item.alpaCount} Hari` : '0 Hari',
      lateDetailsText,
      alpaDetailsText,
      item.riskLevel.toUpperCase(),
      item.rekomendasiPembinaan,
      item.student.no_hp_ortu || '-',
    ];
  });

  autoTable(doc, {
    startY: startY + 15,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 20 },
      2: { cellWidth: 32 },
      3: { cellWidth: 14 },
      4: { cellWidth: 16 },
      5: { cellWidth: 14 },
      6: { cellWidth: 36 },
      7: { cellWidth: 28 },
      8: { cellWidth: 16 },
      9: { cellWidth: 62 },
      10: { cellWidth: 23 },
    },
  });

  // Calculate signature position
  let sigY = (doc as any).lastAutoTable?.finalY || 160;
  if (sigY + 45 > 200) {
    doc.addPage();
    sigY = 20;
  } else {
    sigY += 8;
  }

  // Signature Block
  const formattedToday = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text(`Ambon, ${formattedToday}`, 220, sigY);
  sigY += 5;

  const colWidth = 65;
  const col1 = 14;
  const col2 = col1 + colWidth;
  const col3 = col2 + colWidth;
  const col4 = col3 + colWidth;

  doc.setFont('helvetica', 'bold');
  doc.text('Guru Bimbingan Konseling (BK)', col1, sigY);
  doc.text('Wali Kelas', col2, sigY);
  doc.text('Orang Tua / Wali Siswa', col3, sigY);
  doc.text('Mengetahui: Kepala Sekolah', col4, sigY);

  const finalSigY = sigY + 22;
  doc.setFont('helvetica', 'normal');
  doc.text('(................................................)', col1, finalSigY);
  doc.text('(................................................)', col2, finalSigY);
  doc.text('(................................................)', col3, finalSigY);
  doc.text('(................................................)', col4, finalSigY);

  doc.setFontSize(7);
  doc.text('NIP. ........................................', col1, finalSigY + 4);
  doc.text('NIP. ........................................', col2, finalSigY + 4);
  doc.text('Tanda Tangan & Nama Terang', col3, finalSigY + 4);
  doc.text('NIP. ........................................', col4, finalSigY + 4);

  doc.save(`Laporan_Resmi_Kedisiplinan_Alpa_${filterKelas}_NEXA15.pdf`);
}

// =========================================================================
// EXPORT & IMPORT UTILITIES FOR TEACHERS (GURU & STAF)
// =========================================================================

export function exportTeacherListToExcel(teachers: Teacher[], schoolName = 'SMA NEGERI 15 AMBON') {
  const data = teachers.map((t, idx) => ({
    No: idx + 1,
    NIP: t.nip,
    'Nama Lengkap': t.nama,
    Jabatan: t.jabatan,
    Status: t.status === 'nonaktif' ? 'Nonaktif' : 'Aktif',
    'ID QR Code': t.id_qr || `69933068.${t.nip}`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Guru');

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 35 },
    { wch: 30 },
    { wch: 12 },
    { wch: 30 },
  ];

  XLSX.writeFile(workbook, `Data_Guru_${schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTeacherListToCSV(teachers: Teacher[]) {
  const headers = ['No', 'NIP', 'Nama', 'Jabatan', 'Status', 'ID_QR'];
  const rows = teachers.map((t, idx) => [
    idx + 1,
    `"${t.nip}"`,
    `"${t.nama}"`,
    `"${t.jabatan}"`,
    `"${t.status || 'aktif'}"`,
    `"${t.id_qr || `69933068.${t.nip}`}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Data_Guru_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadTeacherImportTemplate() {
  const sampleData = [
    {
      NIP: '196803151994031008',
      Nama: 'Drs. La Ode Alimin, M.Pd.',
      Jabatan: 'Kepala Sekolah',
      Status: 'aktif',
    },
    {
      NIP: '197505122002122004',
      Nama: 'Dra. Siti Aminah, M.Pd.',
      Jabatan: 'Guru Bahasa Indonesia',
      Status: 'aktif',
    },
    {
      NIP: '198208142008011012',
      Nama: 'Ahmad Fauzi, S.Pd., M.Si.',
      Jabatan: 'Guru Matematika',
      Status: 'aktif',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Import Guru');

  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 35 },
    { wch: 30 },
    { wch: 15 },
  ];

  XLSX.writeFile(workbook, 'Template_Import_Data_Guru_NIP.xlsx');
}

export async function parseTeacherImportFile(file: File): Promise<Omit<Teacher, 'id' | 'createdAt'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!json || json.length === 0) {
          throw new Error('File tidak memiliki baris data.');
        }

        const parsedTeachers: Omit<Teacher, 'id' | 'createdAt'>[] = [];

        json.forEach((row) => {
          // Cari field nama, nip, jabatan fleksibel
          const nip = String(row['NIP'] || row['nip'] || row['Nomor Induk Pegawai'] || row['Nip'] || '').trim();
          const nama = String(row['Nama'] || row['nama'] || row['Nama Lengkap'] || row['Nama Guru'] || '').trim();
          const jabatan = String(row['Jabatan'] || row['jabatan'] || row['Posisi'] || row['Tugas'] || 'Guru Mata Pelajaran').trim();
          const statusRaw = String(row['Status'] || row['status'] || 'aktif').toLowerCase().trim();
          const status = statusRaw.includes('non') ? 'nonaktif' : 'aktif';

          if (nama && nip) {
            parsedTeachers.push({
              nip,
              nama,
              jabatan: jabatan || 'Guru',
              status,
              id_qr: `69933068.${nip}`,
            });
          }
        });

        if (parsedTeachers.length === 0) {
          throw new Error('Kolom NIP dan Nama wajib ada pada file excel/csv.');
        }

        resolve(parsedTeachers);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

export function exportTeacherAttendanceToExcel(
  records: TeacherAttendanceRecord[],
  options: {
    schoolName?: string;
    filterDate?: string;
    filterMonth?: string;
    filterStatus?: string;
    filterJabatan?: string;
  } = {}
) {
  const { schoolName = 'SMA NEGERI 15 AMBON' } = options;

  const data = records.map((r, idx) => {
    let scanTime = '-';
    if (r.timestamp) {
      const d = new Date(r.timestamp);
      scanTime = !isNaN(d.getTime())
        ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' }) + ' WIT'
        : r.timestamp;
    }

    return {
      No: idx + 1,
      Tanggal: r.tanggal,
      'Waktu Scan': scanTime,
      NIP: r.nip,
      'Nama Guru': r.nama,
      Jabatan: r.jabatan,
      'Jenis Presensi': r.jenis,
      Status: r.status,
      'Terlambat (Menit)': r.terlambatMenit || 0,
      'Keterangan / Catatan': r.catatan || '-',
      Petugas: r.petugas || 'Petugas Piket',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi Guru');

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 32 },
    { wch: 28 },
    { wch: 15 },
    { wch: 14 },
    { wch: 18 },
    { wch: 30 },
    { wch: 20 },
  ];

  XLSX.writeFile(
    workbook,
    `Rekap_Presensi_Guru_${schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function exportTeacherAttendanceToPDF(
  records: TeacherAttendanceRecord[],
  options: {
    schoolName?: string;
    schoolNPSN?: string;
    filterDate?: string;
    filterMonth?: string;
    filterStatus?: string;
    filterJabatan?: string;
    kepsekName?: string;
    kepsekNIP?: string;
  } = {}
) {
  const {
    schoolName = 'SMA NEGERI 15 AMBON',
    schoolNPSN = '69933068',
    filterDate = '',
    filterMonth = '',
    filterStatus = 'Semua',
    filterJabatan = 'Semua',
    kepsekName = 'Drs. La Ode Alimin, M.Pd.',
    kepsekNIP = '196803151994031008',
  } = options;

  const doc = new jsPDF('landscape', 'mm', 'a4');

  // School Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`PEMERINTAH PROVINSI MALUKU - DINAS PENDIDIKAN`, 148.5, 12, { align: 'center' });
  doc.text(schoolName.toUpperCase(), 148.5, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NPSN: ${schoolNPSN} | Alamat: Jln. Dr. Leimena, Hative Besar, Kec. Teluk Ambon | Kota Ambon`, 148.5, 23, { align: 'center' });

  // Divider line
  doc.setLineWidth(0.6);
  doc.setDrawColor(30, 41, 59);
  doc.line(14, 26, 283, 26);
  doc.setLineWidth(0.2);
  doc.line(14, 27, 283, 27);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN REKAPITULASI PRESENSI GURU DAN TENAGA KEPENDIDIKAN', 148.5, 34, { align: 'center' });

  // Filter Subtitle
  const periodText = filterDate
    ? `Tanggal: ${filterDate}`
    : filterMonth
    ? `Bulan: ${filterMonth}`
    : 'Semua Periode';
  const statusText = filterStatus !== 'Semua' ? `Status: ${filterStatus}` : 'Semua Status';
  const jabatanText = filterJabatan !== 'Semua' ? `Jabatan: ${filterJabatan}` : 'Semua Jabatan';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${periodText} | ${statusText} | ${jabatanText} | Total Data: ${records.length} Presensi`, 148.5, 39, { align: 'center' });

  const tableHead = [
    ['No', 'Tanggal', 'Waktu', 'NIP Guru', 'Nama Lengkap', 'Jabatan', 'Jenis', 'Status', 'Keterangan', 'Petugas']
  ];

  const tableBody = records.map((r, i) => {
    let scanTime = '-';
    if (r.timestamp) {
      const d = new Date(r.timestamp);
      scanTime = !isNaN(d.getTime())
        ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' })
        : '-';
    }

    return [
      i + 1,
      r.tanggal,
      scanTime,
      r.nip,
      r.nama,
      r.jabatan,
      r.jenis,
      r.status,
      r.terlambatMenit && r.terlambatMenit > 0 ? `Terlambat +${r.terlambatMenit} mnt` : r.catatan || '-',
      r.petugas || 'Petugas Piket',
    ];
  });

  autoTable(doc, {
    startY: 44,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { cellWidth: 16 },
      3: { cellWidth: 32 },
      4: { cellWidth: 50 },
      5: { cellWidth: 44 },
      6: { cellWidth: 18 },
      7: { cellWidth: 20 },
      8: { cellWidth: 34 },
      9: { cellWidth: 25 },
    },
  });

  let sigY = (doc as any).lastAutoTable?.finalY || 150;
  if (sigY + 40 > 195) {
    doc.addPage();
    sigY = 20;
  } else {
    sigY += 10;
  }

  const formattedToday = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  doc.text(`Ambon, ${formattedToday}`, 220, sigY);
  sigY += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Petugas Piket / Operator Presensi,', 30, sigY);
  doc.text('Mengetahui: Kepala Sekolah,', 220, sigY);

  const finalSigY = sigY + 22;
  doc.setFont('helvetica', 'normal');
  doc.text('(................................................)', 30, finalSigY);
  doc.text(`( ${kepsekName} )`, 220, finalSigY);

  doc.setFontSize(7.5);
  doc.text('NIP. ........................................', 30, finalSigY + 4);
  doc.text(`NIP. ${kepsekNIP}`, 220, finalSigY + 4);

  doc.save(`Rekap_Presensi_Guru_${schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Format YYYY-MM to Indonesian Month Year (e.g. '2026-09' -> 'September 2026')
 */
export function formatIndoMonth(isoMonth: string): string {
  if (!isoMonth || isoMonth === 'Semua') return 'Semua Periode';
  const parts = isoMonth.split('-');
  if (parts.length < 2) return isoMonth;
  const y = parts[0];
  const m = parts[1];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const idx = parseInt(m, 10) - 1;
  return idx >= 0 && idx < 12 ? `${months[idx]} ${y}` : isoMonth;
}

/**
 * Ekspor Data Siswa Bermasalah ke File Excel untuk Arsip Wali Kelas & BK
 */
export function exportProblematicStudentsToExcel(
  items: Array<{
    student: Student;
    waliKelas: { name: string; nip?: string; phone?: string };
    totalDays: number;
    hadirCount: number;
    terlambatCount: number;
    sakitCount: number;
    izinCount: number;
    alpaCount: number;
    attendanceRate: number;
    riskLevel: string;
    reasons: string[];
    aiRecommendation?: string;
  }>,
  schoolName = 'SMA NEGERI 15 AMBON',
  filterKelas = 'Semua',
  filterBulan = 'Semua'
) {
  const periodStr = filterBulan && filterBulan !== 'Semua' ? formatIndoMonth(filterBulan) : 'Semua Periode (Akumulasi)';

  const data = items.map((item, index) => ({
    No: index + 1,
    'Nama Siswa': item.student.nama,
    NISN: item.student.nisn,
    Kelas: item.student.kelas,
    'Periode / Bulan': periodStr,
    'Wali Kelas': item.waliKelas.name,
    'No HP Wali Kelas': item.waliKelas.phone || '-',
    'No HP Orang Tua': item.student.no_hp_ortu || '-',
    'Tingkat Risiko': item.riskLevel,
    'Persentase Kehadiran': `${item.attendanceRate}%`,
    'Alpa (Tanpa Ket.)': item.alpaCount,
    'Terlambat (Kali)': item.terlambatCount,
    'Sakit (Hari)': item.sakitCount,
    'Izin (Hari)': item.izinCount,
    'Hadir Tepat Waktu': item.hadirCount,
    'Indikasi / Alasan': item.reasons.join('; '),
    'Rekomendasi Tindak Lanjut': item.aiRecommendation || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 45 },
    { wch: 45 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Siswa Bermasalah');
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanSchool = schoolName.replace(/\s+/g, '_');
  const cleanClass = (filterKelas || 'Semua').replace(/\s+/g, '_');
  const cleanBulan = (filterBulan || 'Semua').replace(/\s+/g, '_');
  XLSX.writeFile(workbook, `Rekap_Siswa_Bermasalah_${cleanSchool}_${cleanClass}_${cleanBulan}_${dateStr}.xlsx`);
}

/**
 * Ekspor Data Siswa Bermasalah ke Dokumen Resmi PDF Berkop Surat (BK & Wali Kelas)
 */
export function exportProblematicStudentsToPDF(
  items: Array<{
    student: Student;
    waliKelas: { name: string; nip?: string; phone?: string };
    totalDays: number;
    hadirCount: number;
    terlambatCount: number;
    sakitCount: number;
    izinCount: number;
    alpaCount: number;
    attendanceRate: number;
    riskLevel: string;
    reasons: string[];
    aiRecommendation?: string;
  }>,
  schoolName = 'SMA NEGERI 15 AMBON',
  filterKelas = 'Semua',
  filterBulan = 'Semua'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Kop Surat Resmi
  const startY = drawOfficialKopSurat(doc, 'landscape');

  doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LAPORAN REKAPITULASI SISWA BERMASALAH & PERLU PEMBINAAN', 148.5, startY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const classLabel = filterKelas !== 'Semua' && filterKelas !== 'Semua Kelas' ? `KELAS: ${filterKelas}` : 'SEMUA KELAS';
  const monthLabel = filterBulan && filterBulan !== 'Semua' ? `PERIODE: ${formatIndoMonth(filterBulan).toUpperCase()}` : 'SEMUA PERIODE (AKUMULASI)';
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(
    `Indikasi: Sering Alpa / Terlambat / Kehadiran Rendah | ${classLabel} | ${monthLabel}`,
    148.5,
    startY + 8.5,
    { align: 'center' }
  );
  doc.text(
    `Total: ${items.length} Siswa Terjaring Pembinaan | Dokumen Pertanggungjawaban Resmi BK, Wali Kelas & Kesiswaan - Tanggal Cetak: ${todayStr}`,
    148.5,
    startY + 12.5,
    { align: 'center' }
  );

  const tableHead = [
    [
      'No',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Wali Kelas',
      'Alpa',
      'Terlambat',
      'Hadir %',
      'Risiko',
      'Indikasi Masalah / Pelanggaran',
      'Rekomendasi Tindak Lanjut Pembinaan BK',
    ],
  ];

  const tableBody = items.map((item, i) => {
    return [
      i + 1,
      item.student.nisn,
      item.student.nama,
      item.student.kelas,
      item.waliKelas.name || '-',
      item.alpaCount > 0 ? `${item.alpaCount}x Alpa` : '0',
      item.terlambatCount > 0 ? `${item.terlambatCount}x Telat` : '0',
      `${item.attendanceRate}%`,
      item.riskLevel.toUpperCase(),
      item.reasons.join('; '),
      item.aiRecommendation || 'Konseling individual dengan Guru BK dan koordinasi Wali Kelas.',
    ];
  });

  autoTable(doc, {
    startY: startY + 15,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { cellWidth: 36 },
      3: { cellWidth: 14 },
      4: { cellWidth: 28 },
      5: { cellWidth: 14 },
      6: { cellWidth: 16 },
      7: { cellWidth: 16 },
      8: { cellWidth: 18 },
      9: { cellWidth: 49 },
      10: { cellWidth: 48 },
    },
  });

  // Calculate signature position
  let sigY = (doc as any).lastAutoTable?.finalY || 160;
  if (sigY + 45 > 200) {
    doc.addPage();
    sigY = 20;
  } else {
    sigY += 8;
  }

  // Signature Block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text(`Ambon, ${todayStr}`, 220, sigY);
  sigY += 5;

  const colWidth = 65;
  const col1 = 14;
  const col2 = col1 + colWidth;
  const col3 = col2 + colWidth;
  const col4 = col3 + colWidth;

  doc.setFont('helvetica', 'bold');
  doc.text('Koordinator Guru BK', col1, sigY);
  doc.text('Wali Kelas Yang Bersangkutan', col2, sigY);
  doc.text('Wakasek Bidang Kesiswaan', col3, sigY);
  doc.text('Mengetahui: Kepala Sekolah', col4, sigY);

  const finalSigY = sigY + 22;
  doc.setFont('helvetica', 'normal');
  doc.text('(................................................)', col1, finalSigY);
  doc.text('(................................................)', col2, finalSigY);
  doc.text('(................................................)', col3, finalSigY);
  doc.text('(................................................)', col4, finalSigY);

  doc.setFontSize(7);
  doc.text('NIP. ........................................', col1, finalSigY + 4);
  doc.text('NIP. ........................................', col2, finalSigY + 4);
  doc.text('NIP. ........................................', col3, finalSigY + 4);
  doc.text('NIP. ........................................', col4, finalSigY + 4);

  const cleanSchool = schoolName.replace(/\s+/g, '_');
  const cleanClass = (filterKelas || 'Semua').replace(/\s+/g, '_');
  const cleanBulan = (filterBulan || 'Semua').replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Rekap_Siswa_Bermasalah_${cleanSchool}_${cleanClass}_${cleanBulan}_${dateStr}.pdf`);
}




