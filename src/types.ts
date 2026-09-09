export type UserRole = 'Admin' | 'Guru' | 'Kepala Sekolah';
export type UserSubRole = 'Guru Piket' | 'Wali Kelas' | 'Staf TU' | 'Lainnya';

export interface User {
  uid: string;
  username: string; // e.g. "admin", "piket_senin", "budi123"
  email?: string;
  name: string;
  role: UserRole;
  subRole?: UserSubRole | string;
  assignedClass?: string; // e.g. "X-1", "XI IPA 1" (if Wali Kelas)
  nip?: string;
  phone?: string;
  password?: string; // Internal database auth password
  status: 'aktif' | 'nonaktif';
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  notes?: string;
}

export interface Student {
  id: string; // Document ID
  id_qr: string; // e.g. "69933068"
  rfid_uid?: string; // UID Kartu RFID / NFC (e.g. "04A1B2C3D4", "1234567890")
  nisn: string; // e.g. "3080370790"
  nama: string; // e.g. "DADANG BUAMONA"
  kelas: string; // e.g. "XI IPA 1"
  no_hp_ortu?: string; // No. WA / HP Orang Tua (e.g. 08123456789)
  foto: string;
  status: 'aktif' | 'nonaktif';
  createdAt?: string;
}

export type AttendanceType = 'Masuk' | 'Pulang';
export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa';
export type TeacherAttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Dinas Luar' | 'Cuti' | 'Alpa';
export type AttendanceScanMethod = 'QR' | 'RFID' | 'NFC' | 'Manual';

export interface Teacher {
  id: string; // Document ID
  nip: string; // Nomor Induk Pegawai (Kunci Identitas Utama)
  nama: string; // Nama Lengkap Guru & Gelar
  jabatan: string; // Jabatan / Mata Pelajaran (e.g. Guru Matematika, Kepala Sekolah)
  id_qr?: string; // QR Code Identifier
  rfid_uid?: string; // UID Kartu RFID / NFC
  wali_kelas?: string; // e.g. "X-1", "XI IPA 1", "XII MIPA 2"
  status: 'aktif' | 'nonaktif';
  no_hp?: string;
  foto?: string;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: string;
  tanggal: string; // Format standar ISO database & aplikasi: "YYYY-MM-DD"
  timestamp: string; // ISO String
  nisn: string;
  nama: string;
  kelas: string;
  id_qr: string;
  rfid_uid?: string; // UID Kartu RFID yang digunakan saat scan
  scan_method?: AttendanceScanMethod; // 'QR' | 'RFID' | 'NFC' | 'Manual'
  jenis: AttendanceType;
  status: AttendanceStatus;
  petugas: string; // Email/Name of officer scanning or logged in user
  catatan?: string;
  terlambatMenit?: number; // Late duration in minutes
}

export interface TeacherAttendanceRecord {
  id: string;
  tanggal: string; // Format standar ISO database & aplikasi: "YYYY-MM-DD"
  timestamp: string; // ISO String
  nip: string;
  nama: string;
  jabatan: string;
  id_qr?: string;
  rfid_uid?: string;
  scan_method?: AttendanceScanMethod;
  jenis: AttendanceType;
  status: TeacherAttendanceStatus;
  petugas: string;
  catatan?: string;
  terlambatMenit?: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
}

export interface Holiday {
  id: string;
  tanggal: string; // format YYYY-MM-DD
  keterangan: string;
}

export interface SchoolSettings {
  schoolName: string;
  schoolNPSN: string;
  schoolLogo?: string; // Base64 data URL or image URL for custom school logo
  schoolAddress?: string;
  schoolCity?: string;
  cutoffTime: string; // e.g. "07:15"
  autoAlpaCutoffTime?: string; // e.g. "14:30"
  enableAutoAlpa?: boolean; // default true
  schoolDays?: 5 | 6; // 5 = 5 Hari Sekolah (Senin - Jumat), 6 = 6 Hari Sekolah (Senin - Sabtu), default: 6
  academicYear: string;
  enableWaNotif?: boolean;
  waTemplateHadir?: string;
  waTemplateTerlambat?: string;
  waTemplateIzinSakit?: string;
  waTemplateAlpa?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  enableSupabaseAutoSync?: boolean;
  lastSupabaseSync?: string;
  holidays?: Holiday[];
  homeroomAssignments?: Record<string, { teacherName: string; teacherNip?: string; phone?: string }>;
  waTemplateWaliKelas?: string;
  problemThresholdAlpa?: number; // default: 2
  problemThresholdTerlambat?: number; // default: 3
  problemThresholdMinRate?: number; // default: 75
  // RFID & Contactless Card Support
  enableRfidReader?: boolean; // default true
  rfidReaderMode?: 'auto' | 'usb_keyboard' | 'web_nfc' | 'web_serial' | 'keyboard' | 'webhid' | 'serial';
  rfidCardType?: '13.56MHz_Mifare' | '125kHz_EM' | 'Dual';
  rfidBeepFeedback?: boolean;
  rfidAutoRecord?: boolean;
  rfidAllowUnregisteredCardPrompt?: boolean;
  rfidBeepSound?: boolean; // default true
  rfidFastTapDelay?: number; // default 1500 (ms)
  rfidPrefix?: string; // optional prefix filter (e.g. "")
  rfidSuffix?: string; // optional suffix filter (e.g. "")
}

export interface HomeroomAssignment {
  kelas: string;
  teacherNip?: string;
  teacherName?: string;
  phone?: string;
}

export interface ProblematicStudentDispatch {
  id: string;
  studentId?: string;
  studentName: string;
  nisn: string;
  kelas: string;
  waliKelasName: string;
  waliKelasPhone?: string;
  waliKelasNip?: string;
  riskLevel: 'Tinggi' | 'Sedang' | 'Perhatian';
  alpaCount: number;
  terlambatCount: number;
  sakitCount: number;
  izinCount: number;
  attendanceRate: number;
  reasons: string[];
  notes?: string;
  aiRecommendation?: string;
  dispatchedAt: string; // ISO date string
  dispatchedBy: string;
  channel: 'WhatsApp' | 'Cetak Lembar Disposisi' | 'Sistem Internal';
  status: 'Terkirim' | 'Menunggu Tindak Lanjut' | 'Selesai / Ditangani';
  tindakLanjutNotes?: string;
  resolvedAt?: string;
}

export interface FilterOptions {
  tanggal: string;
  bulan: string; // YYYY-MM
  kelas: string;
  nama: string;
  status: string;
}

export interface AIAnalysisRequest {
  type: 'attendance_summary' | 'risk_detection' | 'monthly_report';
  month?: string;
  kelas?: string;
}

export interface OfflineQueueItem {
  id: string;
  type: 'attendance' | 'attendance_sync' | 'attendance_clear' | 'student' | 'log';
  data: any;
  timestamp: string;
  retryCount: number;
}

export interface MissingAttendanceLogItem {
  logId: string;
  timestamp: string;
  dateFormatted: string;
  nama: string;
  nisn: string;
  kelas: string;
  jenis: AttendanceType;
  status: AttendanceStatus;
  petugas: string;
  action: string;
  details: string;
}


