import {
  Student,
  AttendanceRecord,
  AttendanceType,
  AttendanceStatus,
  AttendanceScanMethod,
  Teacher,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
  ActivityLog,
  SchoolSettings,
  User,
  Holiday,
  MissingAttendanceLogItem,
  ProblematicStudentDispatch,
  HomeroomAssignment,
} from '../types';
import { toast } from './toast';
import { INITIAL_TEACHERS } from './seedData';
import {
  isSupabaseConfigured,
  syncStudentsToSupabase,
  syncAttendanceToSupabase,
  syncTeachersToSupabase,
  syncTeacherAttendanceToSupabase,
  syncLogsToSupabase,
  syncUsersToSupabase,
  syncSettingsToSupabase,
  syncDispatchesToSupabase,
  fetchStudentsFromSupabase,
  fetchAttendanceFromSupabase,
  fetchTeachersFromSupabase,
  fetchTeacherAttendanceFromSupabase,
  fetchLogsFromSupabase,
  fetchUsersFromSupabase,
  fetchSettingsFromSupabase,
  fetchDispatchesFromSupabase,
  deleteStudentFromSupabase,
  deleteAttendanceFromSupabase,
  deleteTeacherFromSupabase,
  deleteTeacherAttendanceFromSupabase,
  deleteLogFromSupabase,
  deleteUserFromSupabase,
  deleteDispatchFromSupabase,
  subscribeToSupabaseAttendance,
  subscribeToSupabaseTeacherAttendance,
  migrateAllDataToSupabaseCloud,
  getSupabaseClient,
  purgeSaturdayAlpaFromSupabase,
} from './supabase';

import { formatPetugasRole } from './exportUtils';
import { 
  fetchUsersFromFirestore, 
  saveUserToFirestore, 
  deleteUserFromFirestore,
  fetchSettingsFromFirestore,
  saveSettingsToFirestore,
  fetchDispatchesFromFirestore,
  saveDispatchToFirestore,
  deleteDispatchFromFirestore,
  fetchStudentsFromFirestore,
  saveStudentToFirestore,
  saveMultipleStudentsToFirestore,
  deleteStudentFromFirestore,
  fetchTeachersFromFirestore,
  saveTeacherToFirestore,
  saveMultipleTeachersToFirestore,
  deleteTeacherFromFirestore,
  fetchAttendanceFromFirestore,
  saveAttendanceToFirestore,
  saveMultipleAttendanceToFirestore,
  deleteAttendanceFromFirestore,
  fetchTeacherAttendanceFromFirestore,
  saveTeacherAttendanceToFirestore,
  saveMultipleTeacherAttendanceToFirestore,
  deleteTeacherAttendanceFromFirestore,
  fetchLogsFromFirestore,
  saveLogToFirestore,
  purgeSaturdayAlpaFromFirestore,
  subscribeToTodayAttendance,
  subscribeToTodayTeacherAttendance,
} from './firebase';
import {
  hashPassword,
  hashPasswordSync,
  comparePassword,
  isHashedPassword,
  ensureHashedPassword,
} from './bcrypt';

const STORAGE_KEYS = {
  SETTINGS: 'nexa15_settings_v3',
  PASSWORDS: 'nexa15_passwords_v3',
  CURRENT_USER: 'nexa15_user_v3',
  USERS: 'nexa15_users_v3',
  STUDENTS: 'nexa15_students_v3',
  ATTENDANCE: 'nexa15_attendance_v3',
  TEACHERS: 'nexa15_teachers_v3',
  TEACHER_ATTENDANCE: 'nexa15_teacher_attendance_v3',
  LOGS: 'nexa15_logs_v3',
  SYNC_QUEUE: 'nexa15_sync_queue_v3',
  DISPATCHES: 'nexa15_dispatches_v3',
};

export const INITIAL_USERS: User[] = [
  {
    uid: 'usr-admin',
    username: 'admin',
    email: 'admin@sman15.sch.id',
    name: 'Super Administrator (NEXA15)',
    role: 'Admin',
    subRole: 'Super Admin',
    assignedClass: '',
    password: hashPasswordSync('admin'),
    status: 'aktif',
    createdAt: new Date().toISOString(),
    notes: 'Akun Utama Administrator Sistem',
  },
  {
    uid: 'usr-piket',
    username: 'guru_piket',
    email: 'piket@sman15.sch.id',
    name: 'Petugas Guru Piket',
    role: 'Guru',
    subRole: 'Guru Piket',
    assignedClass: '',
    password: hashPasswordSync('piket'),
    status: 'aktif',
    createdAt: new Date().toISOString(),
    notes: 'Petugas Piket Presensi Harian',
  },
  {
    uid: 'usr-kepsek',
    username: 'kepsek',
    email: 'kepsek@sman15.sch.id',
    name: 'Drs. H. Rustam Rumra, M.Pd',
    role: 'Kepala Sekolah',
    subRole: 'Kepala Sekolah',
    assignedClass: '',
    password: hashPasswordSync('kepsek'),
    status: 'aktif',
    createdAt: new Date().toISOString(),
    notes: 'Kepala SMA Negeri 15 Ambon',
  },
  {
    uid: 'usr-wali-x1',
    username: 'wali_x1',
    email: 'wali.x1@sman15.sch.id',
    name: 'Dra. Siti Aminah, M.Pd',
    role: 'Guru',
    subRole: 'Wali Kelas',
    assignedClass: 'X-1',
    password: hashPasswordSync('wali'),
    status: 'aktif',
    createdAt: new Date().toISOString(),
    notes: 'Wali Kelas X-1',
  },
];

export interface SyncQueueItem {
  id: string;
  type: 'attendance' | 'teacher_attendance' | 'student' | 'teacher' | 'log' | 'user' | 'settings' | 'dispatch';
  action: 'upsert' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  totalStudents: number;
  totalAttendance: number;
  uniqueAttendanceStudents: number;
  orphanedAttendanceCount: number;
  missingStudentDetails: Array<{
    nisn: string;
    name: string;
    class: string;
    scanCount: number;
  }>;
  backupInfo: {
    exists: boolean;
    timestamp: string | null;
    studentCount: number;
    attendanceCount: number;
  };
  discrepancies: string[];
  recommendations: string[];
}

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'SMA NEGERI 15 AMBON',
  schoolNPSN: '69933068',
  schoolLogo: '', // No hardcoded logo by default - allows upload/import in settings
  cutoffTime: '07:15',
  autoAlpaCutoffTime: '14:30',
  enableAutoAlpa: true,
  schoolDays: 6, // 6 = 6 Hari Sekolah (Senin - Sabtu), 5 = 5 Hari Sekolah (Senin - Jumat)
  academicYear: '2026/2027',
  enableWaNotif: true,
  waTemplateHadir: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ✅ *HADIR (Tepat Waktu)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateTerlambat: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ⏰ *TERLAMBAT* ({terlambat})\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateIzinSakit: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: 📄 *{status}*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateAlpa: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: ❌ *ALPA (Tanpa Keterangan)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateWaliKelas: 'Yth. Bapak/Ibu Wali Kelas *{kelas}* (*{wali_kelas}*),\n\nBerikut kami teruskan *Laporan Disposisi Siswa Butuh Perhatian Khusus / Bermasalah* dari Tim Kedisiplinan & Presensi Digital *{sekolah}*:\n\n👤 *Nama Siswa:* {nama}\n🔢 *NISN:* {nisn}\n🏫 *Kelas:* {kelas}\n📱 *No. HP/WA Ortu:* {no_hp_ortu}\n\n📊 *Catatan Kehadiran & Rekam Kedisiplinan:*\n• 📈 Persentase Kehadiran: *{persentase_kehadiran}*\n• ❌ Jumlah Alpa (Tanpa Keterangan): *{alpa} hari*\n• ⏰ Jumlah Keterlambatan: *{terlambat} kali*\n• 🩺 Jumlah Sakit/Izin: *{sakit_izin} hari*\n\n🚨 *Indikasi Masalah:*\n{alasan_masalah}\n\n💡 *Rekomendasi Tindak Lanjut Wali Kelas & BK:*\n{rekomendasi}\n\n📝 *Catatan Tambahan Petugas:*\n{catatan_petugas}\n\nMohon Bapak/Ibu Wali Kelas dapat segera menindaklanjuti dengan pembinaan internal, koordinasi Guru BK, serta pemanggilan Orang Tua / Wali murid ke sekolah jika diperlukan.\n\nTerima kasih atas dedikasi dan kerja sama Bapak/Ibu.\n_Tim Presensi & Kesiswaan {sekolah}_\n📅 {tanggal}',
  problemThresholdAlpa: 2,
  problemThresholdTerlambat: 3,
  problemThresholdMinRate: 75,
  homeroomAssignments: {},
  supabaseUrl: 'https://tpxyvbfbahsjssqwubfl.supabase.co',
  supabaseKey: 'sb_publishable_oH-2538e28kbMbpk8ESZ7w_LpeIn1Jh',
  enableSupabaseAutoSync: true,
  holidays: [],
  // RFID & Contactless Card Support
  enableRfidReader: true,
  rfidReaderMode: 'auto',
  rfidBeepSound: true,
  rfidFastTapDelay: 1500,
  rfidPrefix: '',
  rfidSuffix: '',
};

/**
 * Helper to check if a QR identifier is a generic template/NPSN placeholder rather than a unique student/teacher QR
 */
export function isGenericQrCode(qr?: string): boolean {
  if (!qr) return true;
  const v = qr.trim().toLowerCase();
  return (
    v === '' ||
    v === '69933068' ||
    v === 'smanegeri15ambon_template' ||
    v === 'templatesma15ambon' ||
    v === '69933068..' ||
    v === '69933068.'
  );
}

/**
 * Strict and resilient NISN matcher that compares exact and digit-normalized strings (ignoring leading zeros)
 */
export function isMatchingNisn(nisnA?: string, nisnB?: string): boolean {
  if (!nisnA || !nisnB) return false;
  const cleanA = String(nisnA).trim();
  const cleanB = String(nisnB).trim();
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  // Compare digit sequences without leading zeros
  const normA = cleanA.replace(/\D/g, '').replace(/^0+/, '');
  const normB = cleanB.replace(/\D/g, '').replace(/^0+/, '');
  if (normA && normB && normA === normB && normA.length >= 3) {
    return true;
  }
  return false;
}

/**
 * Strict NIP matcher for teachers
 */
export function isMatchingNip(nipA?: string, nipB?: string): boolean {
  if (!nipA || !nipB) return false;
  const cleanA = String(nipA).trim();
  const cleanB = String(nipB).trim();
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  const normA = cleanA.replace(/\D/g, '').replace(/^0+/, '');
  const normB = cleanB.replace(/\D/g, '').replace(/^0+/, '');
  if (normA && normB && normA === normB && normA.length >= 3) {
    return true;
  }
  return false;
}

/**
 * Strict and resilient RFID / NFC UID matcher (supports Hex, Decimal, colons/spaces stripped)
 */
export function isMatchingRfidUid(uidA?: string, uidB?: string): boolean {
  if (!uidA || !uidB) return false;
  const cleanA = String(uidA).replace(/[\s:-]+/g, '').trim().toUpperCase();
  const cleanB = String(uidB).replace(/[\s:-]+/g, '').trim().toUpperCase();
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  // Check if one is 10-digit decimal representation of 8-character hex UID (standard Wiegand-26 / Wiegand-34 / HID conversion)
  if (/^\d{8,12}$/.test(cleanA) && /^[0-9A-F]{6,16}$/i.test(cleanB)) {
    try {
      const decB = parseInt(cleanB, 16);
      if (!isNaN(decB) && (String(decB) === cleanA || String(decB).padStart(10, '0') === cleanA)) return true;
    } catch {}
  }
  if (/^\d{8,12}$/.test(cleanB) && /^[0-9A-F]{6,16}$/i.test(cleanA)) {
    try {
      const decA = parseInt(cleanA, 16);
      if (!isNaN(decA) && (String(decA) === cleanB || String(decA).padStart(10, '0') === cleanB)) return true;
    } catch {}
  }

  return false;
}

class AppStore {
  private users: User[] = [];
  private students: Student[] = [];
  private attendance: AttendanceRecord[] = [];
  private teachers: Teacher[] = [];
  private teacherAttendance: TeacherAttendanceRecord[] = [];
  private logs: ActivityLog[] = [];
  private dispatches: ProblematicStudentDispatch[] = [];
  private settings: SchoolSettings = DEFAULT_SETTINGS;
  private passwords: Record<string, string> = {
    'usr-admin': 'admin',
    'usr-kepsek': 'kepsek',
    'usr-guru': 'piket',
  };
  private currentUser: User | null = null;
  private listeners: Array<() => void> = [];
  private syncQueue: SyncQueueItem[] = [];
  private isSyncingQueue = false;

  constructor() {
    this.init();
  }

  private async init() {
    // Load settings, user, and cached data from localStorage
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }
      const savedPass = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
      if (savedPass) {
        this.passwords = JSON.parse(savedPass);
      }
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
      const savedUsersList = localStorage.getItem(STORAGE_KEYS.USERS);
      if (savedUsersList) {
        try {
          const parsed = JSON.parse(savedUsersList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.users = parsed;
          } else {
            this.users = [...INITIAL_USERS];
          }
        } catch {
          this.users = [...INITIAL_USERS];
        }
      } else {
        this.users = [...INITIAL_USERS];
      }

      // Automatically migrate any legacy plain-text passwords to bcrypt hashes
      let needsMigration = false;
      this.users = this.users.map((u) => {
        if (u.password && !isHashedPassword(u.password)) {
          needsMigration = true;
          return { ...u, password: ensureHashedPassword(u.password) };
        }
        return u;
      });

      Object.keys(this.passwords).forEach((key) => {
        if (this.passwords[key] && !isHashedPassword(this.passwords[key])) {
          this.passwords[key] = ensureHashedPassword(this.passwords[key]);
          needsMigration = true;
        }
      });

      if (needsMigration) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
        localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(this.passwords));
      }
      const savedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (savedStudents) {
        this.students = JSON.parse(savedStudents);
      }
      const savedAttendance = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (savedAttendance) {
        this.attendance = JSON.parse(savedAttendance);
      }
      const savedTeachers = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      if (savedTeachers) {
        this.teachers = JSON.parse(savedTeachers);
      } else {
        this.teachers = [...INITIAL_TEACHERS];
      }
      const savedTeacherAttendance = localStorage.getItem(STORAGE_KEYS.TEACHER_ATTENDANCE);
      if (savedTeacherAttendance) {
        this.teacherAttendance = JSON.parse(savedTeacherAttendance);
      }

      // Purge any Saturday Alpa records immediately from memory & local storage
      const hadSatAlpa = this.attendance.some((a) => a.status?.toLowerCase() === 'alpa' && this.isRecordOnSaturday(a));
      if (hadSatAlpa) {
        this.attendance = this.attendance.filter((a) => !(a.status?.toLowerCase() === 'alpa' && this.isRecordOnSaturday(a)));
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(this.attendance));
      }

      const hadSatTeacherAlpa = this.teacherAttendance.some((ta) => ta.status?.toLowerCase() === 'alpa' && this.isRecordOnSaturday(ta));
      if (hadSatTeacherAlpa) {
        this.teacherAttendance = this.teacherAttendance.filter((ta) => !(ta.status?.toLowerCase() === 'alpa' && this.isRecordOnSaturday(ta)));
        localStorage.setItem(STORAGE_KEYS.TEACHER_ATTENDANCE, JSON.stringify(this.teacherAttendance));
      }
      const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
      const savedQueue = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (savedQueue) {
        this.syncQueue = JSON.parse(savedQueue);
      }
      const savedDispatches = localStorage.getItem(STORAGE_KEYS.DISPATCHES);
      if (savedDispatches) {
        this.dispatches = JSON.parse(savedDispatches);
      }
      this.processAutoAlpa();
      this.sanitizeData();
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }

    // Set up network & visibility listeners to ensure zero data is lost
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processPendingSyncQueue();
        this.fetchFromServer();
      });
      window.addEventListener('focus', () => {
        if (this.syncQueue.length > 0) {
          this.processPendingSyncQueue();
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.syncQueue.length > 0) {
          this.processPendingSyncQueue();
        }
      });
      window.addEventListener('beforeunload', (e) => {
        this.saveLocalData(true);
        if (this.syncQueue.length > 0) {
          e.preventDefault();
          e.returnValue = `Peringatan: Masih terdapat ${this.syncQueue.length} data presensi yang sedang mengantri untuk disimpan ke Cloud. Tetap ingin menutup halaman?`;
          return e.returnValue;
        }
      });
      // Periodic queue heartbeat check
      setInterval(() => {
        if (this.syncQueue.length > 0) {
          this.processPendingSyncQueue();
        }
      }, 8000);

      // Automatic 30-second background retry mechanism for flushing queued attendance records to the server
      this.startBackgroundAttendanceRetry(30000);

      // 3. Real-time Multi-Device synchronization with Supabase & Firestore
      try {
        const todayIso = this.getTodayYyyyMmDd();
        const config = this.getSupabaseConfig();
        
        // Supabase Real-time Listeners (Single Primary Database)
        if (isSupabaseConfigured(config)) {
          subscribeToSupabaseAttendance((incomingRecord) => {
            if (!incomingRecord || !incomingRecord.id) return;
            const idx = this.attendance.findIndex((a) => a.id === incomingRecord.id);
            if (idx === -1) {
              this.attendance.unshift(incomingRecord);
              this.saveLocalData(true);
              this.notify();
            } else {
              this.attendance[idx] = { ...this.attendance[idx], ...incomingRecord };
              this.saveLocalData(true);
              this.notify();
            }
          }, config);

          subscribeToSupabaseTeacherAttendance((incomingRecord) => {
            if (!incomingRecord || !incomingRecord.id) return;
            const idx = this.teacherAttendance.findIndex((ta) => ta.id === incomingRecord.id);
            if (idx === -1) {
              this.teacherAttendance.unshift(incomingRecord);
              this.saveLocalData(true);
              this.notify();
            } else {
              this.teacherAttendance[idx] = { ...this.teacherAttendance[idx], ...incomingRecord };
              this.saveLocalData(true);
              this.notify();
            }
          }, config);
        }

        // Firestore Fallback Listeners
        subscribeToTodayAttendance(todayIso, (incomingRecords) => {
          if (!incomingRecords || incomingRecords.length === 0) return;
          let changed = false;
          const map = new Map<string, AttendanceRecord>();
          this.attendance.forEach((a) => map.set(a.id, a));
          incomingRecords.forEach((r) => {
            if (!map.has(r.id)) {
              this.attendance.unshift(r);
              changed = true;
            }
          });
          if (changed) {
            this.saveLocalData(true);
            this.notify();
          }
        });

        subscribeToTodayTeacherAttendance(todayIso, (incomingRecords) => {
          if (!incomingRecords || incomingRecords.length === 0) return;
          let changed = false;
          const map = new Map<string, TeacherAttendanceRecord>();
          this.teacherAttendance.forEach((ta) => map.set(ta.id, ta));
          incomingRecords.forEach((r) => {
            if (!map.has(r.id)) {
              this.teacherAttendance.unshift(r);
              changed = true;
            }
          });
          if (changed) {
            this.saveLocalData(true);
            this.notify();
          }
        });
      } catch (err) {
        console.warn('Real-time listener setup notice:', err);
      }
    }

    // Synchronize all database records, settings, and users with Supabase (primary) and Firestore in background
    await this.syncAllWithSupabase();
    await this.syncAllWithFirestore();
    await this.fetchFromServer();
    this.sanitizeData();
    // Auto purge lingering Saturday Alpa records across Supabase, Firestore, and local store
    await this.purgeSaturdayAlpaAttendance(true);
    if (this.syncQueue.length > 0) {
      this.processPendingSyncQueue();
    }
  }

  /**
   * Sanitizes in-memory and local student/teacher data to ensure every student
   * has a distinct, non-generic ID_QR structure (NPSN.NISN.NAMA) so that
   * no two students share the same QR string or generic placeholder.
   */
  public sanitizeData(): void {
    let changed = false;
    const schoolNpsn = (this.settings.schoolNPSN || '69933068').trim();

    if (this.students && this.students.length > 0) {
      this.students.forEach((s) => {
        if (s.nisn) {
          const cleanNisn = String(s.nisn).trim();
          if (s.nisn !== cleanNisn) {
            s.nisn = cleanNisn;
            changed = true;
          }
          if (isGenericQrCode(s.id_qr)) {
            s.id_qr = `${schoolNpsn}.${cleanNisn}.${(s.nama || '').trim()}`;
            changed = true;
          }
        }
      });
    }

    if (this.teachers && this.teachers.length > 0) {
      this.teachers.forEach((t) => {
        if (t.nip) {
          const cleanNip = String(t.nip).trim();
          if (t.nip !== cleanNip) {
            t.nip = cleanNip;
            changed = true;
          }
          if (isGenericQrCode(t.id_qr)) {
            t.id_qr = `${schoolNpsn}.${cleanNip}.${(t.nama || '').trim()}`;
            changed = true;
          }
        }
      });
    }

    // Standardize all attendance record dates to ISO YYYY-MM-DD (identical with database)
    if (this.attendance && this.attendance.length > 0) {
      this.attendance.forEach((a) => {
        const norm = this.normalizeToYyyyMmDd(a.tanggal || a.timestamp);
        if (norm && a.tanggal !== norm) {
          a.tanggal = norm;
          changed = true;
        }
      });
    }

    // Standardize all teacher attendance record dates to ISO YYYY-MM-DD
    if (this.teacherAttendance && this.teacherAttendance.length > 0) {
      this.teacherAttendance.forEach((ta) => {
        const norm = this.normalizeToYyyyMmDd(ta.tanggal || ta.timestamp);
        if (norm && ta.tanggal !== norm) {
          ta.tanggal = norm;
          changed = true;
        }
      });
    }

    // Standardize holiday dates to ISO YYYY-MM-DD
    if (this.settings.holidays && this.settings.holidays.length > 0) {
      this.settings.holidays.forEach((h) => {
        const norm = this.normalizeToYyyyMmDd(h.tanggal);
        if (norm && h.tanggal !== norm) {
          h.tanggal = norm;
          changed = true;
        }
      });
    }

    if (changed) {
      this.saveLocalData(true);
    }
  }

  private backgroundRetryInterval: any = null;

  /**
   * Starts the automatic background retry timer that attempts to flush
   * queued attendance records to the server every 30 seconds if online.
   */
  public startBackgroundAttendanceRetry(intervalMs = 30000): void {
    if (typeof window === 'undefined') return;

    if (this.backgroundRetryInterval) {
      clearInterval(this.backgroundRetryInterval);
      this.backgroundRetryInterval = null;
    }

    this.backgroundRetryInterval = setInterval(() => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline && this.syncQueue.length > 0) {
        this.flushQueuedAttendanceToServer().catch((err) => {
          console.warn('[Background 30s Retry] Flushing queued attendance records failed:', err);
        });
      }
    }, intervalMs);
  }

  /**
   * Stops the background retry timer
   */
  public stopBackgroundAttendanceRetry(): void {
    if (this.backgroundRetryInterval) {
      clearInterval(this.backgroundRetryInterval);
      this.backgroundRetryInterval = null;
    }
  }

  /**
   * Flushes queued attendance records (and sync queue items) to the server if online
   */
  public async flushQueuedAttendanceToServer(): Promise<{ success: boolean; processedCount: number; remainingCount: number }> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return { success: false, processedCount: 0, remainingCount: this.syncQueue.length };
    }

    return await this.processPendingSyncQueue(true);
  }

  private saveTimeout: any = null;

  private saveLocalData(immediate = false) {
    const doSave = () => {
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(this.students));
        
        // Prevent LocalStorage from crashing when data gets huge (Max 5MB quota)
        // Only keep the most recent 2000 attendance records in local cache
        let attendanceToSave = this.attendance;
        if (attendanceToSave.length > 2000) {
          attendanceToSave = [...attendanceToSave].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 2000);
        }
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceToSave));
        
        localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(this.teachers));
        
        let teacherAttToSave = this.teacherAttendance;
        if (teacherAttToSave.length > 2000) {
          teacherAttToSave = [...teacherAttToSave].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 2000);
        }
        localStorage.setItem(STORAGE_KEYS.TEACHER_ATTENDANCE, JSON.stringify(teacherAttToSave));
        
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.logs));
        localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(this.syncQueue));
        localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(this.dispatches));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    };

    if (immediate) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      doSave();
      return;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(doSave, 80);
  }

  public enqueueSync(item: { id: string; type: SyncQueueItem['type']; action: SyncQueueItem['action']; data?: any }) {
    const existingIndex = this.syncQueue.findIndex((q) => q.id === item.id && q.type === item.type);
    const queueItem: SyncQueueItem = {
      id: item.id,
      type: item.type,
      action: item.action,
      data: item.data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    if (existingIndex !== -1) {
      this.syncQueue[existingIndex] = queueItem;
    } else {
      this.syncQueue.push(queueItem);
    }

    this.saveLocalData(true);
    this.notify();

    // If offline, notify user that data is saved locally and waiting to be sent to database
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const typeLabel =
        item.type === 'attendance'
          ? 'Presensi Siswa'
          : item.type === 'teacher_attendance'
          ? 'Presensi Guru'
          : item.type === 'student'
          ? 'Data Siswa'
          : item.type === 'teacher'
          ? 'Data Guru'
          : 'Catatan Aktivitas';
      toast.warning(
        'Data Belum Terkirim ke Database',
        `${typeLabel} tersimpan sementara di memori perangkat (Mode Offline). Segera hubungkan ke internet untuk mengirim data ke database Cloud.`,
        5000
      );
    } else {
      // Trigger background sync immediately
      this.processPendingSyncQueue().catch(() => {});
    }
  }

  private lastSyncQueueTimestamp = 0;

  public async processPendingSyncQueue(force = false): Promise<{ success: boolean; processedCount: number; remainingCount: number }> {
    // Reset stuck queue lock if more than 15 seconds
    if (this.isSyncingQueue && Date.now() - this.lastSyncQueueTimestamp > 15000) {
      this.isSyncingQueue = false;
    }

    if (this.isSyncingQueue) {
      return { success: false, processedCount: 0, remainingCount: this.syncQueue.length };
    }

    if (this.syncQueue.length === 0) {
      return { success: true, processedCount: 0, remainingCount: 0 };
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline && !force) {
      return { success: false, processedCount: 0, remainingCount: this.syncQueue.length };
    }

    this.isSyncingQueue = true;
    this.lastSyncQueueTimestamp = Date.now();
    let processedCount = 0;
    const config = this.getSupabaseConfig();

    try {
      const queueSnapshot = [...this.syncQueue];
      const successfulIds = new Set<string>();
      const hasSupabase = isSupabaseConfigured(config);

      // 1. Process attendance items
      const attendanceUpserts = queueSnapshot
        .filter((q) => q.type === 'attendance' && q.action === 'upsert' && q.data)
        .map((q) => q.data as AttendanceRecord);

      if (attendanceUpserts.length > 0) {
        let firestoreOk = false;
        try {
          firestoreOk = await saveMultipleAttendanceToFirestore(attendanceUpserts);
        } catch {
          firestoreOk = false;
        }

        if (hasSupabase) {
          const res = await syncAttendanceToSupabase(attendanceUpserts, config);
          if (res.success || firestoreOk) {
            queueSnapshot
              .filter((q) => q.type === 'attendance' && q.action === 'upsert')
              .forEach((q) => successfulIds.add(q.id));
            processedCount += attendanceUpserts.length;
          }
        } else if (firestoreOk) {
          queueSnapshot
            .filter((q) => q.type === 'attendance' && q.action === 'upsert')
            .forEach((q) => successfulIds.add(q.id));
          processedCount += attendanceUpserts.length;
        }
      }

      // 2. Process teacher attendance items
      const teacherAttUpserts = queueSnapshot
        .filter((q) => q.type === 'teacher_attendance' && q.action === 'upsert' && q.data)
        .map((q) => q.data as TeacherAttendanceRecord);

      if (teacherAttUpserts.length > 0) {
        let firestoreOk = false;
        try {
          firestoreOk = await saveMultipleTeacherAttendanceToFirestore(teacherAttUpserts);
        } catch {
          firestoreOk = false;
        }

        if (hasSupabase) {
          const res = await syncTeacherAttendanceToSupabase(teacherAttUpserts, config);
          if (res.success || firestoreOk) {
            queueSnapshot
              .filter((q) => q.type === 'teacher_attendance' && q.action === 'upsert')
              .forEach((q) => successfulIds.add(q.id));
            processedCount += teacherAttUpserts.length;
          }
        } else if (firestoreOk) {
          queueSnapshot
            .filter((q) => q.type === 'teacher_attendance' && q.action === 'upsert')
            .forEach((q) => successfulIds.add(q.id));
          processedCount += teacherAttUpserts.length;
        }
      }

      // 3. Process student items
      const studentUpserts = queueSnapshot
        .filter((q) => q.type === 'student' && q.action === 'upsert' && q.data)
        .map((q) => q.data as Student);

      if (studentUpserts.length > 0) {
        let firestoreOk = false;
        try {
          firestoreOk = await saveMultipleStudentsToFirestore(studentUpserts);
        } catch {
          firestoreOk = false;
        }

        if (hasSupabase) {
          const res = await syncStudentsToSupabase(studentUpserts, config);
          if (res.success || firestoreOk) {
            queueSnapshot
              .filter((q) => q.type === 'student' && q.action === 'upsert')
              .forEach((q) => successfulIds.add(q.id));
            processedCount += studentUpserts.length;
          }
        } else if (firestoreOk) {
          queueSnapshot
            .filter((q) => q.type === 'student' && q.action === 'upsert')
            .forEach((q) => successfulIds.add(q.id));
          processedCount += studentUpserts.length;
        }
      }

      // 4. Process teacher items
      const teacherUpserts = queueSnapshot
        .filter((q) => q.type === 'teacher' && q.action === 'upsert' && q.data)
        .map((q) => q.data as Teacher);

      if (teacherUpserts.length > 0) {
        let firestoreOk = false;
        try {
          firestoreOk = await saveMultipleTeachersToFirestore(teacherUpserts);
        } catch {
          firestoreOk = false;
        }

        if (hasSupabase) {
          const res = await syncTeachersToSupabase(teacherUpserts, config);
          if (res.success || firestoreOk) {
            queueSnapshot
              .filter((q) => q.type === 'teacher' && q.action === 'upsert')
              .forEach((q) => successfulIds.add(q.id));
            processedCount += teacherUpserts.length;
          }
        } else if (firestoreOk) {
          queueSnapshot
            .filter((q) => q.type === 'teacher' && q.action === 'upsert')
            .forEach((q) => successfulIds.add(q.id));
          processedCount += teacherUpserts.length;
        }
      }

      // 5. Process log items
      const logUpserts = queueSnapshot
        .filter((q) => q.type === 'log' && q.action === 'upsert' && q.data)
        .map((q) => q.data as ActivityLog);

      if (logUpserts.length > 0) {
        let firestoreOk = false;
        try {
          const results = await Promise.all(logUpserts.map((l) => saveLogToFirestore(l)));
          firestoreOk = results.some((r) => r === true);
        } catch {
          firestoreOk = false;
        }

        if (hasSupabase) {
          const res = await syncLogsToSupabase(logUpserts, config);
          if (res.success || firestoreOk) {
            queueSnapshot
              .filter((q) => q.type === 'log' && q.action === 'upsert')
              .forEach((q) => successfulIds.add(q.id));
            processedCount += logUpserts.length;
          }
        } else if (firestoreOk) {
          queueSnapshot
            .filter((q) => q.type === 'log' && q.action === 'upsert')
            .forEach((q) => successfulIds.add(q.id));
          processedCount += logUpserts.length;
        }
      }

      // 6. Process app_users items
      const userUpserts = queueSnapshot
        .filter((q) => q.type === 'user' && q.action === 'upsert' && q.data)
        .map((q) => q.data as User);

      if (userUpserts.length > 0) {
        let firestoreOk = false;
        try {
          const results = await Promise.all(userUpserts.map((u) => saveUserToFirestore(u)));
          firestoreOk = results.some((r) => r === true);
        } catch {
          firestoreOk = false;
        }

        if (hasSupabase) {
          const res = await syncUsersToSupabase(userUpserts, config);
          if (res.success || firestoreOk) {
            queueSnapshot
              .filter((q) => q.type === 'user' && q.action === 'upsert')
              .forEach((q) => successfulIds.add(q.id));
            processedCount += userUpserts.length;
          }
        } else if (firestoreOk) {
          queueSnapshot
            .filter((q) => q.type === 'user' && q.action === 'upsert')
            .forEach((q) => successfulIds.add(q.id));
          processedCount += userUpserts.length;
        }
      }

      // 7. Process school_settings items
      const settingsUpserts = queueSnapshot
        .filter((q) => q.type === 'settings' && q.action === 'upsert' && q.data)
        .map((q) => q.data as SchoolSettings);

      if (settingsUpserts.length > 0) {
        let firestoreOk = false;
        try {
          const results = await Promise.all(settingsUpserts.map((st) => saveSettingsToFirestore(st)));
          firestoreOk = results.some((r) => r === true);
        } catch {
          firestoreOk = false;
        }

        if (hasSupabase) {
          const lastSettings = settingsUpserts[settingsUpserts.length - 1];
          const res = await syncSettingsToSupabase(lastSettings, config);
          if (res.success || firestoreOk) {
            queueSnapshot
              .filter((q) => q.type === 'settings' && q.action === 'upsert')
              .forEach((q) => successfulIds.add(q.id));
            processedCount += settingsUpserts.length;
          }
        } else if (firestoreOk) {
          queueSnapshot
            .filter((q) => q.type === 'settings' && q.action === 'upsert')
            .forEach((q) => successfulIds.add(q.id));
          processedCount += settingsUpserts.length;
        }
      }

      // 8. Process problematic student dispatches items
      const dispatchUpserts = queueSnapshot
        .filter((q) => q.type === 'dispatch' && q.action === 'upsert' && q.data)
        .map((q) => q.data as ProblematicStudentDispatch);

      if (dispatchUpserts.length > 0) {
        let firestoreOk = false;
        try {
          const results = await Promise.all(dispatchUpserts.map((d) => saveDispatchToFirestore(d)));
          firestoreOk = results.some((r) => r === true);
        } catch {
          firestoreOk = false;
        }

        if (hasSupabase) {
          const res = await syncDispatchesToSupabase(dispatchUpserts, config);
          if (res.success || firestoreOk) {
            queueSnapshot
              .filter((q) => q.type === 'dispatch' && q.action === 'upsert')
              .forEach((q) => successfulIds.add(q.id));
            processedCount += dispatchUpserts.length;
          }
        } else if (firestoreOk) {
          queueSnapshot
            .filter((q) => q.type === 'dispatch' && q.action === 'upsert')
            .forEach((q) => successfulIds.add(q.id));
          processedCount += dispatchUpserts.length;
        }
      }

      // 9. Process delete actions
      const deleteItems = queueSnapshot.filter((q) => q.action === 'delete');
      for (const item of deleteItems) {
        try {
          let ok = false;
          if (item.type === 'student') {
            const fOk = await deleteStudentFromFirestore(item.id);
            let sOk = false;
            if (hasSupabase) {
              sOk = await deleteStudentFromSupabase(item.id, config);
            }
            ok = fOk || sOk;
          } else if (item.type === 'attendance') {
            const fOk = await deleteAttendanceFromFirestore(item.id);
            let sOk = false;
            if (hasSupabase) {
              sOk = await deleteAttendanceFromSupabase(item.id, config);
            }
            ok = fOk || sOk;
          } else if (item.type === 'teacher') {
            const fOk = await deleteTeacherFromFirestore(item.id);
            let sOk = false;
            if (hasSupabase) {
              sOk = await deleteTeacherFromSupabase(item.id, config);
            }
            ok = fOk || sOk;
          } else if (item.type === 'teacher_attendance') {
            const fOk = await deleteTeacherAttendanceFromFirestore(item.id);
            let sOk = false;
            if (hasSupabase) {
              sOk = await deleteTeacherAttendanceFromSupabase(item.id, config);
            }
            ok = fOk || sOk;
          } else if (item.type === 'user') {
            const fOk = await deleteUserFromFirestore(item.id);
            let sOk = false;
            if (hasSupabase) {
              sOk = await deleteUserFromSupabase(item.id, config);
            }
            ok = fOk || sOk;
          } else if (item.type === 'dispatch') {
            const fOk = await deleteDispatchFromFirestore(item.id);
            let sOk = false;
            if (hasSupabase) {
              sOk = await deleteDispatchFromSupabase(item.id, config);
            }
            ok = fOk || sOk;
          } else if (item.type === 'log') {
            if (hasSupabase) {
              ok = await deleteLogFromSupabase(item.id, config);
            } else {
              ok = true;
            }
          }
          if (ok) {
            successfulIds.add(item.id);
            processedCount++;
          }
        } catch {
          // Keep in queue for next retry
        }
      }

      // Remove all successfully synchronized items from queue
      if (successfulIds.size > 0) {
        this.syncQueue = this.syncQueue.filter((q) => !successfulIds.has(q.id));
        this.saveLocalData(true);
        this.notify();
      }

      return {
        success: this.syncQueue.length === 0,
        processedCount,
        remainingCount: this.syncQueue.length,
      };
    } catch (err) {
      console.warn('Sync queue error:', err);
      return { success: false, processedCount, remainingCount: this.syncQueue.length };
    } finally {
      this.isSyncingQueue = false;
    }
  }

  /**
   * Mengirim seluruh data antrian tertunda ke Database Cloud (Firestore & Supabase)
   */
  public async syncAllPendingToDatabase(force = true): Promise<{
    success: boolean;
    message: string;
    processedCount: number;
    remainingCount: number;
  }> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline && !force) {
      return {
        success: false,
        message: 'Perangkat sedang Offline. Hubungkan ke internet untuk mengirim data ke database Cloud.',
        processedCount: 0,
        remainingCount: this.syncQueue.length,
      };
    }

    try {
      // 1. Process items in the queue
      const queueRes = await this.processPendingSyncQueue(true);

      // 2. Also ensure cloud database has all fresh records synced
      try {
        await this.syncAllWithFirestore();
      } catch (err) {
        console.warn('Sync with Firestore error during flush:', err);
      }

      // 3. Sync to Supabase if configured
      const config = this.getSupabaseConfig();
      if (isSupabaseConfigured(config)) {
        try {
          await this.syncAllToSupabase();
        } catch (err) {
          console.warn('Sync to Supabase error during flush:', err);
        }
      }

      const remaining = this.syncQueue.length;
      this.notify();

      if (remaining === 0) {
        return {
          success: true,
          message: `Seluruh data berhasil dikirim dan tersimpan aman di database Cloud!`,
          processedCount: queueRes.processedCount,
          remainingCount: 0,
        };
      } else {
        return {
          success: false,
          message: `Sebagian data terkirim, namun masih ada ${remaining} data tertunda. Periksa koneksi dan coba lagi.`,
          processedCount: queueRes.processedCount,
          remainingCount: remaining,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Gagal mengirim data ke database Cloud.',
        processedCount: 0,
        remainingCount: this.syncQueue.length,
      };
    }
  }

  public getSyncQueue(): SyncQueueItem[] {
    return [...this.syncQueue];
  }

  public clearSyncQueue(): void {
    this.syncQueue = [];
    try {
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    } catch {}
    this.saveLocalData(true);
    this.notify();
  }

  public removeFromSyncQueue(id: string): void {
    if (!id) return;
    this.syncQueue = this.syncQueue.filter((q) => q.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(this.syncQueue));
    } catch {}
    this.saveLocalData(true);
    this.notify();
  }

  public getSyncQueueDetails(): {
    total: number;
    attendanceCount: number;
    studentCount: number;
    teacherCount: number;
    logCount: number;
    deleteCount: number;
    items: SyncQueueItem[];
  } {
    const total = this.syncQueue.length;
    const attendanceCount = this.syncQueue.filter((q) => q.type === 'attendance' && q.action === 'upsert').length;
    const studentCount = this.syncQueue.filter((q) => q.type === 'student' && q.action === 'upsert').length;
    const teacherCount = this.syncQueue.filter((q) => (q.type === 'teacher' || q.type === 'teacher_attendance') && q.action === 'upsert').length;
    const logCount = this.syncQueue.filter((q) => q.type === 'log' && q.action === 'upsert').length;
    const deleteCount = this.syncQueue.filter((q) => q.action === 'delete').length;
    return {
      total,
      attendanceCount,
      studentCount,
      teacherCount,
      logCount,
      deleteCount,
      items: [...this.syncQueue].reverse(),
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.saveLocalData();
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }

  public getSettings(): SchoolSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<SchoolSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    this.notify();
    this.enqueueSync({ id: 'school-settings', type: 'settings', action: 'upsert', data: this.settings });
    saveSettingsToFirestore(this.settings).catch(() => {});
    syncSettingsToSupabase(this.settings, this.getSupabaseConfig()).catch(() => {});
  }

  public getHolidays(): Holiday[] {
    return this.settings.holidays || [];
  }

  public addHoliday(data: { tanggal: string; keterangan: string }): Holiday {
    const normDate = this.normalizeToYyyyMmDd(data.tanggal);
    const newHoliday: Holiday = {
      id: `hol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tanggal: normDate,
      keterangan: data.keterangan,
    };
    const current = this.getHolidays();
    const updated = [...current.filter((h) => this.normalizeToYyyyMmDd(h.tanggal) !== normDate), newHoliday];
    this.updateSettings({ holidays: updated });
    this.addLog('TAMBAH_HARI_LIBUR', `Menambahkan hari libur: ${data.keterangan} (${normDate})`);
    return newHoliday;
  }

  public deleteHoliday(id: string): void {
    const current = this.getHolidays();
    const target = current.find((h) => h.id === id);
    const updated = current.filter((h) => h.id !== id);
    this.updateSettings({ holidays: updated });
    if (target) {
      this.addLog('HAPUS_HARI_LIBUR', `Menghapus hari libur: ${target.keterangan} (${target.tanggal})`);
    }
  }

  public isHoliday(dateStr: string): boolean {
    if (!dateStr) return false;
    const normDate = this.normalizeToYyyyMmDd(dateStr);
    if (!normDate || normDate.length < 10) return false;

    // 1. Check configured holidays
    const holidays = this.getHolidays();
    if (holidays.some((h) => this.normalizeToYyyyMmDd(h.tanggal) === normDate)) {
      return true;
    }

    // 2. Check Weekend based on schoolDays setting:
    // - 5 Hari Sekolah (Senin - Jumat): Minggu (0) dan Sabtu (6) adalah hari libur
    // - 6 Hari Sekolah (Senin - Sabtu): Hanya Minggu (0) yang libur; Sabtu aktif belajar
    const dateObj = new Date(normDate + 'T00:00:00');
    if (!isNaN(dateObj.getTime())) {
      const day = dateObj.getDay();
      const schoolDays = Number(this.settings.schoolDays) === 5 ? 5 : 6;
      if (day === 0) return true; // 0: Minggu (selalu libur)
      if (schoolDays === 5 && day === 6) return true; // 6: Sabtu (libur pada sistem sekolah 5 hari)
    }

    return false;
  }

  public getHolidayDescription(dateStr: string): string | null {
    if (!dateStr) return null;
    const normDate = this.normalizeToYyyyMmDd(dateStr);
    if (!normDate) return null;

    const holidays = this.getHolidays();
    const found = holidays.find((h) => this.normalizeToYyyyMmDd(h.tanggal) === normDate);
    if (found) return found.keterangan;

    const dateObj = new Date(normDate + 'T00:00:00');
    if (!isNaN(dateObj.getTime())) {
      const day = dateObj.getDay();
      const schoolDays = Number(this.settings.schoolDays) === 5 ? 5 : 6;
      if (day === 0) return 'Akhir Pekan (Hari Minggu)';
      if (schoolDays === 5 && day === 6) return 'Akhir Pekan (Hari Sabtu - Sekolah 5 Hari)';
    }

    return null;
  }

  public processAutoAlpa(targetDateYyyyMmDd?: string): { addedCount: number; date: string } {
    if (this.settings.enableAutoAlpa === false) {
      return { addedCount: 0, date: targetDateYyyyMmDd || this.getTodayYyyyMmDd() };
    }

    const todayYyyyMmDd = this.getTodayYyyyMmDd();
    const checkDate = targetDateYyyyMmDd ? this.normalizeToYyyyMmDd(targetDateYyyyMmDd) : todayYyyyMmDd;

    // If checking for today, ensure current local time is >= autoAlpaCutoffTime (default 14:30)
    if (checkDate === todayYyyyMmDd) {
      const now = new Date();
      const cutoffStr = this.settings.autoAlpaCutoffTime || '14:30';
      const [cutoffH, cutoffM] = cutoffStr.split(':').map((n) => parseInt(n, 10) || 0);
      const cutoffMinutes = cutoffH * 60 + cutoffM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (currentMinutes < cutoffMinutes) {
        // Current time is before cutoff
        return { addedCount: 0, date: checkDate };
      }
    }

    // Check if target date is a holiday or weekend
    if (this.isHoliday(checkDate)) {
      return { addedCount: 0, date: checkDate };
    }

    const activeStudents = this.students.filter((s) => s.status === 'aktif');
    if (activeStudents.length === 0) {
      return { addedCount: 0, date: checkDate };
    }

    const newRecords: AttendanceRecord[] = [];
    const cutoffStr = this.settings.autoAlpaCutoffTime || '14:30';
    const normCheckDate = this.normalizeToYyyyMmDd(checkDate) || checkDate;

    activeStudents.forEach((student) => {
      // Check if student has any existing attendance record for checkDate
      const existing = this.attendance.some((a) => a.nisn === student.nisn && this.isRecordForDate(a, normCheckDate));
      if (!existing) {
        const newRecord: AttendanceRecord = {
          id: `att-autoalpa-${student.nisn}-${normCheckDate}`,
          tanggal: normCheckDate,
          timestamp: `${normCheckDate}T${cutoffStr}:00.000Z`,
          nisn: student.nisn,
          nama: student.nama,
          kelas: student.kelas,
          id_qr: student.id_qr || '',
          jenis: 'Masuk',
          status: 'Alpa',
          petugas: `Otopresensi Sistem (${cutoffStr})`,
          catatan: `Alpa Otomatis (Tidak ada presensi hingga jam ${cutoffStr})`,
        };
        newRecords.push(newRecord);
      }
    });

    if (newRecords.length > 0) {
      this.attendance = [...this.attendance, ...newRecords];
      this.notify();
      this.addLog('AUTO_ALPA_MASSAL', `Sistem Otopresensi (${cutoffStr}): Otomatis mencatat ${newRecords.length} siswa sebagai Alpa pada tanggal ${checkDate}.`);
      syncAttendanceToSupabase(newRecords, this.getSupabaseConfig()).catch(() => {});
    }

    return { addedCount: newRecords.length, date: checkDate };
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    this.notify();
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(uid: string): User | undefined {
    if (!uid) return undefined;
    return this.users.find((u) => u.uid === uid);
  }

  public getUserByUsernameOrEmail(identifier: string): User | undefined {
    if (!identifier) return undefined;
    const clean = identifier.trim().toLowerCase();
    return this.users.find(
      (u) =>
        (u.username && u.username.trim().toLowerCase() === clean) ||
        (u.email && u.email.trim().toLowerCase() === clean) ||
        (u.nip && u.nip.trim() === identifier.trim())
    );
  }

  public async syncUsersWithSupabase(): Promise<void> {
    try {
      const config = this.getSupabaseConfig();
      if (!isSupabaseConfigured(config)) return;

      const remoteUsers = await fetchUsersFromSupabase(config);
      if (remoteUsers && remoteUsers.length > 0) {
        const userMap = new Map<string, User>();
        this.users.forEach((u) => {
          if (u.password && !isHashedPassword(u.password)) {
            u.password = ensureHashedPassword(u.password);
          }
          userMap.set(u.uid, u);
        });
        remoteUsers.forEach((ru) => {
          if (ru.password && !isHashedPassword(ru.password)) {
            ru.password = ensureHashedPassword(ru.password);
          }
          userMap.set(ru.uid, ru);
        });
        if (!userMap.has('usr-admin')) {
          userMap.set('usr-admin', INITIAL_USERS[0]);
        }
        this.users = Array.from(userMap.values());
        this.saveLocalData(true);
        this.notify();
      } else if (this.users.length > 0) {
        await syncUsersToSupabase(this.users, config);
      }
    } catch (err) {
      console.warn('Sync users with Supabase notice:', err);
    }
  }

  public async syncSettingsWithSupabase(): Promise<void> {
    try {
      const config = this.getSupabaseConfig();
      if (!isSupabaseConfigured(config)) return;

      const remoteSettings = await fetchSettingsFromSupabase(config);
      if (remoteSettings && Object.keys(remoteSettings).length > 0) {
        this.settings = {
          ...this.settings,
          ...remoteSettings,
          homeroomAssignments: {
            ...(this.settings.homeroomAssignments || {}),
            ...(remoteSettings.homeroomAssignments || {}),
          },
          holidays: remoteSettings.holidays && remoteSettings.holidays.length > 0
            ? remoteSettings.holidays
            : (this.settings.holidays || []),
        };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
        this.notify();
      } else {
        await syncSettingsToSupabase(this.settings, config);
      }
    } catch (err) {
      console.warn('Sync settings with Supabase notice:', err);
    }
  }

  public async syncDispatchesWithSupabase(): Promise<void> {
    try {
      const config = this.getSupabaseConfig();
      if (!isSupabaseConfigured(config)) return;

      const remoteDispatches = await fetchDispatchesFromSupabase(config);
      if (remoteDispatches && remoteDispatches.length > 0) {
        const dspMap = new Map<string, ProblematicStudentDispatch>();
        this.dispatches.forEach((d) => dspMap.set(d.id, d));
        remoteDispatches.forEach((d) => dspMap.set(d.id, d));
        this.dispatches = Array.from(dspMap.values()).sort((a, b) => {
          return new Date(b.dispatchedAt || 0).getTime() - new Date(a.dispatchedAt || 0).getTime();
        });
        this.saveLocalData(true);
        this.notify();
      } else if (this.dispatches.length > 0) {
        await syncDispatchesToSupabase(this.dispatches, config);
      }
    } catch (err) {
      console.warn('Sync dispatches with Supabase notice:', err);
    }
  }

  /**
   * Synchronize all persistent collections (Users, Settings/Homeroom, Dispatches, Students, Teachers, Attendance, Logs)
   * with Supabase Cloud PostgreSQL Database (Primary Single Database).
   */
  public async syncAllWithSupabase(): Promise<void> {
    try {
      const config = this.getSupabaseConfig();
      if (!isSupabaseConfigured(config)) return;

      // 1. Sync Users
      await this.syncUsersWithSupabase();

      // 2. Sync Settings
      await this.syncSettingsWithSupabase();

      // 3. Sync Dispatches
      await this.syncDispatchesWithSupabase();

      // 4. Sync Students, Teachers, Attendance, Teacher Attendance, Logs
      const [remoteStudents, remoteAttendance, remoteTeachers, remoteTeacherAtt, remoteLogs] = await Promise.all([
        fetchStudentsFromSupabase(config),
        fetchAttendanceFromSupabase(config),
        fetchTeachersFromSupabase(config),
        fetchTeacherAttendanceFromSupabase(config),
        fetchLogsFromSupabase(config),
      ]);

      let changed = false;

      if (remoteStudents && remoteStudents.length > 0) {
        const sMap = new Map<string, Student>();
        this.students.forEach((s) => sMap.set(s.id || s.nisn, s));
        remoteStudents.forEach((s) => sMap.set(s.id || s.nisn, s));
        this.students = Array.from(sMap.values());
        changed = true;
      } else if (this.students.length > 0) {
        syncStudentsToSupabase(this.students, config).catch(() => {});
      }

      if (remoteTeachers && remoteTeachers.length > 0) {
        const tMap = new Map<string, Teacher>();
        this.teachers.forEach((t) => tMap.set(t.id || t.nip, t));
        remoteTeachers.forEach((t) => tMap.set(t.id || t.nip, t));
        this.teachers = Array.from(tMap.values());
        changed = true;
      } else if (this.teachers.length > 0) {
        syncTeachersToSupabase(this.teachers, config).catch(() => {});
      }

      if (remoteAttendance && remoteAttendance.length > 0) {
        const aMap = new Map<string, AttendanceRecord>();
        this.attendance.forEach((a) => aMap.set(a.id, a));
        remoteAttendance.forEach((a) => aMap.set(a.id, a));
        this.attendance = Array.from(aMap.values());
        changed = true;
      } else if (this.attendance.length > 0) {
        syncAttendanceToSupabase(this.attendance, config).catch(() => {});
      }

      if (remoteTeacherAtt && remoteTeacherAtt.length > 0) {
        const taMap = new Map<string, TeacherAttendanceRecord>();
        this.teacherAttendance.forEach((ta) => taMap.set(ta.id, ta));
        remoteTeacherAtt.forEach((ta) => taMap.set(ta.id, ta));
        this.teacherAttendance = Array.from(taMap.values());
        changed = true;
      } else if (this.teacherAttendance.length > 0) {
        syncTeacherAttendanceToSupabase(this.teacherAttendance, config).catch(() => {});
      }

      if (remoteLogs && remoteLogs.length > 0) {
        const lMap = new Map<string, ActivityLog>();
        this.logs.forEach((l) => lMap.set(l.id, l));
        remoteLogs.forEach((l) => lMap.set(l.id, l));
        this.logs = Array.from(lMap.values()).slice(0, 500);
        changed = true;
      } else if (this.logs.length > 0) {
        syncLogsToSupabase(this.logs, config).catch(() => {});
      }

      if (changed) {
        this.saveLocalData(true);
        this.notify();
      }
    } catch (err) {
      console.warn('Supabase full database synchronization notice:', err);
    }
  }

  /**
   * Complete, safe migration of ALL master data, attendance records,
   * users, settings, and logs to Supabase Cloud PostgreSQL Database.
   */
  public async migrateAllDataToSupabase(
    onProgress?: (step: string, current: number, total: number) => void
  ): Promise<{
    success: boolean;
    message: string;
    stats: {
      students: number;
      teachers: number;
      attendance: number;
      teacherAttendance: number;
      users: number;
      dispatches: number;
      logs: number;
    };
  }> {
    const config = this.getSupabaseConfig();
    if (!isSupabaseConfigured(config)) {
      return {
        success: false,
        message: 'Supabase URL atau Key belum dikonfigurasi di Pengaturan.',
        stats: {
          students: 0,
          teachers: 0,
          attendance: 0,
          teacherAttendance: 0,
          users: 0,
          dispatches: 0,
          logs: 0,
        },
      };
    }

    const res = await migrateAllDataToSupabaseCloud(
      {
        students: this.students,
        attendance: this.attendance,
        teachers: this.teachers,
        teacherAttendance: this.teacherAttendance,
        logs: this.logs,
        users: this.users,
        settings: this.settings,
        dispatches: this.dispatches,
      },
      config,
      onProgress
    );

    if (res.success) {
      this.syncQueue = [];
      try {
        localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
      } catch {}
      this.updateSettings({ lastSupabaseSync: new Date().toISOString() });
      this.saveLocalData(true);
      this.notify();
    }

    return res;
  }

  public async syncUsersWithFirestore(): Promise<void> {
    try {
      const remoteUsers = await fetchUsersFromFirestore();
      if (remoteUsers && remoteUsers.length > 0) {
        // Merge remote users with local users, prioritizing remote updates and ensuring bcrypt hashes
        const userMap = new Map<string, User>();
        // Add existing local users
        this.users.forEach((u) => {
          if (u.password && !isHashedPassword(u.password)) {
            u.password = ensureHashedPassword(u.password);
          }
          userMap.set(u.uid, u);
        });
        // Upsert remote users
        remoteUsers.forEach((ru) => {
          if (ru.password && !isHashedPassword(ru.password)) {
            ru.password = ensureHashedPassword(ru.password);
          }
          userMap.set(ru.uid, ru);
        });

        // Ensure Master Admin always exists with secure hash
        if (!userMap.has('usr-admin')) {
          userMap.set('usr-admin', INITIAL_USERS[0]);
        }

        this.users = Array.from(userMap.values());
        this.saveLocalData(true);
        this.notify();
      } else {
        // Firestore app_users collection is empty -> bootstrap seed initial users to Firestore with bcrypt hashes
        for (const u of this.users) {
          if (u.password && !isHashedPassword(u.password)) {
            u.password = ensureHashedPassword(u.password);
          }
          saveUserToFirestore(u).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Sync users with Firestore error:', err);
    }
  }

  /**
   * Synchronize all persistent collections (Users, Settings/Homeroom, Dispatches, Students, Teachers, Attendance, Logs)
   * with Firestore Cloud Database.
   */
  public async syncAllWithFirestore(): Promise<void> {
    try {
      // 1. Sync Users
      await this.syncUsersWithFirestore();

      // 2. Sync Settings & Homeroom Assignments (Pemetaan Wali Kelas)
      try {
        const remoteSettings = await fetchSettingsFromFirestore();
        if (remoteSettings && Object.keys(remoteSettings).length > 0) {
          this.settings = {
            ...this.settings,
            ...remoteSettings,
            homeroomAssignments: {
              ...(this.settings.homeroomAssignments || {}),
              ...(remoteSettings.homeroomAssignments || {}),
            },
            holidays: remoteSettings.holidays && remoteSettings.holidays.length > 0
              ? remoteSettings.holidays
              : (this.settings.holidays || []),
          };
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
          this.notify();
        } else {
          // Cloud settings document is empty -> persist current school settings & homeroom map
          saveSettingsToFirestore(this.settings).catch(() => {});
        }
      } catch (e) {
        console.warn('Sync settings with Firestore notice:', e);
      }

      // 3. Sync Problematic Student Dispatches (Disposisi Wali Kelas & BK)
      try {
        const remoteDispatches = await fetchDispatchesFromFirestore();
        if (remoteDispatches && remoteDispatches.length > 0) {
          const dspMap = new Map<string, ProblematicStudentDispatch>();
          this.dispatches.forEach((d) => dspMap.set(d.id, d));
          remoteDispatches.forEach((d) => dspMap.set(d.id, d));
          this.dispatches = Array.from(dspMap.values()).sort((a, b) => {
            return new Date(b.dispatchedAt || 0).getTime() - new Date(a.dispatchedAt || 0).getTime();
          });
          this.saveLocalData(true);
          this.notify();
        } else if (this.dispatches.length > 0) {
          // Seed local dispatches to Firestore
          this.dispatches.forEach((d) => saveDispatchToFirestore(d).catch(() => {}));
        }
      } catch (e) {
        console.warn('Sync dispatches with Firestore notice:', e);
      }

      // 4. Sync Students & Teachers with Firestore if cloud has records or local needs backup
      try {
        const remoteStudents = await fetchStudentsFromFirestore();
        if (remoteStudents && remoteStudents.length > 0) {
          const sMap = new Map<string, Student>();
          this.students.forEach((s) => sMap.set(s.id || s.nisn, s));
          remoteStudents.forEach((s) => sMap.set(s.id || s.nisn, s));
          this.students = Array.from(sMap.values());
          this.saveLocalData(true);
        } else if (this.students.length > 0) {
          saveMultipleStudentsToFirestore(this.students).catch(() => {});
        }

        const remoteTeachers = await fetchTeachersFromFirestore();
        if (remoteTeachers && remoteTeachers.length > 0) {
          const tMap = new Map<string, Teacher>();
          this.teachers.forEach((t) => tMap.set(t.id || t.nip, t));
          remoteTeachers.forEach((t) => tMap.set(t.id || t.nip, t));
          this.teachers = Array.from(tMap.values());
          this.saveLocalData(true);
        } else if (this.teachers.length > 0) {
          saveMultipleTeachersToFirestore(this.teachers).catch(() => {});
        }

        const remoteAttendance = await fetchAttendanceFromFirestore();
        if (remoteAttendance && remoteAttendance.length > 0) {
          const aMap = new Map<string, AttendanceRecord>();
          this.attendance.forEach((a) => aMap.set(a.id, a));
          remoteAttendance.forEach((a) => aMap.set(a.id, a));
          this.attendance = Array.from(aMap.values());
          this.saveLocalData(true);
        } else if (this.attendance.length > 0) {
          saveMultipleAttendanceToFirestore(this.attendance).catch(() => {});
        }

        const remoteTeacherAtt = await fetchTeacherAttendanceFromFirestore();
        if (remoteTeacherAtt && remoteTeacherAtt.length > 0) {
          const taMap = new Map<string, TeacherAttendanceRecord>();
          this.teacherAttendance.forEach((ta) => taMap.set(ta.id, ta));
          remoteTeacherAtt.forEach((ta) => taMap.set(ta.id, ta));
          this.teacherAttendance = Array.from(taMap.values());
          this.saveLocalData(true);
        } else if (this.teacherAttendance.length > 0) {
          saveMultipleTeacherAttendanceToFirestore(this.teacherAttendance).catch(() => {});
        }

        this.notify();
      } catch (e) {
        console.warn('Sync entity tables with Firestore notice:', e);
      }
    } catch (err) {
      console.warn('Firestore full database synchronization error:', err);
    }
  }

  /**
   * Complete, comprehensive migration of ALL master data, attendance records,
   * users, settings, and logs to the primary Firebase Firestore cloud database.
   */
  public async migrateAllDataToFirestore(): Promise<{
    success: boolean;
    message: string;
    stats: {
      students: number;
      teachers: number;
      attendance: number;
      teacherAttendance: number;
      users: number;
      dispatches: number;
    };
  }> {
    try {
      // 1. Users
      let usersMigrated = 0;
      for (const u of this.users) {
        if (u.password && !isHashedPassword(u.password)) {
          u.password = ensureHashedPassword(u.password);
        }
        await saveUserToFirestore(u);
        usersMigrated++;
      }

      // 2. Settings & Homeroom
      await saveSettingsToFirestore(this.settings);

      // 3. Dispatches
      let dispatchesMigrated = 0;
      for (const d of this.dispatches) {
        await saveDispatchToFirestore(d);
        dispatchesMigrated++;
      }

      // 4. Students
      await saveMultipleStudentsToFirestore(this.students);

      // 5. Teachers
      await saveMultipleTeachersToFirestore(this.teachers);

      // 6. Attendance records
      await saveMultipleAttendanceToFirestore(this.attendance);

      // 7. Teacher attendance records
      await saveMultipleTeacherAttendanceToFirestore(this.teacherAttendance);

      // 8. Activity logs
      for (const l of this.logs.slice(0, 100)) {
        await saveLogToFirestore(l);
      }

      this.saveLocalData(true);
      this.notify();

      return {
        success: true,
        message: 'Seluruh data berhasil dimigrasikan ke Google Cloud Firestore.',
        stats: {
          students: this.students.length,
          teachers: this.teachers.length,
          attendance: this.attendance.length,
          teacherAttendance: this.teacherAttendance.length,
          users: usersMigrated,
          dispatches: dispatchesMigrated,
        },
      };
    } catch (err: any) {
      console.error('Migrate all data to Firestore error:', err);
      return {
        success: false,
        message: err?.message || 'Gagal memigrasikan sebagian data ke Firestore.',
        stats: {
          students: this.students.length,
          teachers: this.teachers.length,
          attendance: this.attendance.length,
          teacherAttendance: this.teacherAttendance.length,
          users: this.users.length,
          dispatches: this.dispatches.length,
        },
      };
    }
  }

  public async addUser(userData: Omit<User, 'uid' | 'createdAt'>): Promise<{ success: boolean; user?: User; message: string }> {
    const cleanUsername = (userData.username || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanUsername) {
      return { success: false, message: 'Username tidak boleh kosong.' };
    }

    // Check username uniqueness
    const existing = this.users.find((u) => (u.username || '').trim().toLowerCase() === cleanUsername);
    if (existing) {
      return { success: false, message: `Username "${cleanUsername}" sudah digunakan. Silakan gunakan username lain.` };
    }

    if (!userData.name || !userData.name.trim()) {
      return { success: false, message: 'Nama lengkap pengguna wajib diisi.' };
    }

    const cleanPass = (userData.password || '').trim();
    if (!cleanPass) {
      return { success: false, message: 'Kata sandi wajib diisi.' };
    }

    // Safely hash password using bcrypt before saving
    const hashedPassword = await hashPassword(cleanPass);

    const newUid = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newUser: User = {
      ...userData,
      uid: newUid,
      username: cleanUsername,
      name: userData.name.trim(),
      email: (userData.email || '').trim(),
      role: userData.role || 'Guru',
      subRole: userData.subRole || (userData.role === 'Guru' ? 'Guru Piket' : undefined),
      assignedClass: (userData.assignedClass || '').trim(),
      nip: (userData.nip || '').trim(),
      phone: (userData.phone || '').trim(),
      password: hashedPassword,
      status: userData.status || 'aktif',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: (userData.notes || '').trim(),
    };

    this.users.push(newUser);
    this.saveLocalData(true);
    this.notify();

    // Persist to Supabase and Firestore
    this.enqueueSync({ id: newUser.uid, type: 'user', action: 'upsert', data: newUser });
    saveUserToFirestore(newUser).catch(() => {});
    syncUsersToSupabase([newUser], this.getSupabaseConfig()).catch(() => {});

    this.addLog(
      'TAMBAH_PENGGUNA',
      `Menambahkan akun baru: ${newUser.name} (@${newUser.username}) sebagai ${newUser.role}${newUser.subRole ? ` (${newUser.subRole})` : ''} (Tersimpan terenkripsi bcrypt)`
    );

    return { success: true, user: newUser, message: `Akun ${newUser.name} berhasil dibuat dan disimpan dengan enkripsi kata sandi yang aman!` };
  }

  public async updateUser(uid: string, userData: Partial<User>): Promise<{ success: boolean; message: string }> {
    const idx = this.users.findIndex((u) => u.uid === uid);
    if (idx === -1) {
      return { success: false, message: 'Data pengguna tidak ditemukan.' };
    }

    const existing = this.users[idx];

    // If username is changing, ensure uniqueness
    if (userData.username) {
      const cleanUsername = userData.username.trim().toLowerCase().replace(/\s+/g, '_');
      const duplicate = this.users.find((u) => u.uid !== uid && (u.username || '').trim().toLowerCase() === cleanUsername);
      if (duplicate) {
        return { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh akun lain.` };
      }
      userData.username = cleanUsername;
    }

    // If password update requested, hash it with bcrypt
    if (userData.password && userData.password.trim()) {
      userData.password = await hashPassword(userData.password.trim());
    }

    const updatedUser: User = {
      ...existing,
      ...userData,
      updatedAt: new Date().toISOString(),
    };

    this.users[idx] = updatedUser;

    // If current logged-in user is updated, sync session
    if (this.currentUser && this.currentUser.uid === uid) {
      this.currentUser = { ...this.currentUser, ...updatedUser };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    }

    this.saveLocalData(true);
    this.notify();

    // Persist update to Supabase and Firestore
    this.enqueueSync({ id: updatedUser.uid, type: 'user', action: 'upsert', data: updatedUser });
    saveUserToFirestore(updatedUser).catch(() => {});
    syncUsersToSupabase([updatedUser], this.getSupabaseConfig()).catch(() => {});

    this.addLog('EDIT_PENGGUNA', `Memperbarui akun pengguna: ${updatedUser.name} (@${updatedUser.username})`);

    return { success: true, message: `Data akun ${updatedUser.name} berhasil diperbarui.` };
  }

  public async deleteUser(uid: string): Promise<{ success: boolean; message: string }> {
    if (uid === 'usr-admin') {
      return { success: false, message: 'Akun Super Admin Utama (usr-admin) dilindungi dan tidak dapat dihapus.' };
    }

    if (this.currentUser && this.currentUser.uid === uid) {
      return { success: false, message: 'Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.' };
    }

    const target = this.users.find((u) => u.uid === uid);
    if (!target) {
      return { success: false, message: 'Data pengguna tidak ditemukan.' };
    }

    this.users = this.users.filter((u) => u.uid !== uid);
    this.saveLocalData(true);
    this.notify();

    // Delete from Supabase and Firestore
    this.enqueueSync({ id: uid, type: 'user', action: 'delete' });
    deleteUserFromFirestore(uid).catch(() => {});
    deleteUserFromSupabase(uid, this.getSupabaseConfig()).catch(() => {});

    this.addLog('HAPUS_PENGGUNA', `Menghapus akun pengguna: ${target.name} (@${target.username}) dari database.`);

    return { success: true, message: `Akun ${target.name} berhasil dihapus dari database.` };
  }

  public async resetUserPassword(uid: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const cleanPass = (newPass || '').trim();
    if (!cleanPass || cleanPass.length < 3) {
      return { success: false, message: 'Kata sandi baru minimal 3 karakter.' };
    }

    const user = this.users.find((u) => u.uid === uid);
    if (!user) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    // Safely hash the new password using bcrypt
    const hashedPassword = await hashPassword(cleanPass);
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();

    if (uid === 'usr-admin') {
      this.passwords['usr-admin'] = hashedPassword;
      localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(this.passwords));
    }

    this.saveLocalData(true);
    this.notify();

    this.enqueueSync({ id: user.uid, type: 'user', action: 'upsert', data: user });
    saveUserToFirestore(user).catch(() => {});
    syncUsersToSupabase([user], this.getSupabaseConfig()).catch(() => {});

    this.addLog('RESET_PASSWORD_PENGGUNA', `Administrator mereset kata sandi untuk akun: ${user.name} (@${user.username}) dengan enkripsi bcrypt.`);

    return { success: true, message: `Kata sandi untuk ${user.name} berhasil diperbarui dan dienkripsi dengan aman.` };
  }

  public async loginWithCredentials(
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; user?: User; message: string }> {
    const cleanId = (identifier || '').trim();
    const cleanPass = (pass || '').trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Silakan masukkan Username / Email dan Kata Sandi.' };
    }

    // Refresh from local cache or find user
    let user = this.getUserByUsernameOrEmail(cleanId);

    // Fallback check for admin
    if (!user && (cleanId.toLowerCase() === 'admin' || cleanId.toLowerCase() === 'superadmin')) {
      const adminPass = this.getAdminPassword();
      const isDefaultMatch = await comparePassword(cleanPass, adminPass) || cleanPass === 'admin' || cleanPass === 'admin123';
      if (isDefaultMatch) {
        user = { ...INITIAL_USERS[0], password: await hashPassword(cleanPass) };
        this.users.unshift(user);
        this.saveLocalData(true);
      }
    }

    if (!user) {
      return {
        success: false,
        message: 'Akun tidak ditemukan. Pastikan Username atau Email sudah terdaftar oleh Admin di database.',
      };
    }

    if (user.status === 'nonaktif') {
      return {
        success: false,
        message: 'Akun Anda dinonaktifkan oleh Administrator. Silakan hubungi admin sekolah untuk mengaktifkan kembali.',
      };
    }

    // Check password using bcrypt comparison
    const userPass = user.password || (user.uid === 'usr-admin' ? this.getAdminPassword() : hashPasswordSync('admin'));
    const isDirectMatch = await comparePassword(cleanPass, userPass);
    const isAdminFallbackMatch = user.role === 'Admin' && (await comparePassword(cleanPass, this.getAdminPassword()));
    const isMatch = isDirectMatch || isAdminFallbackMatch;

    if (!isMatch) {
      return {
        success: false,
        message: 'Kata sandi tidak sesuai. Periksa kembali huruf besar/kecil Anda.',
      };
    }

    // If stored password was plain text from legacy data, upgrade to bcrypt on login
    if (!isHashedPassword(user.password)) {
      user.password = await hashPassword(cleanPass);
    }

    // Success login
    user.lastLoginAt = new Date().toISOString();
    this.setCurrentUser(user);
    this.saveLocalData(true);

    // Update lastLoginAt in Firestore
    saveUserToFirestore(user).catch(() => {});

    this.addLog('LOGIN_DATABASE', `Pengguna ${user.name} (@${user.username}) berhasil masuk sebagai ${user.role}.`);

    return {
      success: true,
      user,
      message: `Selamat datang kembali, ${user.name}!`,
    };
  }

  public async loginWithGoogleUser(googleUser: any): Promise<{ success: boolean; user: User; message: string }> {
    if (!googleUser || !googleUser.email) {
      throw new Error('Data akun Google tidak lengkap.');
    }

    const email = (googleUser.email || '').toLowerCase().trim();
    let existing = this.users.find((u) => (u.email && u.email.toLowerCase() === email) || u.uid === googleUser.uid);

    const isSuperAdminEmail =
      email === 'ryugadirgantara9@gmail.com' ||
      email.includes('admin@sman15') ||
      email.startsWith('admin');

    if (existing) {
      if (isSuperAdminEmail && existing.role !== 'Admin') {
        existing.role = 'Admin';
      }
      existing.lastLoginAt = new Date().toISOString();
      if (googleUser.photoURL && !existing.avatar) {
        existing.avatar = googleUser.photoURL;
      }
      this.setCurrentUser(existing);
      this.saveLocalData(true);
      saveUserToFirestore(existing).catch(() => {});
      this.addLog('LOGIN_GOOGLE', `Pengguna ${existing.name} masuk melalui akun Google (${email}).`);
      return { success: true, user: existing, message: `Selamat datang, ${existing.name}!` };
    }

    // Create new user from Google
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    const newUser: User = {
      uid: googleUser.uid || `usr-g-${Date.now()}`,
      username: username,
      email: email,
      name: googleUser.displayName || email.split('@')[0],
      role: isSuperAdminEmail ? 'Admin' : 'Guru',
      subRole: isSuperAdminEmail ? 'Super Admin' : 'Guru Piket',
      assignedClass: '',
      status: 'aktif',
      avatar: googleUser.photoURL || '',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      notes: 'Terdaftar otomatis via Login Google',
    };

    this.users.push(newUser);
    this.setCurrentUser(newUser);
    this.saveLocalData(true);
    saveUserToFirestore(newUser).catch(() => {});

    this.addLog('REGISTER_GOOGLE', `Akun baru terdaftar via Google: ${newUser.name} (${email}) sebagai ${newUser.role}`);

    return { success: true, user: newUser, message: `Selamat datang di NEXA15, ${newUser.name}!` };
  }

  public getAdminPassword(): string {
    const adminUser = this.users.find((u) => u.uid === 'usr-admin');
    return adminUser?.password || this.passwords['usr-admin'] || hashPasswordSync('admin');
  }

  public async updateAdminPassword(oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const currentAdminPass = this.getAdminPassword();
    const isOldMatch = await comparePassword(oldPass, currentAdminPass);
    if (!isOldMatch) {
      return { success: false, message: 'Password lama tidak sesuai.' };
    }
    if (!newPass || newPass.length < 3) {
      return { success: false, message: 'Password baru minimal 3 karakter.' };
    }

    const hashedNewPass = await hashPassword(newPass);
    this.passwords['usr-admin'] = hashedNewPass;
    const adminUser = this.users.find((u) => u.uid === 'usr-admin');
    if (adminUser) {
      adminUser.password = hashedNewPass;
      saveUserToFirestore(adminUser).catch(() => {});
    }
    localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(this.passwords));
    this.saveLocalData(true);
    this.addLog('UBAH_PASSWORD', 'Pengguna Admin memperbarui kata sandi akun dengan enkripsi bcrypt.');
    return { success: true, message: 'Password Admin berhasil diperbarui dan dienkripsi.' };
  }

  public getStudents(): Student[] {
    return [...this.students];
  }

  public getAttendance(): AttendanceRecord[] {
    return [...this.attendance];
  }

  public getLogs(): ActivityLog[] {
    return [...this.logs];
  }

  public getSupabaseConfig() {
    return {
      url: this.settings.supabaseUrl || DEFAULT_SETTINGS.supabaseUrl,
      key: this.settings.supabaseKey || DEFAULT_SETTINGS.supabaseKey,
    };
  }

  private lastFetchTime = 0;
  private isFetching = false;

  public async fetchFromServer(force = false): Promise<void> {
    const now = Date.now();
    if (!force && (this.isFetching || (now - this.lastFetchTime < 15000))) {
      return;
    }

    this.isFetching = true;
    this.lastFetchTime = now;

    try {
      let changed = false;

      // 1. PRIMARY SINGLE DATABASE: Supabase Cloud PostgreSQL
      const config = this.getSupabaseConfig();
      if (isSupabaseConfigured(config)) {
        try {
          const [
            remoteStudents,
            remoteAttendance,
            remoteTeachers,
            remoteTeacherAttendance,
            remoteLogs,
            remoteUsers,
            remoteSettings,
            remoteDispatches,
          ] = await Promise.all([
            fetchStudentsFromSupabase(config),
            fetchAttendanceFromSupabase(config),
            fetchTeachersFromSupabase(config),
            fetchTeacherAttendanceFromSupabase(config),
            fetchLogsFromSupabase(config),
            fetchUsersFromSupabase(config),
            fetchSettingsFromSupabase(config),
            fetchDispatchesFromSupabase(config),
          ]);

          if (remoteStudents !== null && remoteStudents.length > 0) {
            const sMap = new Map<string, Student>();
            this.students.forEach((s) => sMap.set(s.id || s.nisn, s));
            remoteStudents.forEach((s) => sMap.set(s.id || s.nisn, s));
            this.students = Array.from(sMap.values());
            changed = true;
          }

          if (remoteAttendance !== null && remoteAttendance.length > 0) {
            const aMap = new Map<string, AttendanceRecord>();
            this.attendance.forEach((a) => aMap.set(a.id, a));
            remoteAttendance.forEach((a) => aMap.set(a.id, a));
            this.attendance = Array.from(aMap.values());
            changed = true;
          }

          if (remoteTeachers !== null && remoteTeachers.length > 0) {
            const tMap = new Map<string, Teacher>();
            this.teachers.forEach((t) => tMap.set(t.id || t.nip, t));
            remoteTeachers.forEach((t) => tMap.set(t.id || t.nip, t));
            this.teachers = Array.from(tMap.values());
            changed = true;
          }

          if (remoteTeacherAttendance !== null && remoteTeacherAttendance.length > 0) {
            const taMap = new Map<string, TeacherAttendanceRecord>();
            this.teacherAttendance.forEach((ta) => taMap.set(ta.id, ta));
            remoteTeacherAttendance.forEach((ta) => taMap.set(ta.id, ta));
            this.teacherAttendance = Array.from(taMap.values());
            changed = true;
          }

          if (remoteLogs !== null && remoteLogs.length > 0) {
            const lMap = new Map<string, ActivityLog>();
            this.logs.forEach((l) => lMap.set(l.id, l));
            remoteLogs.forEach((l) => lMap.set(l.id, l));
            this.logs = Array.from(lMap.values()).slice(0, 500);
            changed = true;
          }

          if (remoteUsers !== null && remoteUsers.length > 0) {
            const uMap = new Map<string, User>();
            this.users.forEach((u) => uMap.set(u.uid, u));
            remoteUsers.forEach((u) => uMap.set(u.uid, u));
            this.users = Array.from(uMap.values());
            changed = true;
          }

          if (remoteSettings !== null && Object.keys(remoteSettings).length > 0) {
            this.settings = {
              ...this.settings,
              ...remoteSettings,
              homeroomAssignments: {
                ...(this.settings.homeroomAssignments || {}),
                ...(remoteSettings.homeroomAssignments || {}),
              },
            };
            changed = true;
          }

          if (remoteDispatches !== null && remoteDispatches.length > 0) {
            const dMap = new Map<string, ProblematicStudentDispatch>();
            this.dispatches.forEach((d) => dMap.set(d.id, d));
            remoteDispatches.forEach((d) => dMap.set(d.id, d));
            this.dispatches = Array.from(dMap.values());
            changed = true;
          }
        } catch (sErr) {
          console.warn('Supabase fetch notice:', sErr);
        }
      }

      // 2. BACKUP / MERGE CLOUD DATABASE: Firebase Firestore (Fail-safe)
      try {
        const [
          remoteStudents,
          remoteAttendance,
          remoteTeachers,
          remoteTeacherAttendance,
          remoteLogs
        ] = await Promise.all([
          fetchStudentsFromFirestore(),
          fetchAttendanceFromFirestore(),
          fetchTeachersFromFirestore(),
          fetchTeacherAttendanceFromFirestore(),
          fetchLogsFromFirestore(),
        ]);

        if (remoteStudents && remoteStudents.length > 0 && this.students.length === 0) {
          const sMap = new Map<string, Student>();
          this.students.forEach((s) => sMap.set(s.id || s.nisn, s));
          remoteStudents.forEach((s) => sMap.set(s.id || s.nisn, s));
          this.students = Array.from(sMap.values());
          changed = true;
        }

        if (remoteAttendance && remoteAttendance.length > 0) {
          const aMap = new Map<string, AttendanceRecord>();
          this.attendance.forEach((a) => aMap.set(a.id, a));
          remoteAttendance.forEach((a) => {
            if (!aMap.has(a.id)) {
              aMap.set(a.id, a);
              changed = true;
            }
          });
          this.attendance = Array.from(aMap.values());
        }

        if (remoteTeachers && remoteTeachers.length > 0 && this.teachers.length === 0) {
          const tMap = new Map<string, Teacher>();
          this.teachers.forEach((t) => tMap.set(t.id || t.nip, t));
          remoteTeachers.forEach((t) => tMap.set(t.id || t.nip, t));
          this.teachers = Array.from(tMap.values());
          changed = true;
        }

        if (remoteTeacherAttendance && remoteTeacherAttendance.length > 0) {
          const taMap = new Map<string, TeacherAttendanceRecord>();
          this.teacherAttendance.forEach((ta) => taMap.set(ta.id, ta));
          remoteTeacherAttendance.forEach((ta) => {
            if (!taMap.has(ta.id)) {
              taMap.set(ta.id, ta);
              changed = true;
            }
          });
          this.teacherAttendance = Array.from(taMap.values());
        }

        if (remoteLogs && remoteLogs.length > 0 && this.logs.length === 0) {
          const lMap = new Map<string, ActivityLog>();
          this.logs.forEach((l) => lMap.set(l.id, l));
          remoteLogs.forEach((l) => lMap.set(l.id, l));
          this.logs = Array.from(lMap.values()).slice(0, 500);
          changed = true;
        }
      } catch (fErr) {
        console.warn('Firestore fallback fetch notice:', fErr);
      }

      this.processAutoAlpa();
      if (changed) {
        this.saveLocalData(true);
        this.notify();
      }
    } catch (err: any) {
      console.warn('Fetch server error notice:', err?.message || err);
    } finally {
      this.isFetching = false;
    }
  }

  public async syncAllToSupabase(): Promise<{ success: boolean; message: string; remainingQueue: number }> {
    try {
      const config = this.getSupabaseConfig();
      if (!isSupabaseConfigured(config)) {
        return { success: false, message: 'Supabase URL atau Key belum dikonfigurasi di Pengaturan.', remainingQueue: this.syncQueue.length };
      }

      const [sRes, aRes, tRes, taRes, lRes, uRes, setRes, dRes] = await Promise.all([
        syncStudentsToSupabase(this.students, config),
        syncAttendanceToSupabase(this.attendance, config),
        syncTeachersToSupabase(this.teachers, config),
        syncTeacherAttendanceToSupabase(this.teacherAttendance, config),
        syncLogsToSupabase(this.logs, config),
        syncUsersToSupabase(this.users, config),
        syncSettingsToSupabase(this.settings, config),
        syncDispatchesToSupabase(this.dispatches, config),
      ]);

      const errors: string[] = [];
      if (!sRes.success) errors.push(`Siswa: ${sRes.error || 'Gagal'}`);
      if (!aRes.success) errors.push(`Presensi Siswa: ${aRes.error || 'Gagal'}`);
      if (!tRes.success) errors.push(`Guru: ${tRes.error || 'Gagal'}`);
      if (!taRes.success) errors.push(`Presensi Guru: ${taRes.error || 'Gagal'}`);
      if (!lRes.success) errors.push(`Log: ${lRes.error || 'Gagal'}`);
      if (!uRes.success) errors.push(`Pengguna: ${uRes.error || 'Gagal'}`);
      if (!setRes.success) errors.push(`Pengaturan: ${setRes.error || 'Gagal'}`);
      if (!dRes.success) errors.push(`Disposisi: ${dRes.error || 'Gagal'}`);

      if (errors.length === 0) {
        const hadQueue = this.syncQueue.length;
        // Since all in-memory entities are fully upserted to Supabase, clear the offline sync queue
        this.syncQueue = [];
        try {
          localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
        } catch {}
        this.saveLocalData(true);
        this.notify();

        const queueMsg = hadQueue > 0 ? ` serta membersihkan ${hadQueue} antrian pengiriman (0 antrian tersisa)` : ' (0 antrian tersisa)';
        const msg = `Berhasil menyelaraskan ${sRes.count} siswa, ${aRes.count} presensi siswa, ${tRes.count} guru, ${taRes.count} presensi guru, ${uRes.count} akun, ${dRes.count} disposisi, dan ${lRes.count} log ke Supabase Cloud PostgreSQL${queueMsg}.`;
        this.updateSettings({ lastSupabaseSync: new Date().toISOString() });
        return { success: true, message: msg, remainingQueue: 0 };
      }

      // If core attendance and master data succeeded, clear their queue items and update sync time
      const coreSucceeded = sRes.success && aRes.success && tRes.success && taRes.success;
      if (coreSucceeded) {
        this.syncQueue = this.syncQueue.filter((q) => q.type === 'user' || q.type === 'settings' || q.type === 'dispatch');
        this.saveLocalData(true);
        this.notify();
        this.updateSettings({ lastSupabaseSync: new Date().toISOString() });
      }

      return {
        success: false,
        message: `Catatan sinkronisasi data: ${errors.join(' | ')}`,
        remainingQueue: this.syncQueue.length,
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error koneksi Supabase Cloud PostgreSQL.', remainingQueue: this.syncQueue.length };
    }
  }

  public async fetchHistoricalAttendance(startDate: string, endDate: string): Promise<number> {
    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) throw new Error('Koneksi internet terputus.');

      const config = this.getSupabaseConfig();
      let records: AttendanceRecord[] = [];
      let teacherRecords: TeacherAttendanceRecord[] = [];

      if (isSupabaseConfigured(config)) {
        const sRecords = await fetchAttendanceFromSupabase(config, startDate, endDate);
        const stRecords = await fetchTeacherAttendanceFromSupabase(config, startDate, endDate);
        if (sRecords && sRecords.length > 0) records = sRecords;
        if (stRecords && stRecords.length > 0) teacherRecords = stRecords;
      }

      // If Supabase returned empty, fallback check Firestore
      if (records.length === 0) {
        const fRecords = await fetchAttendanceFromFirestore(startDate, endDate);
        if (fRecords && fRecords.length > 0) records = fRecords;
      }
      if (teacherRecords.length === 0) {
        const ftRecords = await fetchTeacherAttendanceFromFirestore(startDate, endDate);
        if (ftRecords && ftRecords.length > 0) teacherRecords = ftRecords;
      }

      if (records.length > 0) {
        const aMap = new Map<string, AttendanceRecord>();
        this.attendance.forEach((a) => aMap.set(a.id, a));
        records.forEach((a) => aMap.set(a.id, a));
        this.attendance = Array.from(aMap.values()).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      }

      if (teacherRecords.length > 0) {
        const taMap = new Map<string, TeacherAttendanceRecord>();
        this.teacherAttendance.forEach((ta) => taMap.set(ta.id, ta));
        teacherRecords.forEach((ta) => taMap.set(ta.id, ta));
        this.teacherAttendance = Array.from(taMap.values()).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      }

      this.saveLocalData(true);
      this.notify();
      return records.length + teacherRecords.length;
    } catch (e) {
      console.warn('Gagal menarik riwayat presensi cloud:', e);
      return 0;
    }
  }

  public async addStudent(studentData: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    // Check if student with same NISN already exists to prevent duplicate entry
    const existingIndex = this.students.findIndex((s) => s.nisn && s.nisn === studentData.nisn);
    if (existingIndex !== -1) {
      const existing = this.students[existingIndex];
      const updated: Student = {
        ...existing,
        ...studentData,
      };
      this.students[existingIndex] = updated;
      this.notify();
      this.enqueueSync({ id: updated.id, type: 'student', action: 'upsert', data: updated });
      this.addLog('EDIT_SISWA', `Memperbarui data siswa (mencegah duplikasi NISN): ${updated.nama} (${updated.kelas})`);
      return updated;
    }

    const newId = `std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newStudent: Student = {
      ...studentData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    this.students.unshift(newStudent);
    this.notify();

    this.enqueueSync({ id: newStudent.id, type: 'student', action: 'upsert', data: newStudent });
    this.addLog('TAMBAH_SISWA', `Menambahkan siswa baru: ${newStudent.nama} (${newStudent.kelas}) - NISN: ${newStudent.nisn}`);

    return newStudent;
  }

  public async updateStudent(id: string, studentData: Partial<Student>): Promise<boolean> {
    const idx = this.students.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    const updated = { ...this.students[idx], ...studentData };
    this.students[idx] = updated;
    this.notify();

    this.enqueueSync({ id: updated.id, type: 'student', action: 'upsert', data: updated });
    this.addLog('EDIT_SISWA', `Memperbarui data siswa: ${updated.nama} (${updated.kelas})`);

    return true;
  }

  public async deleteStudent(id: string): Promise<boolean> {
    const idx = this.students.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    // Penghapusan Halus (Soft Delete): Hanya ubah status menjadi nonaktif
    const target = this.students[idx];
    const updated = { ...target, status: 'nonaktif' as const };
    this.students[idx] = updated;

    this.notify();

    this.enqueueSync({ id: target.id || id, type: 'student', action: 'upsert', data: updated });
    this.addLog('NONAKTIF_SISWA', `Menonaktifkan siswa: ${target.nama} (${target.kelas}) (Soft Delete).`);
    return true;
  }

  public async deleteMultipleStudents(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    let count = 0;

    this.students = this.students.map((s) => {
      if (idSet.has(s.id)) {
        count++;
        const updated = { ...s, status: 'nonaktif' as const };
        this.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: updated });
        return updated;
      }
      return s;
    });

    this.notify();
    this.addLog('NONAKTIF_MASSAL_SISWA', `Menonaktifkan ${count} siswa terpilih (Soft Delete).`);
    return true;
  }

  public async updateMultipleStudents(ids: string[], updates: Partial<Student>): Promise<boolean> {
    const idSet = new Set(ids);
    let count = 0;

    this.students = this.students.map((s) => {
      if (idSet.has(s.id)) {
        count++;
        const updated = { ...s, ...updates };
        this.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: updated });
        return updated;
      }
      return s;
    });

    this.notify();
    this.addLog('UPDATE_MASSAL_SISWA', `Memperbarui data ${count} siswa (Contoh Update: ${JSON.stringify(updates)}).`);
    return true;
  }

  public async deleteAllStudents(): Promise<boolean> {
    const count = this.students.length;

    this.students = this.students.map((s) => {
      const updated = { ...s, status: 'nonaktif' as const };
      this.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: updated });
      return updated;
    });

    this.notify();
    this.addLog('RESET_SISWA', `Menonaktifkan seluruh ${count} data siswa (Soft Delete).`);
    return true;
  }

  public async importStudents(
    importList: Omit<Student, 'id' | 'createdAt'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    // Eliminasi data ganda di dalam file impor berdasarkan NISN
    const uniqueImportMap = new Map<string, Omit<Student, 'id' | 'createdAt'>>();
    importList.forEach((item) => {
      if (item.nisn) {
        uniqueImportMap.set(item.nisn, item);
      }
    });

    const formatted: Student[] = Array.from(uniqueImportMap.values()).map((s, idx) => ({
      ...s,
      id: `std-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }));

    if (mode === 'replace') {
      const oldIds = this.students.map((s) => s.id);
      this.students = formatted;
      this.notify();
      oldIds.forEach((id) => {
        this.enqueueSync({ id, type: 'student', action: 'delete' });
      });
      formatted.forEach((s) => {
        this.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: s });
      });
    } else {
      // Append mode: gabungkan & perbarui NISN yang sama tanpa menduplikasi
      const map = new Map<string, Student>();
      this.students.forEach((s) => map.set(s.nisn, s));
      formatted.forEach((s) => {
        const existing = map.get(s.nisn);
        if (existing) {
          map.set(s.nisn, { ...existing, ...s, id: existing.id });
        } else {
          map.set(s.nisn, s);
        }
      });
      this.students = Array.from(map.values());
      this.notify();
      this.students.forEach((s) => {
        this.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: s });
      });
    }

    this.addLog('IMPORT_SISWA', `Berhasil mengimpor ${formatted.length} data siswa tanpa duplikasi.`);
    return true;
  }

  public getStudentById(id: string): Student | undefined {
    if (!id) return undefined;
    const cleanId = String(id).trim();
    return this.students.find((s) => s.id === cleanId);
  }

  public getStudentByNisn(nisn: string): Student | undefined {
    if (!nisn) return undefined;
    const cleanNisn = String(nisn).trim();
    return this.students.find((s) => s.nisn && s.nisn.trim() === cleanNisn);
  }

  public getStudentByRfidUid(rfidUid: string): Student | undefined {
    if (!rfidUid) return undefined;
    return this.students.find((s) => s.rfid_uid && isMatchingRfidUid(s.rfid_uid, rfidUid));
  }

  public assignRfidToStudent(studentId: string, rfidUid: string): boolean {
    const student = this.getStudentById(studentId);
    if (!student) return false;
    const cleanUid = String(rfidUid).trim().toUpperCase();

    // Check if another student has this RFID UID
    const existing = this.getStudentByRfidUid(cleanUid);
    if (existing && existing.id !== studentId) {
      existing.rfid_uid = undefined;
      this.enqueueSync({ id: existing.id, type: 'student', action: 'upsert', data: existing });
    }

    student.rfid_uid = cleanUid;
    this.notify();
    this.enqueueSync({ id: student.id, type: 'student', action: 'upsert', data: student });
    this.addLog('ASSIGN_RFID_SISWA', `Menetapkan Kartu RFID [${cleanUid}] ke siswa: ${student.nama} (${student.kelas})`);
    return true;
  }

  /**
   * Pengenalan Akurat & Bebas Tabrakan Identitas Siswa dari Hasil Pindai QR / Barcode / Kartu RFID.
   * Menggunakan pencarian hierarkis berbasis kecocokan eksak (Exact Match) pada RFID UID, NISN, dan ID_QR,
   * serta mem-parsing format terstruktur (NPSN.NISN.NAMA atau JSON) tanpa substring matching longgar
   * sehingga tidak akan ada 2 siswa berbeda yang dianggap orang yang sama.
   */
  public findStudentByScannedCode(scannedText: string): Student | undefined {
    if (!scannedText) return undefined;
    const cleanText = String(scannedText).replace(/[\r\n\t]+/g, '').trim();
    if (!cleanText) return undefined;

    // 0. Exact Match pada UID Kartu RFID / NFC
    const exactRfid = this.students.find(
      (s) => s.rfid_uid && isMatchingRfidUid(s.rfid_uid, cleanText)
    );
    if (exactRfid) return exactRfid;

    // 1. Exact Match pada ID_QR (case-insensitive & trimmed), HANYA jika bukan generic placeholder (misal: "69933068")
    if (!isGenericQrCode(cleanText)) {
      const exactQr = this.students.find(
        (s) => s.id_qr && !isGenericQrCode(s.id_qr) && s.id_qr.trim().toLowerCase() === cleanText.toLowerCase()
      );
      if (exactQr) return exactQr;
    }

    // 2. Exact Match / Digit-Normalized Match pada NISN
    const exactNisn = this.students.find(
      (s) => isMatchingNisn(s.nisn, cleanText)
    );
    if (exactNisn) return exactNisn;

    // 3. Exact Match pada Document ID
    const exactId = this.students.find((s) => s.id === cleanText);
    if (exactId) return exactId;

    // 4. Parsing Format Terstruktur Berpemisah Titik (Contoh: "69933068.3080370790.DADANG BUAMONA" atau "69933068.3080370790")
    if (cleanText.includes('.')) {
      const parts = cleanText.split('.').map((p) => p.trim()).filter(Boolean);
      const schoolNpsn = (this.settings.schoolNPSN || '69933068').trim();

      // Format 3 Bagian atau lebih: NPSN.NISN.NAMA (Contoh: "69933068.3080370790.DADANG BUAMONA")
      if (parts.length >= 3) {
        const potentialNisn = parts[1];
        const parsedName = parts.slice(2).join('.').trim().toLowerCase();

        // 4A. Match by NISN in parts[1] (Prioritas Tertinggi & Akurat)
        if (potentialNisn) {
          const matchByNisn = this.students.find((s) => isMatchingNisn(s.nisn, potentialNisn));
          if (matchByNisn) return matchByNisn;
        }

        // 4B. Match by Name in parts[2...] HANYA jika cocok eksak nama
        if (parsedName) {
          const matchByName = this.students.find((s) => s.nama && s.nama.trim().toLowerCase() === parsedName);
          if (matchByName) return matchByName;
        }
      } else if (parts.length === 2) {
        // Format 2 Bagian: Bisa [NPSN, NISN] atau [NISN, NAMA]
        const isPart0Npsn = parts[0] === schoolNpsn || parts[0] === '69933068';

        if (isPart0Npsn) {
          // parts[0] adalah NPSN -> parts[1] adalah NISN
          const matchByPart1 = this.students.find((s) => isMatchingNisn(s.nisn, parts[1]));
          if (matchByPart1) return matchByPart1;
        } else {
          // parts[0] bukan NPSN -> periksa parts[0] sebagai NISN
          const matchByPart0 = this.students.find((s) => isMatchingNisn(s.nisn, parts[0]));
          if (matchByPart0) return matchByPart0;

          const matchByPart1 = this.students.find((s) => isMatchingNisn(s.nisn, parts[1]));
          if (matchByPart1) return matchByPart1;

          const matchByName1 = this.students.find((s) => s.nama && s.nama.trim().toLowerCase() === parts[1].toLowerCase());
          if (matchByName1) return matchByName1;
        }
      }
    }

    // 5. Parsing Format JSON (Contoh: {"nisn": "3080370790", "id_qr": "..."})
    if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.nisn) {
          const s = this.students.find((st) => isMatchingNisn(st.nisn, String(parsed.nisn)));
          if (s) return s;
        }
        if (parsed.id_qr && !isGenericQrCode(String(parsed.id_qr))) {
          const s = this.students.find((st) => st.id_qr && st.id_qr.trim().toLowerCase() === String(parsed.id_qr).trim().toLowerCase());
          if (s) return s;
        }
        if (parsed.id) {
          const s = this.students.find((st) => st.id === String(parsed.id).trim());
          if (s) return s;
        }
      } catch {}
    }

    // 6. Parsing URL Search Params jika format berupa tautan
    if (cleanText.includes('?') || cleanText.includes('&')) {
      try {
        const queryIdx = cleanText.indexOf('?');
        const queryStr = queryIdx !== -1 ? cleanText.substring(queryIdx + 1) : cleanText;
        const params = new URLSearchParams(queryStr);
        const qNisn = params.get('nisn');
        const qIdQr = params.get('id_qr');
        if (qNisn) {
          const matchQuery = this.students.find((s) => isMatchingNisn(s.nisn, qNisn));
          if (matchQuery) return matchQuery;
        }
        if (qIdQr && !isGenericQrCode(qIdQr)) {
          const matchQuery = this.students.find((s) => s.id_qr && s.id_qr.trim().toLowerCase() === qIdQr.trim().toLowerCase());
          if (matchQuery) return matchQuery;
        }
      } catch {}
    }

    // 7. Pencocokan Eksak Nama Lengkap Siswa (Strict Full Exact Match)
    const exactNameMatch = this.students.find(
      (s) => s.nama && s.nama.trim().toLowerCase() === cleanText.toLowerCase()
    );
    if (exactNameMatch) return exactNameMatch;

    return undefined;
  }

  // ==========================================
  // TEACHER (GURU & STAF) DATA MANAGEMENT
  // ==========================================

  public getTeachers(): Teacher[] {
    return [...this.teachers];
  }

  public getTeacherByNip(nip: string): Teacher | undefined {
    if (!nip) return undefined;
    const clean = String(nip).trim();
    return this.teachers.find((t) => isMatchingNip(t.nip, clean));
  }

  public getTeacherById(id: string): Teacher | undefined {
    if (!id) return undefined;
    const cleanId = String(id).trim();
    return this.teachers.find((t) => t.id === cleanId);
  }

  public getTeacherByRfidUid(rfidUid: string): Teacher | undefined {
    if (!rfidUid) return undefined;
    return this.teachers.find((t) => t.rfid_uid && isMatchingRfidUid(t.rfid_uid, rfidUid));
  }

  public assignRfidToTeacher(teacherId: string, rfidUid: string): boolean {
    const teacher = this.getTeacherById(teacherId);
    if (!teacher) return false;
    const cleanUid = String(rfidUid).trim().toUpperCase();

    const existing = this.getTeacherByRfidUid(cleanUid);
    if (existing && existing.id !== teacherId) {
      existing.rfid_uid = undefined;
      this.enqueueSync({ id: existing.id, type: 'teacher', action: 'upsert', data: existing });
    }

    teacher.rfid_uid = cleanUid;
    this.notify();
    this.enqueueSync({ id: teacher.id, type: 'teacher', action: 'upsert', data: teacher });
    this.addLog('ASSIGN_RFID_GURU', `Menetapkan Kartu RFID [${cleanUid}] ke Guru: ${teacher.nama} (${teacher.jabatan})`);
    return true;
  }

  public findByRfidUid(rfidUid: string): {
    type: 'siswa' | 'guru';
    student?: Student;
    teacher?: Teacher;
  } | undefined {
    if (!rfidUid) return undefined;
    const clean = String(rfidUid).trim();
    const student = this.getStudentByRfidUid(clean);
    if (student) return { type: 'siswa', student };
    const teacher = this.getTeacherByRfidUid(clean);
    if (teacher) return { type: 'guru', teacher };
    return undefined;
  }

  public findPersonByRfidOrCode(codeOrUid: string): {
    type: 'siswa' | 'guru';
    student?: Student;
    teacher?: Teacher;
  } | undefined {
    if (!codeOrUid) return undefined;
    const student = this.findStudentByScannedCode(codeOrUid);
    if (student) return { type: 'siswa', student };
    const teacher = this.findTeacherByScannedCode(codeOrUid);
    if (teacher) return { type: 'guru', teacher };
    return undefined;
  }

  /**
   * Pengenalan Akurat Guru & Staf dari Hasil Pindai QR / Barcode / Kartu RFID
   */
  public findTeacherByScannedCode(scannedText: string): Teacher | undefined {
    if (!scannedText) return undefined;
    const cleanText = String(scannedText).replace(/[\r\n\t]+/g, '').trim();
    if (!cleanText) return undefined;

    // 0. Exact Match pada UID Kartu RFID / NFC
    const exactRfid = this.teachers.find(
      (t) => t.rfid_uid && isMatchingRfidUid(t.rfid_uid, cleanText)
    );
    if (exactRfid) return exactRfid;

    // 1. Exact Match pada ID_QR (Hanya jika bukan generic placeholder)
    if (!isGenericQrCode(cleanText)) {
      const exactQr = this.teachers.find(
        (t) => t.id_qr && !isGenericQrCode(t.id_qr) && t.id_qr.trim().toLowerCase() === cleanText.toLowerCase()
      );
      if (exactQr) return exactQr;
    }

    // 2. Exact Match pada NIP
    const exactNip = this.teachers.find(
      (t) => isMatchingNip(t.nip, cleanText)
    );
    if (exactNip) return exactNip;

    // 3. Exact Match pada Document ID
    const exactId = this.teachers.find((t) => t.id === cleanText);
    if (exactId) return exactId;

    // 4. Parsing Format Terstruktur Titik (Contoh: "69933068.198501012010011001" atau "69933068.198501012010011001.NAMA")
    if (cleanText.includes('.')) {
      const parts = cleanText.split('.').map((p) => p.trim()).filter(Boolean);
      const schoolNpsn = (this.settings.schoolNPSN || '69933068').trim();

      if (parts.length >= 3) {
        const potentialNip = parts[1];
        const parsedName = parts.slice(2).join('.').trim().toLowerCase();

        if (potentialNip) {
          const matchByNip = this.teachers.find((t) => isMatchingNip(t.nip, potentialNip));
          if (matchByNip) return matchByNip;
        }

        if (parsedName) {
          const matchByName = this.teachers.find((t) => t.nama && t.nama.trim().toLowerCase() === parsedName);
          if (matchByName) return matchByName;
        }
      } else if (parts.length === 2) {
        const isPart0Npsn = parts[0] === schoolNpsn || parts[0] === '69933068';
        if (isPart0Npsn) {
          const matchByPart1 = this.teachers.find((t) => isMatchingNip(t.nip, parts[1]));
          if (matchByPart1) return matchByPart1;
        } else {
          const matchByPart0 = this.teachers.find((t) => isMatchingNip(t.nip, parts[0]));
          if (matchByPart0) return matchByPart0;

          const matchByPart1 = this.teachers.find((t) => isMatchingNip(t.nip, parts[1]));
          if (matchByPart1) return matchByPart1;

          const matchByName = this.teachers.find((t) => t.nama && t.nama.trim().toLowerCase() === parts[1].toLowerCase());
          if (matchByName) return matchByName;
        }
      }
    }

    // 5. Parsing Format JSON
    if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.nip) {
          const t = this.teachers.find((th) => isMatchingNip(th.nip, String(parsed.nip)));
          if (t) return t;
        }
        if (parsed.id_qr && !isGenericQrCode(String(parsed.id_qr))) {
          const t = this.teachers.find((th) => th.id_qr && th.id_qr.trim().toLowerCase() === String(parsed.id_qr).trim().toLowerCase());
          if (t) return t;
        }
        if (parsed.id) {
          const t = this.teachers.find((th) => th.id === String(parsed.id).trim());
          if (t) return t;
        }
      } catch {}
    }

    // 6. Strict Exact Full Name Match
    const exactNameMatch = this.teachers.find(
      (t) => t.nama && t.nama.trim().toLowerCase() === cleanText.toLowerCase()
    );
    if (exactNameMatch) return exactNameMatch;

    return undefined;
  }

  public async addTeacher(teacherData: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const cleanNip = String(teacherData.nip || '').trim();
    const existingIndex = this.teachers.findIndex((t) => t.nip && t.nip === cleanNip);
    
    if (existingIndex !== -1) {
      const existing = this.teachers[existingIndex];
      const updated: Teacher = {
        ...existing,
        ...teacherData,
        nip: cleanNip,
        id_qr: teacherData.id_qr || `69933068.${cleanNip}`,
      };
      this.teachers[existingIndex] = updated;
      this.notify();
      this.enqueueSync({ id: updated.id, type: 'teacher', action: 'upsert', data: updated });
      this.addLog('EDIT_GURU', `Memperbarui data guru (mencegah duplikasi NIP): ${updated.nama} - NIP: ${updated.nip}`);
      return updated;
    }

    const newId = `tch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newTeacher: Teacher = {
      ...teacherData,
      id: newId,
      nip: cleanNip,
      id_qr: teacherData.id_qr || `69933068.${cleanNip}`,
      createdAt: new Date().toISOString(),
    };

    this.teachers.unshift(newTeacher);
    this.notify();
    this.enqueueSync({ id: newTeacher.id, type: 'teacher', action: 'upsert', data: newTeacher });
    this.addLog('TAMBAH_GURU', `Menambahkan guru baru: ${newTeacher.nama} (${newTeacher.jabatan}) - NIP: ${newTeacher.nip}`);
    return newTeacher;
  }

  public async updateTeacher(id: string, teacherData: Partial<Teacher>): Promise<boolean> {
    const idx = this.teachers.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    const updated = { ...this.teachers[idx], ...teacherData };
    if (teacherData.nip && !teacherData.id_qr) {
      updated.id_qr = `69933068.${teacherData.nip.trim()}`;
    }
    this.teachers[idx] = updated;
    this.notify();
    this.enqueueSync({ id: updated.id, type: 'teacher', action: 'upsert', data: updated });
    this.addLog('EDIT_GURU', `Memperbarui data guru: ${updated.nama} (${updated.jabatan})`);
    return true;
  }

  public async deleteTeacher(id: string): Promise<boolean> {
    const idx = this.teachers.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    // Penghapusan Halus (Soft Delete): Hanya ubah status menjadi Nonaktif
    const target = this.teachers[idx];
    const updated = { ...target, status_kepegawaian: 'Nonaktif' as const };
    this.teachers[idx] = updated;

    this.notify();

    this.enqueueSync({ id: target.id || id, type: 'teacher', action: 'upsert', data: updated });
    this.addLog('NONAKTIF_GURU', `Menonaktifkan guru: ${target.nama} (${target.jabatan}) NIP: ${target.nip} (Soft Delete)`);
    return true;
  }

  public async deleteMultipleTeachers(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    let count = 0;

    this.teachers = this.teachers.map((t) => {
      if (idSet.has(t.id)) {
        count++;
        const updated = { ...t, status_kepegawaian: 'Nonaktif' as const };
        this.enqueueSync({ id: t.id, type: 'teacher', action: 'upsert', data: updated });
        return updated;
      }
      return t;
    });

    this.notify();
    this.addLog('NONAKTIF_MASSAL_GURU', `Menonaktifkan ${count} data guru terpilih (Soft Delete).`);
    return true;
  }

  public async deleteAllTeachers(): Promise<boolean> {
    const count = this.teachers.length;

    this.teachers = this.teachers.map((t) => {
      const updated = { ...t, status_kepegawaian: 'Nonaktif' as const };
      this.enqueueSync({ id: t.id, type: 'teacher', action: 'upsert', data: updated });
      return updated;
    });

    this.notify();
    this.addLog('RESET_GURU', `Menonaktifkan seluruh ${count} data guru (Soft Delete).`);
    return true;
  }

  public async importTeachers(
    importList: Omit<Teacher, 'id' | 'createdAt'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    const uniqueImportMap = new Map<string, Omit<Teacher, 'id' | 'createdAt'>>();
    importList.forEach((item) => {
      const cleanNip = String(item.nip || '').trim();
      if (cleanNip) {
        uniqueImportMap.set(cleanNip, {
          ...item,
          nip: cleanNip,
          id_qr: item.id_qr || `69933068.${cleanNip}`,
        });
      }
    });

    const formatted: Teacher[] = Array.from(uniqueImportMap.values()).map((t, idx) => ({
      ...t,
      id: `tch-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }));

    if (mode === 'replace') {
      const oldIds = this.teachers.map((t) => t.id);
      this.teachers = formatted;
      this.notify();
      oldIds.forEach((id) => {
        this.enqueueSync({ id, type: 'teacher', action: 'delete' });
      });
      formatted.forEach((t) => {
        this.enqueueSync({ id: t.id, type: 'teacher', action: 'upsert', data: t });
      });
    } else {
      const map = new Map<string, Teacher>();
      this.teachers.forEach((t) => map.set(t.nip, t));
      formatted.forEach((t) => {
        const existing = map.get(t.nip);
        if (existing) {
          map.set(t.nip, { ...existing, ...t, id: existing.id });
        } else {
          map.set(t.nip, t);
        }
      });
      this.teachers = Array.from(map.values());
      this.notify();
      this.teachers.forEach((t) => {
        this.enqueueSync({ id: t.id, type: 'teacher', action: 'upsert', data: t });
      });
    }

    this.addLog('IMPORT_GURU', `Berhasil mengimpor ${formatted.length} data guru tanpa duplikasi.`);
    return true;
  }

  // ==========================================
  // TEACHER (GURU) ATTENDANCE MANAGEMENT
  // ==========================================

  public getTeacherAttendance(): TeacherAttendanceRecord[] {
    return [...this.teacherAttendance];
  }

  public isTeacherRecordForDate(r: TeacherAttendanceRecord, targetYyyyMmDd: string): boolean {
    if (!r || !targetYyyyMmDd) return false;
    const targetNorm = this.normalizeToYyyyMmDd(targetYyyyMmDd);

    if (r.tanggal) {
      const recordNorm = this.normalizeToYyyyMmDd(r.tanggal);
      if (recordNorm === targetNorm) return true;
      if (r.tanggal.includes(targetYyyyMmDd) || targetYyyyMmDd.includes(r.tanggal)) return true;
    }

    if (r.timestamp) {
      const tsNorm = this.normalizeToYyyyMmDd(r.timestamp);
      if (tsNorm === targetNorm) return true;
    }

    return false;
  }

  public isTeacherRecordForToday(r: TeacherAttendanceRecord): boolean {
    return this.isTeacherRecordForDate(r, this.getTodayYyyyMmDd());
  }

  public formatRecordTimeWIT(isoString?: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return (
        d.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jayapura',
          hour12: false,
        }) + ' WIT'
      );
    } catch {
      return '';
    }
  }

  public recordTeacherScan(
    scannedText: string,
    rawQR?: string,
    rawCode?: string,
    officerEmail = 'Petugas Piket',
    forcedType?: AttendanceType | 'Auto',
    scanMethodOverride?: AttendanceScanMethod,
    customNote?: string
  ): {
    success: boolean;
    isDuplicate?: boolean;
    record?: TeacherAttendanceRecord;
    teacher?: Teacher;
    message: string;
    type?: AttendanceType;
    status?: TeacherAttendanceStatus;
    isLate?: boolean;
    lateMinutes?: number;
  } {
    const cleanText = (scannedText || rawQR || rawCode || '').trim();
    if (!cleanText) {
      return { success: false, message: 'Kode QR Guru tidak terbaca atau kosong.' };
    }

    // Match teacher accurately using strict hierarchical lookup without false collisions
    const matchedTeacher = this.findTeacherByScannedCode(cleanText);

    if (!matchedTeacher) {
      return {
        success: false,
        message: `Guru dengan NIP / Kode "${cleanText}" tidak ditemukan di database guru.`,
      };
    }

    if (matchedTeacher.status === 'nonaktif') {
      return {
        success: false,
        teacher: matchedTeacher,
        message: `Guru ${matchedTeacher.nama} berstatus nonaktif di sistem.`,
      };
    }

    const todayStr = this.getTodayYyyyMmDd();
    const now = new Date();
    const nowISO = now.toISOString();

    // Determine current hour in WIT (UTC+9)
    let currentHourWIT = now.getHours();
    let currentMinuteWIT = now.getMinutes();
    try {
      const witTimeParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const hPart = witTimeParts.find((p) => p.type === 'hour');
      const mPart = witTimeParts.find((p) => p.type === 'minute');
      if (hPart) currentHourWIT = parseInt(hPart.value, 10);
      if (mPart) currentMinuteWIT = parseInt(mPart.value, 10);
    } catch {
      // Fallback
    }

    // Check existing scans today for this teacher strictly by NIP or unique ID_QR
    const teacherTodayRecords = this.teacherAttendance.filter((a) => {
      if (!this.isTeacherRecordForToday(a)) return false;

      if (matchedTeacher.nip && a.nip) {
        if (isMatchingNip(matchedTeacher.nip, a.nip)) return true;
        return false;
      }

      if (
        matchedTeacher.id_qr &&
        a.id_qr &&
        !isGenericQrCode(matchedTeacher.id_qr) &&
        !isGenericQrCode(a.id_qr)
      ) {
        if (matchedTeacher.id_qr.trim().toLowerCase() === a.id_qr.trim().toLowerCase()) return true;
        return false;
      }

      return a.nama.trim().toLowerCase() === matchedTeacher.nama.trim().toLowerCase();
    });

    const masukRecord = teacherTodayRecords.find((a) => a.jenis === 'Masuk');
    const pulangRecord = teacherTodayRecords.find((a) => a.jenis === 'Pulang');

    let jenis: AttendanceType = 'Masuk';

    // 1. Determine target scan type (forced or auto)
    if (forcedType === 'Masuk') {
      jenis = 'Masuk';
    } else if (forcedType === 'Pulang') {
      jenis = 'Pulang';
    } else {
      // Auto mode: Pagi hari (Sebelum 10:00 WIT) -> Presensi Masuk. Siang/Sore hari (Mulai 10:00 WIT ke atas) -> Presensi Pulang
      const isAfternoonSession = currentHourWIT >= 10;
      if (isAfternoonSession) {
        jenis = masukRecord && !pulangRecord ? 'Pulang' : 'Pulang';
      } else {
        jenis = 'Masuk';
      }
    }

    // 2. STRICT DUPLICATE SCAN PREVENTION (CEGAH SCAN GANDA & TOLAK LANGSUNG)
    if (masukRecord && pulangRecord) {
      const mTime = this.formatRecordTimeWIT(masukRecord.timestamp);
      const pTime = this.formatRecordTimeWIT(pulangRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        teacher: matchedTeacher,
        record: pulangRecord,
        type: 'Pulang',
        status: pulangRecord.status,
        message: `DITOLAK: Guru ${matchedTeacher.nama} sudah LENGKAP presensi Masuk (${mTime}) dan Pulang (${pTime}) hari ini. Scan ganda ditolak!`,
      };
    }

    if (jenis === 'Masuk' && masukRecord) {
      const mTime = this.formatRecordTimeWIT(masukRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        teacher: matchedTeacher,
        record: masukRecord,
        type: 'Masuk',
        status: masukRecord.status,
        message: `DITOLAK: Guru ${matchedTeacher.nama} SUDAH SCAN MASUK hari ini pada pukul ${mTime} (${masukRecord.status}). Scan ganda langsung ditolak!`,
      };
    }

    if (jenis === 'Pulang' && pulangRecord) {
      const pTime = this.formatRecordTimeWIT(pulangRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        teacher: matchedTeacher,
        record: pulangRecord,
        type: 'Pulang',
        status: pulangRecord.status,
        message: `DITOLAK: Guru ${matchedTeacher.nama} SUDAH SCAN PULANG hari ini pada pukul ${pTime}. Scan ganda langsung ditolak!`,
      };
    }

    // Calculate late status if Masuk
    let status: TeacherAttendanceStatus = 'Hadir';
    let isLate = false;
    let lateMinutes = 0;

    if (jenis === 'Masuk') {
      const cutoffTimeStr = this.settings.cutoffTime || '07:15';
      const [cutoffHour, cutoffMin] = cutoffTimeStr.split(':').map(Number);
      const nowMinutes = currentHourWIT * 60 + currentMinuteWIT;
      const cutoffMinutes = (cutoffHour || 7) * 60 + (cutoffMin || 15);

      if (nowMinutes > cutoffMinutes) {
        status = 'Terlambat';
        isLate = true;
        lateMinutes = nowMinutes - cutoffMinutes;
      }
    } else if (jenis === 'Pulang') {
      if (masukRecord) {
        status = masukRecord.status;
      }
    }

    const isRfidScan = !!(matchedTeacher.rfid_uid && isMatchingRfidUid(matchedTeacher.rfid_uid, cleanText));

    const cleanTeacherNip = (matchedTeacher.nip || matchedTeacher.id || 'tch').replace(/[^a-zA-Z0-9]/g, '');
    const deterministicTeacherId = `tch-att-${cleanTeacherNip}-${todayStr}-${jenis.toLowerCase()}`;

    const effectiveScanMethod: AttendanceScanMethod = scanMethodOverride || (isRfidScan ? 'RFID' : 'QR');
    let teacherCatatan = jenis === 'Pulang'
      ? `Selesai Tugas / Pulang${isRfidScan ? ' (Tap RFID)' : effectiveScanMethod === 'Manual' ? ' (Manual/Lupa Kartu)' : ''}`
      : isLate
      ? `Terlambat ${lateMinutes} menit${isRfidScan ? ' (Tap RFID)' : effectiveScanMethod === 'Manual' ? ' (Manual/Lupa Kartu)' : ''}`
      : `Tepat Waktu${isRfidScan ? ' (Tap RFID)' : effectiveScanMethod === 'Manual' ? ' (Manual/Lupa Kartu)' : ''}`;

    if (customNote) {
      teacherCatatan = `${teacherCatatan} - ${customNote}`;
    }

    const newRecord: TeacherAttendanceRecord = {
      id: deterministicTeacherId,
      tanggal: todayStr,
      timestamp: nowISO,
      nip: matchedTeacher.nip,
      nama: matchedTeacher.nama,
      jabatan: matchedTeacher.jabatan,
      id_qr: matchedTeacher.id_qr || `69933068.${matchedTeacher.nip}`,
      rfid_uid: matchedTeacher.rfid_uid,
      scan_method: effectiveScanMethod,
      jenis,
      status,
      petugas: formatPetugasRole(officerEmail),
      catatan: teacherCatatan,
      terlambatMenit: lateMinutes,
    };

    this.teacherAttendance.unshift(newRecord);
    this.notify();

    this.enqueueSync({ id: newRecord.id, type: 'teacher_attendance', action: 'upsert', data: newRecord });

    const logDetails =
      jenis === 'Pulang'
        ? `Scan Presensi Guru Pulang${isRfidScan ? ' [RFID]' : ''}: ${matchedTeacher.nama} (${matchedTeacher.jabatan}) oleh ${formatPetugasRole(officerEmail)}`
        : `Scan Presensi Guru Masuk [${status.toUpperCase()}]${isRfidScan ? ' [RFID]' : ''}: ${matchedTeacher.nama} (${matchedTeacher.jabatan})${isLate ? ` Terlambat ${lateMinutes} mnt` : ''} oleh ${formatPetugasRole(officerEmail)}`;

    this.addLog(`SCAN_GURU_${jenis.toUpperCase()}`, logDetails);

    const timeFormatted = this.formatRecordTimeWIT(nowISO);
    const msg =
      jenis === 'Pulang'
        ? `Presensi PULANG berhasil dicatat untuk Bapak/Ibu ${matchedTeacher.nama} pada ${timeFormatted}.`
        : isLate
        ? `Presensi MASUK (TERLAMBAT ${lateMinutes} Mnt) dicatat untuk Bapak/Ibu ${matchedTeacher.nama} pada ${timeFormatted}.`
        : `Presensi MASUK (TEPAT WAKTU) dicatat untuk Bapak/Ibu ${matchedTeacher.nama} pada ${timeFormatted}.`;

    return {
      success: true,
      isDuplicate: false,
      record: newRecord,
      teacher: matchedTeacher,
      message: msg,
      type: jenis,
      status,
      isLate,
      lateMinutes,
    };
  }

  public async addManualTeacherAttendance(
    data: Partial<TeacherAttendanceRecord> & { nip: string; nama: string; jabatan: string }
  ): Promise<TeacherAttendanceRecord> {
    const targetTanggal = data.tanggal ? (this.normalizeToYyyyMmDd(data.tanggal) || data.tanggal) : this.getTodayYyyyMmDd();
    const targetJenis = data.jenis || 'Masuk';

    const normTarget = this.normalizeToYyyyMmDd(targetTanggal) || targetTanggal;
    const existingIdx = this.teacherAttendance.findIndex(
      (a) =>
        a.nip === data.nip &&
        (this.normalizeToYyyyMmDd(a.tanggal) === normTarget || a.tanggal === normTarget) &&
        a.jenis === targetJenis
    );

    if (existingIdx !== -1) {
      const existing = this.teacherAttendance[existingIdx];
      const updated: TeacherAttendanceRecord = {
        ...existing,
        ...data,
        tanggal: normTarget,
        timestamp: data.timestamp || existing.timestamp || new Date().toISOString(),
        jenis: targetJenis,
        status: data.status || existing.status,
        terlambatMenit: data.terlambatMenit !== undefined ? data.terlambatMenit : existing.terlambatMenit,
        petugas: data.petugas || existing.petugas,
        catatan: data.catatan || existing.catatan,
      };
      this.teacherAttendance[existingIdx] = updated;
      this.notify();
      this.enqueueSync({ id: updated.id, type: 'teacher_attendance', action: 'upsert', data: updated });
      this.addLog('PRESENSI_MANUAL_GURU', `Memperbarui presensi guru: ${updated.nama} (${updated.jabatan}) - ${updated.status}`);
      return updated;
    }

    const newRecord: TeacherAttendanceRecord = {
      id: `tch-att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tanggal: normTarget,
      timestamp: data.timestamp || new Date().toISOString(),
      nip: data.nip,
      nama: data.nama,
      jabatan: data.jabatan,
      id_qr: data.id_qr || `69933068.${data.nip}`,
      jenis: targetJenis,
      status: data.status || 'Hadir',
      petugas: data.petugas ? formatPetugasRole(data.petugas) : 'Petugas Piket',
      catatan: data.catatan || '',
      terlambatMenit: data.terlambatMenit || 0,
    };

    this.teacherAttendance.unshift(newRecord);
    this.notify();

    this.enqueueSync({ id: newRecord.id, type: 'teacher_attendance', action: 'upsert', data: newRecord });
    this.addLog('PRESENSI_MANUAL_GURU', `Menambahkan presensi manual guru: ${newRecord.nama} (${newRecord.jabatan}) - ${newRecord.status}`);
    return newRecord;
  }

  public async updateTeacherAttendanceRecord(id: string, data: Partial<TeacherAttendanceRecord>): Promise<boolean> {
    const idx = this.teacherAttendance.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    const updated = { ...this.teacherAttendance[idx], ...data };
    this.teacherAttendance[idx] = updated;
    this.notify();

    this.enqueueSync({ id: updated.id, type: 'teacher_attendance', action: 'upsert', data: updated });
    this.addLog('EDIT_PRESENSI_GURU', `Memperbarui rekaman presensi guru ID: ${id} (${updated.nama})`);
    return true;
  }

  public async deleteTeacherAttendanceRecord(id: string): Promise<boolean> {
    const target = this.teacherAttendance.find((a) => a.id === id);
    this.teacherAttendance = this.teacherAttendance.filter((a) => !id || a.id !== id);
    this.notify();

    if (target) {
      this.enqueueSync({ id, type: 'teacher_attendance', action: 'delete' });
      this.addLog('HAPUS_PRESENSI_GURU', `Menghapus rekaman presensi guru: ${target.nama} (${target.tanggal})`);
    }
    return true;
  }

  public async deleteMultipleTeacherAttendance(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    this.teacherAttendance = this.teacherAttendance.filter((a) => !idSet.has(a.id));
    this.notify();
    ids.forEach((id) => {
      this.enqueueSync({ id, type: 'teacher_attendance', action: 'delete' });
    });
    this.addLog('HAPUS_MASSAL_PRESENSI_GURU', `Menghapus ${ids.length} rekaman presensi guru.`);
    return true;
  }

  public async clearTeacherAttendance(): Promise<boolean> {
    const count = this.teacherAttendance.length;
    const oldIds = this.teacherAttendance.map((a) => a.id);
    this.teacherAttendance = [];
    this.notify();
    oldIds.forEach((id) => {
      this.enqueueSync({ id, type: 'teacher_attendance', action: 'delete' });
    });
    this.addLog('RESET_PRESENSI_GURU', `Menghapus seluruh ${count} rekap presensi guru.`);
    return true;
  }

  public async importTeacherAttendanceRecords(
    records: Omit<TeacherAttendanceRecord, 'id'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    if (mode === 'replace') {
      const oldIds = this.teacherAttendance.map((a) => a.id);
      const formatted: TeacherAttendanceRecord[] = records.map((r, idx) => ({
        ...r,
        id: `tch-att-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      }));
      this.teacherAttendance = formatted;
      this.notify();
      oldIds.forEach((id) => {
        this.enqueueSync({ id, type: 'teacher_attendance', action: 'delete' });
      });
      formatted.forEach((r) => {
        this.enqueueSync({ id: r.id, type: 'teacher_attendance', action: 'upsert', data: r });
      });
    } else {
      const map = new Map<string, TeacherAttendanceRecord>();
      this.teacherAttendance.forEach((a) => {
        const key = `${a.nip}_${a.tanggal}_${a.jenis}`;
        map.set(key, a);
      });

      records.forEach((r, idx) => {
        const key = `${r.nip}_${r.tanggal}_${r.jenis}`;
        const existing = map.get(key);
        if (existing) {
          map.set(key, { ...existing, ...r, id: existing.id });
        } else {
          map.set(key, {
            ...r,
            id: `tch-att-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          });
        }
      });

      this.teacherAttendance = Array.from(map.values());
      this.notify();
      this.teacherAttendance.forEach((r) => {
        this.enqueueSync({ id: r.id, type: 'teacher_attendance', action: 'upsert', data: r });
      });
    }

    this.addLog('IMPORT_PRESENSI_GURU', `Mengimpor ${records.length} data rekap presensi guru tanpa duplikasi.`);
    return true;
  }

  /**
   * Returns today's date in standardized ISO format (YYYY-MM-DD),
   * identical to database storage format.
   */
  public getTodayFormatted(): string {
    return this.getTodayYyyyMmDd();
  }

  /**
   * Returns today's date formatted as DD-MM-YYYY specifically for Indonesian UI display labels.
   */
  public getTodayDisplayFormatted(): string {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jayapura',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return formatter.format(today).replace(/\//g, '-');
  }

  /**
   * Helper to format any date string into standard Indonesian display format (DD-MM-YYYY).
   */
  public formatDisplayDate(dateStr?: string): string {
    if (!dateStr) return '';
    const norm = this.normalizeToYyyyMmDd(dateStr);
    if (!norm) return dateStr;
    const parts = norm.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return norm;
  }

  public getTodayYyyyMmDd(): string {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jayapura',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(today);
  }

  public isRecordForDate(
    r: AttendanceRecord | TeacherAttendanceRecord | { tanggal?: string; timestamp?: string },
    targetYyyyMmDd: string
  ): boolean {
    if (!r || !targetYyyyMmDd) return false;
    const targetNorm = this.normalizeToYyyyMmDd(targetYyyyMmDd);

    if (r.tanggal) {
      const recordNorm = this.normalizeToYyyyMmDd(r.tanggal);
      if (recordNorm === targetNorm) return true;
      if (r.tanggal.includes(targetYyyyMmDd) || targetYyyyMmDd.includes(r.tanggal)) return true;
    }

    if (r.timestamp) {
      const tsNorm = this.normalizeToYyyyMmDd(r.timestamp);
      if (tsNorm === targetNorm) return true;
    }

    return false;
  }

  public isRecordForToday(
    r: AttendanceRecord | TeacherAttendanceRecord | { tanggal?: string; timestamp?: string }
  ): boolean {
    return this.isRecordForDate(r, this.getTodayYyyyMmDd());
  }

  public recordScan(
    scannedText: string,
    rawQR?: string,
    rawCode?: string,
    officerEmail = 'Petugas Piket',
    forcedType?: AttendanceType | 'Auto',
    scanMethodOverride?: AttendanceScanMethod,
    customNote?: string
  ): {
    success: boolean;
    isDuplicate?: boolean;
    record?: AttendanceRecord;
    student?: Student;
    message: string;
    type?: AttendanceType;
    status?: AttendanceStatus;
    isLate?: boolean;
    lateMinutes?: number;
  } {
    const cleanText = (scannedText || rawQR || rawCode || '').trim();
    if (!cleanText) {
      return { success: false, message: 'Kode QR tidak terbaca atau kosong.' };
    }

    // Match student accurately using strict hierarchical lookup without false collisions
    const matchedStudent = this.findStudentByScannedCode(cleanText);

    if (!matchedStudent) {
      return {
        success: false,
        message: `Siswa dengan kode/NISN "${cleanText}" tidak ditemukan di database.`,
      };
    }

    if (matchedStudent.status === 'nonaktif') {
      return {
        success: false,
        student: matchedStudent,
        message: `Siswa ${matchedStudent.nama} berstatus nonaktif di sistem.`,
      };
    }

    const todayStr = this.getTodayYyyyMmDd();
    const now = new Date();
    const nowISO = now.toISOString();

    // Determine current hour in WIT (UTC+9)
    let currentHourWIT = now.getHours();
    let currentMinuteWIT = now.getMinutes();
    try {
      const witTimeParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const hPart = witTimeParts.find((p) => p.type === 'hour');
      const mPart = witTimeParts.find((p) => p.type === 'minute');
      if (hPart) currentHourWIT = parseInt(hPart.value, 10);
      if (mPart) currentMinuteWIT = parseInt(mPart.value, 10);
    } catch {
      // Fallback
    }

    // Check existing scans today strictly by student unique identity (prevent cross-student collisions)
    const studentTodayRecords = this.attendance.filter((a) => {
      if (!this.isRecordForToday(a)) return false;

      // 1. If both records have NISN, compare NISN strictly (exact or normalized)
      if (matchedStudent.nisn && a.nisn) {
        if (isMatchingNisn(matchedStudent.nisn, a.nisn)) return true;
        // If both have NISN and they do not match, they are definitely DIFFERENT students!
        return false;
      }

      // 2. If ID_QR exists in both and is not a generic placeholder, compare ID_QR
      if (
        matchedStudent.id_qr &&
        a.id_qr &&
        !isGenericQrCode(matchedStudent.id_qr) &&
        !isGenericQrCode(a.id_qr)
      ) {
        if (matchedStudent.id_qr.trim().toLowerCase() === a.id_qr.trim().toLowerCase()) return true;
        return false;
      }

      // 3. Fallback strictly when NISN is missing in one/both: compare full Nama AND Kelas
      return (
        a.nama.trim().toLowerCase() === matchedStudent.nama.trim().toLowerCase() &&
        a.kelas.trim().toLowerCase() === matchedStudent.kelas.trim().toLowerCase()
      );
    });

    // Identify auto-alpa records (which can be replaced if a student scans Masuk)
    const autoAlpaRecord = studentTodayRecords.find(
      (a) => a.id?.startsWith('att-autoalpa-') || a.catatan?.includes('Alpa Otomatis')
    );

    // Real recorded attendance (not auto-alpa)
    const realTodayRecords = studentTodayRecords.filter(
      (a) => !(a.id?.startsWith('att-autoalpa-') || a.catatan?.includes('Alpa Otomatis'))
    );

    const masukRecord = realTodayRecords.find((a) => a.jenis === 'Masuk');
    const pulangRecord = realTodayRecords.find((a) => a.jenis === 'Pulang');

    let jenis: AttendanceType = 'Masuk';

    // 1. Determine target scan type (forced or auto)
    if (forcedType === 'Masuk') {
      jenis = 'Masuk';
    } else if (forcedType === 'Pulang') {
      jenis = 'Pulang';
    } else {
      // Auto mode: Pagi hari (Sebelum 10:00 WIT) -> Presensi Masuk. Siang/Sore hari (Mulai 10:00 WIT ke atas) -> Presensi Pulang
      const isAfternoonSession = currentHourWIT >= 10;
      if (isAfternoonSession) {
        jenis = masukRecord && !pulangRecord ? 'Pulang' : 'Pulang';
      } else {
        jenis = 'Masuk';
      }
    }

    // 2. STRICT DUPLICATE SCAN PREVENTION (CEGAH SCAN GANDA & TOLAK LANGSUNG)
    if (masukRecord && pulangRecord) {
      const mTime = this.formatRecordTimeWIT(masukRecord.timestamp);
      const pTime = this.formatRecordTimeWIT(pulangRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        student: matchedStudent,
        record: pulangRecord,
        type: 'Pulang',
        status: pulangRecord.status,
        message: `DITOLAK: Siswa ${matchedStudent.nama} (${matchedStudent.kelas}) sudah LENGKAP presensi Masuk (${mTime}) dan Pulang (${pTime}) hari ini. Scan ganda ditolak!`,
      };
    }

    if (jenis === 'Masuk' && masukRecord) {
      const mTime = this.formatRecordTimeWIT(masukRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        student: matchedStudent,
        record: masukRecord,
        type: 'Masuk',
        status: masukRecord.status,
        message: `DITOLAK: Siswa ${matchedStudent.nama} (${matchedStudent.kelas}) SUDAH SCAN MASUK hari ini pada pukul ${mTime} (${masukRecord.status}). Scan ganda langsung ditolak!`,
      };
    }

    if (jenis === 'Pulang' && pulangRecord) {
      const pTime = this.formatRecordTimeWIT(pulangRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        student: matchedStudent,
        record: pulangRecord,
        type: 'Pulang',
        status: pulangRecord.status,
        message: `DITOLAK: Siswa ${matchedStudent.nama} (${matchedStudent.kelas}) SUDAH SCAN PULANG hari ini pada pukul ${pTime}. Scan ganda langsung ditolak!`,
      };
    }

    // If an auto-alpa record existed and this is a genuine scan, remove the auto-alpa placeholder
    if (autoAlpaRecord) {
      this.enqueueSync({ id: autoAlpaRecord.id, type: 'attendance', action: 'delete' });
      this.attendance = this.attendance.filter((a) => a.id !== autoAlpaRecord.id);
    }

    // Calculate late status if Masuk
    let status: AttendanceStatus = 'Hadir';
    let isLate = false;
    let lateMinutes = 0;

    if (jenis === 'Masuk') {
      const cutoffTimeStr = this.settings.cutoffTime || '07:15';
      const [cutoffHour, cutoffMin] = cutoffTimeStr.split(':').map(Number);
      const nowMinutes = currentHourWIT * 60 + currentMinuteWIT;
      const cutoffMinutes = (cutoffHour || 7) * 60 + (cutoffMin || 15);

      if (nowMinutes > cutoffMinutes) {
        status = 'Terlambat';
        isLate = true;
        lateMinutes = nowMinutes - cutoffMinutes;
      }
    } else if (jenis === 'Pulang') {
      // Inherit the student's status for the day if they scanned Masuk earlier
      if (masukRecord) {
        status = masukRecord.status;
      }
    }

    const isRfidScan = !!(matchedStudent.rfid_uid && isMatchingRfidUid(matchedStudent.rfid_uid, cleanText));

    const cleanStudentNisn = (matchedStudent.nisn || matchedStudent.id || 'std').replace(/[^a-zA-Z0-9]/g, '');
    const deterministicStudentId = `att-${cleanStudentNisn}-${todayStr}-${jenis.toLowerCase()}`;

    const effectiveScanMethod: AttendanceScanMethod = scanMethodOverride || (isRfidScan ? 'RFID' : 'QR');
    let studentCatatan = jenis === 'Pulang'
      ? `Selesai KBM / Pulang${isRfidScan ? ' (Tap RFID)' : effectiveScanMethod === 'Manual' ? ' (Manual/Lupa Kartu)' : ''}`
      : isLate
      ? `Terlambat ${lateMinutes} menit${isRfidScan ? ' (Tap RFID)' : effectiveScanMethod === 'Manual' ? ' (Manual/Lupa Kartu)' : ''}`
      : `Tepat Waktu${isRfidScan ? ' (Tap RFID)' : effectiveScanMethod === 'Manual' ? ' (Manual/Lupa Kartu)' : ''}`;

    if (customNote) {
      studentCatatan = `${studentCatatan} - ${customNote}`;
    }

    const newRecord: AttendanceRecord = {
      id: deterministicStudentId,
      tanggal: todayStr,
      timestamp: nowISO,
      nisn: matchedStudent.nisn,
      nama: matchedStudent.nama,
      kelas: matchedStudent.kelas,
      id_qr: matchedStudent.id_qr || `69933068.${matchedStudent.nisn}.${matchedStudent.nama}`,
      rfid_uid: matchedStudent.rfid_uid,
      scan_method: effectiveScanMethod,
      jenis,
      status,
      petugas: formatPetugasRole(officerEmail),
      catatan: studentCatatan,
      terlambatMenit: lateMinutes,
    };

    this.attendance.unshift(newRecord);
    this.notify();

    this.enqueueSync({ id: newRecord.id, type: 'attendance', action: 'upsert', data: newRecord });

    const logDetails =
      jenis === 'Pulang'
        ? `Scan Presensi Pulang${isRfidScan ? ' [RFID]' : ''}: ${matchedStudent.nama} (${matchedStudent.kelas}) oleh ${formatPetugasRole(officerEmail)}`
        : `Scan Presensi Masuk [${status.toUpperCase()}]${isRfidScan ? ' [RFID]' : ''}: ${matchedStudent.nama} (${matchedStudent.kelas})${isLate ? ` Terlambat ${lateMinutes} mnt` : ''} oleh ${formatPetugasRole(officerEmail)}`;

    this.addLog(`SCAN_${jenis.toUpperCase()}`, logDetails);

    const timeFormatted = this.formatRecordTimeWIT(nowISO);
    const msg =
      jenis === 'Pulang'
        ? `Presensi PULANG berhasil dicatat untuk ${matchedStudent.nama} pada ${timeFormatted}.`
        : isLate
        ? `Presensi MASUK (TERLAMBAT ${lateMinutes} Mnt) berhasil dicatat untuk ${matchedStudent.nama} pada ${timeFormatted}.`
        : `Presensi MASUK (TEPAT WAKTU) berhasil dicatat untuk ${matchedStudent.nama} pada ${timeFormatted}.`;

    return {
      success: true,
      isDuplicate: false,
      record: newRecord,
      student: matchedStudent,
      message: msg,
      type: jenis,
      status: status,
      isLate,
      lateMinutes,
    };
  }

  public normalizeToYyyyMmDd(dateStr: string): string {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (str.includes('T')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
      }
      const datePart = str.split('T')[0];
      if (datePart.split('-')[0].length === 4) return datePart;
    }
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}`;
      }
      if (parts[2]?.length === 4) {
        const [d, m, y] = parts;
        return `${y.slice(0, 4)}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
    }
    return str;
  }

  public buildIsoTimestamp(tanggalYyyyMmDd: string, jamHhMm: string): string {
    const normDate = this.normalizeToYyyyMmDd(tanggalYyyyMmDd) || this.getTodayYyyyMmDd();
    const timeClean = (jamHhMm || '07:00').trim();
    const parts = timeClean.split(':');
    const h = (parseInt(parts[0], 10) || 0).toString().padStart(2, '0');
    const m = (parseInt(parts[1], 10) || 0).toString().padStart(2, '0');
    const s = parts[2] ? (parseInt(parts[2], 10) || 0).toString().padStart(2, '0') : '00';

    // Sekolah berlokasi di Ambon (Zona Waktu WIT / Asia/Jayapura, UTC+09:00)
    const dateWithTz = `${normDate}T${h}:${m}:${s}+09:00`;
    const d = new Date(dateWithTz);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
    return new Date().toISOString();
  }

  /**
   * Rekam Scan Pulang Otomatis 14:30 WIT untuk 1 Siswa yang belum/lupa scan pulang.
   */
  public recordStudentPulang1430(
    student: Student,
    targetDate?: string,
    officerEmail = 'Admin'
  ): { success: boolean; message: string; record?: AttendanceRecord } {
    if (!student) {
      return { success: false, message: 'Data siswa tidak valid.' };
    }

    const normTarget = targetDate ? this.normalizeToYyyyMmDd(targetDate) : this.getTodayYyyyMmDd();
    const timestamp1430 = `${normTarget}T14:30:00+09:00`;

    const studentDayRecords = this.attendance.filter(
      (a) =>
        ((student.nisn && a.nisn && a.nisn.trim() === student.nisn.trim()) ||
          (student.id_qr && a.id_qr && a.id_qr.trim().toLowerCase() === student.id_qr.trim().toLowerCase()) ||
          (a.nama.trim().toLowerCase() === student.nama.trim().toLowerCase() && a.kelas.trim().toLowerCase() === student.kelas.trim().toLowerCase())) &&
        this.isRecordForDate(a, normTarget)
    );

    const masukRecord = studentDayRecords.find((a) => a.jenis === 'Masuk');
    const existingPulang = studentDayRecords.find((a) => a.jenis === 'Pulang');

    if (existingPulang) {
      existingPulang.timestamp = timestamp1430;
      existingPulang.catatan = 'Batas Pulang Otomatis (14:30 WIT) / Lupa Scan Pulang';
      this.attendance = [...this.attendance];
      this.notify();
      this.enqueueSync({ id: existingPulang.id, type: 'attendance', action: 'upsert', data: existingPulang });
      this.addLog(
        'PULANG_OTOMATIS_1430',
        `Menyetel waktu scan pulang 14:30 WIT untuk ${student.nama} (${student.kelas}) oleh ${formatPetugasRole(officerEmail)}`
      );
      return {
        success: true,
        message: `Waktu scan pulang ${student.nama} berhasil disetel ke pukul 14:30 WIT.`,
        record: existingPulang,
      };
    }

    const newRecord: AttendanceRecord = {
      id: `att-autopulang-${Date.now()}-${student.nisn}`,
      tanggal: normTarget,
      timestamp: timestamp1430,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      id_qr: student.id_qr || `69933068.${student.nisn}.${student.nama}`,
      jenis: 'Pulang',
      status: masukRecord?.status || 'Hadir',
      petugas: formatPetugasRole(officerEmail),
      catatan: 'Batas Pulang Otomatis (14:30 WIT) / Lupa Scan Pulang',
      terlambatMenit: 0,
    };

    this.attendance.unshift(newRecord);
    this.attendance = [...this.attendance];
    this.notify();

    this.enqueueSync({ id: newRecord.id, type: 'attendance', action: 'upsert', data: newRecord });
    this.addLog(
      'PULANG_OTOMATIS_1430',
      `Mencatat presensi pulang batas akhir (14:30 WIT) untuk ${student.nama} (${student.kelas}) oleh ${formatPetugasRole(officerEmail)}`
    );

    return {
      success: true,
      message: `Presensi Pulang pukul 14:30 WIT berhasil dicatat untuk ${student.nama}.`,
      record: newRecord,
    };
  }

  /**
   * Rekam Scan Pulang Otomatis 14:30 WIT secara massal untuk semua siswa yang belum scan pulang pada tanggal tertentu.
   */
  public recordBulkStudentsPulang1430(
    targetDate?: string,
    filterKelas = 'Semua',
    officerEmail = 'Admin'
  ): { success: boolean; count: number; updatedStudents: Student[]; message: string } {
    const normTarget = targetDate ? this.normalizeToYyyyMmDd(targetDate) : this.getTodayYyyyMmDd();
    const timestamp1430 = `${normTarget}T14:30:00+09:00`;

    const dayRecords = this.attendance.filter((a) => this.isRecordForDate(a, normTarget));

    const targetStudents = this.students.filter((s) => {
      const st = String(s.status || 'aktif').trim().toLowerCase();
      if (st === 'nonaktif' || st === 'tidak aktif' || st === 'inactive') return false;
      if (filterKelas !== 'Semua' && s.kelas !== filterKelas) return false;
      return true;
    });

    const newRecords: AttendanceRecord[] = [];
    const updatedStudents: Student[] = [];

    targetStudents.forEach((student) => {
      const studentDayRecords = dayRecords.filter(
        (a) =>
          (student.nisn && a.nisn && a.nisn.trim() === student.nisn.trim()) ||
          (student.id_qr && a.id_qr && a.id_qr.trim().toLowerCase() === student.id_qr.trim().toLowerCase()) ||
          (a.nama.trim().toLowerCase() === student.nama.trim().toLowerCase() && a.kelas.trim().toLowerCase() === student.kelas.trim().toLowerCase())
      );
      const masukRecord = studentDayRecords.find((a) => a.jenis === 'Masuk');
      const pulangRecord = studentDayRecords.find((a) => a.jenis === 'Pulang');

      // Only process students who haven't scanned Pulang
      if (!pulangRecord) {
        // If student checked in (or active), record Pulang at 14:30
        const statusToUse: AttendanceStatus = masukRecord?.status || 'Hadir';
        const rec: AttendanceRecord = {
          id: `att-autopulang-${Date.now()}-${student.nisn}-${Math.random().toString(36).substr(2, 4)}`,
          tanggal: normTarget,
          timestamp: timestamp1430,
          nisn: student.nisn,
          nama: student.nama,
          kelas: student.kelas,
          id_qr: student.id_qr || `69933068.${student.nisn}.${student.nama}`,
          jenis: 'Pulang',
          status: statusToUse,
          petugas: formatPetugasRole(officerEmail),
          catatan: 'Batas Pulang Otomatis (14:30 WIT) / Selesai KBM',
          terlambatMenit: 0,
        };
        newRecords.push(rec);
        updatedStudents.push(student);
      }
    });

    if (newRecords.length === 0) {
      return {
        success: true,
        count: 0,
        updatedStudents: [],
        message: 'Semua siswa sudah memiliki rekaman scan Pulang pada tanggal ini.',
      };
    }

    this.attendance = [...newRecords, ...this.attendance];
    this.notify();

    newRecords.forEach((rec) => {
      this.enqueueSync({ id: rec.id, type: 'attendance', action: 'upsert', data: rec });
    });
    this.addLog(
      'PULANG_OTOMATIS_1430_MASSAL',
      `Sistem otomatis mencatat presensi pulang batas akhir (14:30 WIT) untuk ${newRecords.length} siswa (Kelas: ${filterKelas}) oleh ${formatPetugasRole(officerEmail)}`
    );

    return {
      success: true,
      count: newRecords.length,
      updatedStudents,
      message: `Berhasil mencatat presensi Pulang (14:30 WIT) untuk ${newRecords.length} siswa.`,
    };
  }

  /**
   * Rekam Scan Alpa Massal untuk siswa yang belum scan Masuk pada tanggal tertentu.
   */
  public recordBulkStudentsAlpa(
    targetDate?: string,
    filterKelas = 'Semua',
    officerEmail = 'Admin'
  ): { success: boolean; count: number; updatedStudents: Student[]; message: string } {
    const normTarget = targetDate ? this.normalizeToYyyyMmDd(targetDate) : this.getTodayYyyyMmDd();

    // Guard: Do not allow marking Alpa on holidays or weekends
    if (this.isHoliday(normTarget)) {
      return {
        success: false,
        count: 0,
        updatedStudents: [],
        message: 'Tanggal yang dipilih merupakan hari libur atau akhir pekan sekolah. Tidak dapat mencatat Alpa.',
      };
    }

    const timestampAlpa = `${normTarget}T08:00:00+09:00`; // Asumsikan ditandai alpa jam 08:00 WIT

    const dayRecords = this.attendance.filter((a) => this.isRecordForDate(a, normTarget));

    const targetStudents = this.students.filter((s) => {
      const st = String(s.status || 'aktif').trim().toLowerCase();
      if (st === 'nonaktif' || st === 'tidak aktif' || st === 'inactive') return false;
      if (filterKelas !== 'Semua' && s.kelas !== filterKelas) return false;
      return true;
    });

    const newRecords: AttendanceRecord[] = [];
    const updatedStudents: Student[] = [];

    targetStudents.forEach((student) => {
      const studentDayRecords = dayRecords.filter(
        (a) =>
          (student.nisn && a.nisn && a.nisn.trim() === student.nisn.trim()) ||
          (student.id_qr && a.id_qr && a.id_qr.trim().toLowerCase() === student.id_qr.trim().toLowerCase()) ||
          (a.nama.trim().toLowerCase() === student.nama.trim().toLowerCase() && a.kelas.trim().toLowerCase() === student.kelas.trim().toLowerCase())
      );
      
      const masukRecord = studentDayRecords.find((a) => a.jenis === 'Masuk');

      // Jika belum ada record masuk hari ini, berarti Alpa
      if (!masukRecord) {
        const rec: AttendanceRecord = {
          id: `att-autoalpa-${Date.now()}-${student.nisn}-${Math.random().toString(36).substr(2, 4)}`,
          tanggal: normTarget,
          timestamp: timestampAlpa,
          nisn: student.nisn,
          nama: student.nama,
          kelas: student.kelas,
          id_qr: student.id_qr || `69933068.${student.nisn}.${student.nama}`,
          jenis: 'Masuk',
          status: 'Alpa',
          petugas: formatPetugasRole(officerEmail),
          catatan: 'Tutup Gerbang (Tanpa Keterangan)',
          terlambatMenit: 0,
        };
        newRecords.push(rec);
        updatedStudents.push(student);
      }
    });

    if (newRecords.length === 0) {
      return {
        success: true,
        count: 0,
        updatedStudents: [],
        message: 'Semua siswa sudah memiliki rekaman presensi pada tanggal ini.',
      };
    }

    this.attendance = [...newRecords, ...this.attendance];
    this.notify();

    newRecords.forEach((rec) => {
      this.enqueueSync({ id: rec.id, type: 'attendance', action: 'upsert', data: rec });
    });
    
    this.addLog(
      'ALPA_MASSAL_OTOMATIS',
      `Tutup Gerbang: Sistem otomatis mencatat presensi Alpa untuk ${newRecords.length} siswa (Kelas: ${filterKelas}) oleh ${formatPetugasRole(officerEmail)}`
    );

    return {
      success: true,
      count: newRecords.length,
      updatedStudents,
      message: `Berhasil memproses status Alpa untuk ${newRecords.length} siswa.`,
    };
  }

  public async addManualAttendance(data: Partial<AttendanceRecord> & { nisn: string; nama: string; kelas: string }): Promise<AttendanceRecord> {
    const targetTanggal = data.tanggal ? (this.normalizeToYyyyMmDd(data.tanggal) || data.tanggal) : this.getTodayYyyyMmDd();
    const targetJenis = data.jenis || 'Masuk';
    const normTarget = this.normalizeToYyyyMmDd(targetTanggal);
    const finalTimestamp = data.timestamp || this.buildIsoTimestamp(normTarget, '07:00');

    // Antisipasi data ganda: Cek apakah sudah ada rekaman presensi dengan NISN, Tanggal, & Jenis yang sama
    const existingIdx = this.attendance.findIndex((a) => {
      const matchIdentity = data.nisn && a.nisn
        ? a.nisn.trim() === data.nisn.trim()
        : (a.nama.trim().toLowerCase() === data.nama.trim().toLowerCase() && a.kelas.trim().toLowerCase() === data.kelas.trim().toLowerCase());
      return matchIdentity && this.isRecordForDate(a, normTarget) && a.jenis === targetJenis;
    });

    if (existingIdx !== -1) {
      const existing = this.attendance[existingIdx];
      const updated: AttendanceRecord = {
        ...existing,
        ...data,
        id: existing.id,
        tanggal: normTarget,
        timestamp: finalTimestamp,
        jenis: targetJenis,
        status: data.status || existing.status,
        terlambatMenit: data.terlambatMenit !== undefined ? data.terlambatMenit : existing.terlambatMenit,
        petugas: data.petugas || existing.petugas,
        catatan: data.catatan || existing.catatan,
      };
      this.attendance[existingIdx] = updated;
      this.attendance = [...this.attendance];
      this.notify();

      this.enqueueSync({ id: updated.id, type: 'attendance', action: 'upsert', data: updated });
      this.addLog('PRESENSI_MANUAL', `Memperbarui presensi: ${updated.nama} (${updated.kelas}) - ${updated.jenis} ${updated.status}`);
      return updated;
    }

    // Replace auto-alpa record if exists
    const autoAlpaIndex = this.attendance.findIndex((a) => {
      const matchIdentity = data.nisn && a.nisn
        ? a.nisn.trim() === data.nisn.trim()
        : (a.nama.trim().toLowerCase() === data.nama.trim().toLowerCase() && a.kelas.trim().toLowerCase() === data.kelas.trim().toLowerCase());
      const matchDate = this.isRecordForDate(a, normTarget);
      const isAutoAlpa = a.id.startsWith('att-autoalpa') || a.petugas?.includes('Otopresensi') || (a.status === 'Alpa' && a.jenis === 'Masuk');
      return matchIdentity && matchDate && isAutoAlpa;
    });

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tanggal: normTarget,
      timestamp: finalTimestamp,
      nisn: data.nisn,
      nama: data.nama,
      kelas: data.kelas,
      id_qr: data.id_qr || `69933068.${data.nisn}.${data.nama}`,
      jenis: targetJenis,
      status: data.status || 'Hadir',
      petugas: data.petugas ? formatPetugasRole(data.petugas) : 'Petugas Piket',
      catatan: data.catatan || '',
      terlambatMenit: data.terlambatMenit || 0,
    };

    if (autoAlpaIndex !== -1 && targetJenis === 'Masuk') {
      const oldAlpa = this.attendance[autoAlpaIndex];
      this.enqueueSync({ id: oldAlpa.id, type: 'attendance', action: 'delete' });
      this.attendance[autoAlpaIndex] = newRecord;
    } else {
      this.attendance.unshift(newRecord);
    }
    this.attendance = [...this.attendance];
    this.notify();

    this.enqueueSync({ id: newRecord.id, type: 'attendance', action: 'upsert', data: newRecord });
    this.addLog('PRESENSI_MANUAL', `Menambahkan presensi manual: ${newRecord.nama} (${newRecord.kelas}) - ${newRecord.jenis} ${newRecord.status}`);
    return newRecord;
  }

  public async updateAttendanceRecord(id: string, data: Partial<AttendanceRecord>): Promise<boolean> {
    return this.updateAttendance(id, data);
  }

  public async updateAttendance(id: string, data: Partial<AttendanceRecord>): Promise<boolean> {
    const idx = this.attendance.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    const existing = this.attendance[idx];
    const normTanggal = data.tanggal ? this.normalizeToYyyyMmDd(data.tanggal) : existing.tanggal;

    const updated: AttendanceRecord = {
      ...existing,
      ...data,
      tanggal: normTanggal,
      timestamp: data.timestamp || existing.timestamp,
    };

    this.attendance[idx] = updated;
    this.attendance = [...this.attendance];
    this.notify();

    this.enqueueSync({ id: updated.id, type: 'attendance', action: 'upsert', data: updated });
    this.addLog('EDIT_PRESENSI', `Memperbarui rekaman presensi ${updated.nama} (${updated.tanggal}): ${updated.jenis} - ${updated.status} (${data.timestamp ? 'Waktu diubah' : ''})`);
    return true;
  }

  public async deleteAttendance(id: string): Promise<boolean> {
    const target = this.attendance.find((a) => a.id === id);
    this.attendance = this.attendance.filter((a) => !id || a.id !== id);
    this.notify();

    if (target) {
      this.enqueueSync({ id, type: 'attendance', action: 'delete' });
      this.addLog('HAPUS_PRESENSI', `Menghapus rekaman presensi: ${target.nama} (${target.tanggal}) dari aplikasi dan database.`);
    }
    return true;
  }

  public async deleteMultipleAttendance(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    this.attendance = this.attendance.filter((a) => !idSet.has(a.id));
    this.notify();

    ids.forEach((id) => {
      this.enqueueSync({ id, type: 'attendance', action: 'delete' });
    });
    this.addLog('HAPUS_MASSAL_PRESENSI', `Menghapus ${ids.length} rekaman presensi dari aplikasi dan database.`);
    return true;
  }

  public async clearAttendance(): Promise<boolean> {
    const count = this.attendance.length;
    const ids = this.attendance.map((a) => a.id);
    this.attendance = [];
    this.notify();

    ids.forEach((id) => {
      this.enqueueSync({ id, type: 'attendance', action: 'delete' });
    });
    this.addLog('RESET_PRESENSI', `Menghapus seluruh ${count} rekap presensi dari aplikasi dan database.`);
    return true;
  }

  /**
   * Helper to identify if an attendance record occurred on a Saturday (Day 6)
   */
  public isRecordOnSaturday(record: { tanggal?: string; timestamp?: string }): boolean {
    if (record.tanggal) {
      const s = String(record.tanggal).trim();
      if (s.includes('T')) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.getDay() === 6;
      }
      const parts = s.split(/[-/]/);
      if (parts.length === 3) {
        let d: Date | null = null;
        if (parts[0].length === 4) {
          d = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}T00:00:00`);
        } else if (parts[2].length === 4) {
          d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`);
        }
        if (d && !isNaN(d.getTime())) return d.getDay() === 6;
      }
    }
    if (record.timestamp) {
      const d = new Date(record.timestamp);
      if (!isNaN(d.getTime())) return d.getDay() === 6;
    }
    return false;
  }

  /**
   * Hitung berapa banyak presensi Alpa pada hari Sabtu yang masih ada di memori saat ini
   */
  public getSaturdayAlpaCount(): { studentAlpa: number; teacherAlpa: number; total: number } {
    const studentAlpa = this.attendance.filter(
      (a) => a.status && a.status.toLowerCase() === 'alpa' && this.isRecordOnSaturday(a)
    ).length;

    const teacherAlpa = this.teacherAttendance.filter(
      (ta) => ta.status && ta.status.toLowerCase() === 'alpa' && this.isRecordOnSaturday(ta)
    ).length;

    return { studentAlpa, teacherAlpa, total: studentAlpa + teacherAlpa };
  }

  /**
   * Revisi & Hapus Seluruh Presensi Hari Sabtu yang Berstatus ALPA
   * Menghapus secara komprehensif dari:
   * 1. State memori aplikasi (this.attendance & this.teacherAttendance)
   * 2. Browser LocalStorage
   * 3. Google Cloud Firestore Database (Batch Delete)
   * 4. Supabase Database (jika terhubung)
   */
  public async purgeSaturdayAlpaAttendance(silent = false): Promise<{
    deletedStudents: number;
    deletedTeachers: number;
    total: number;
  }> {
    // 1. Identify local student attendance records on Saturday marked as Alpa
    const studentRecordsToDelete = this.attendance.filter((a) => {
      const isAlpa = a.status && String(a.status).trim().toLowerCase() === 'alpa';
      return isAlpa && this.isRecordOnSaturday(a);
    });

    // 2. Identify local teacher attendance records on Saturday marked as Alpa
    const teacherRecordsToDelete = this.teacherAttendance.filter((ta) => {
      const isAlpa = ta.status && String(ta.status).trim().toLowerCase() === 'alpa';
      return isAlpa && this.isRecordOnSaturday(ta);
    });

    const studentIds = studentRecordsToDelete.map((a) => a.id);
    const teacherIds = teacherRecordsToDelete.map((ta) => ta.id);

    let deletedStudents = studentIds.length;
    let deletedTeachers = teacherIds.length;

    // Remove from in-memory arrays
    if (studentIds.length > 0) {
      const studentIdSet = new Set(studentIds);
      this.attendance = this.attendance.filter((a) => !studentIdSet.has(a.id));
      studentIds.forEach((id) => {
        this.enqueueSync({ id, type: 'attendance', action: 'delete' });
      });
    }

    if (teacherIds.length > 0) {
      const teacherIdSet = new Set(teacherIds);
      this.teacherAttendance = this.teacherAttendance.filter((ta) => !teacherIdSet.has(ta.id));
      teacherIds.forEach((id) => {
        this.enqueueSync({ id, type: 'teacher_attendance', action: 'delete' });
      });
    }

    // Save directly to localStorage immediately
    this.saveLocalData(true);
    this.notify();

    // 3. Purge directly from Firestore Cloud Database
    try {
      const firestoreResult = await purgeSaturdayAlpaFromFirestore();
      if (firestoreResult.deletedStudents > deletedStudents) {
        deletedStudents = firestoreResult.deletedStudents;
      }
      if (firestoreResult.deletedTeachers > deletedTeachers) {
        deletedTeachers = firestoreResult.deletedTeachers;
      }
    } catch (err) {
      console.warn('Error purging Saturday Alpa from Firestore:', err);
    }

    // 4. Purge from Supabase if connected
    try {
      const config = this.getSupabaseConfig();
      if (isSupabaseConfigured(config)) {
        const supabaseResult = await purgeSaturdayAlpaFromSupabase(config);
        if (supabaseResult.deletedStudents > deletedStudents) {
          deletedStudents = supabaseResult.deletedStudents;
        }
        if (supabaseResult.deletedTeachers > deletedTeachers) {
          deletedTeachers = supabaseResult.deletedTeachers;
        }
      }
    } catch (err) {
      console.warn('Error purging Saturday Alpa from Supabase:', err);
    }

    const total = deletedStudents + deletedTeachers;

    if (total > 0 || !silent) {
      this.addLog(
        'REVISI_ALPA_SABTU',
        `Revisi Presensi: Menghapus ${total} data presensi hari Sabtu yang berstatus ALPA (Siswa: ${deletedStudents}, Guru: ${deletedTeachers}).`
      );
    }

    return { deletedStudents, deletedTeachers, total };
  }

  public async importAttendanceRecords(
    records: Omit<AttendanceRecord, 'id'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    if (mode === 'replace') {
      const oldIds = this.attendance.map((a) => a.id);
      const formatted: AttendanceRecord[] = records.map((r, idx) => ({
        ...r,
        id: `att-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      }));
      this.attendance = formatted;
      this.notify();
      oldIds.forEach((id) => {
        this.enqueueSync({ id, type: 'attendance', action: 'delete' });
      });
      formatted.forEach((r) => {
        this.enqueueSync({ id: r.id, type: 'attendance', action: 'upsert', data: r });
      });
    } else {
      // Append mode dengan pencegahan duplikasi berdasarkan NISN + Tanggal + Jenis
      const map = new Map<string, AttendanceRecord>();
      this.attendance.forEach((a) => {
        const key = `${a.nisn}_${a.tanggal}_${a.jenis}`;
        map.set(key, a);
      });

      records.forEach((r, idx) => {
        const key = `${r.nisn}_${r.tanggal}_${r.jenis}`;
        const existing = map.get(key);
        if (existing) {
          map.set(key, { ...existing, ...r, id: existing.id });
        } else {
          map.set(key, {
            ...r,
            id: `att-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          });
        }
      });

      this.attendance = Array.from(map.values());
      this.notify();
      this.attendance.forEach((r) => {
        this.enqueueSync({ id: r.id, type: 'attendance', action: 'upsert', data: r });
      });
    }

    this.addLog('IMPORT_PRESENSI', `Mengimpor ${records.length} data rekap presensi tanpa duplikasi.`);
    return true;
  }

  public addLog(action: string, details: string) {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      user: this.currentUser?.name || 'Sistem',
      role: this.currentUser?.role || 'Admin',
      action,
      details,
    };

    this.logs.unshift(newLog);
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    this.notify();

    this.enqueueSync({ id: newLog.id, type: 'log', action: 'upsert', data: newLog });
  }

  public async deleteSelectedLogs(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    this.logs = this.logs.filter((l) => !idSet.has(l.id));
    this.notify();

    ids.forEach((id) => {
      this.enqueueSync({ id, type: 'log', action: 'delete' });
    });
    return true;
  }

  public async clearLogs(): Promise<boolean> {
    const ids = this.logs.map((l) => l.id);
    this.logs = [];
    this.notify();

    ids.forEach((id) => {
      this.enqueueSync({ id, type: 'log', action: 'delete' });
    });
    return true;
  }

  // Double Masuk scan repair helpers
  public findDoubleMasukRecords(): Array<{
    studentNisn: string;
    studentName: string;
    kelas: string;
    date: string;
    dateStr: string;
    firstRecord: AttendanceRecord;
    duplicateRecords: AttendanceRecord[];
    records: AttendanceRecord[];
  }> {
    const groups = new Map<string, AttendanceRecord[]>();
    this.attendance.forEach((r) => {
      if (r.jenis === 'Masuk') {
        const key = `${r.nisn}_${r.tanggal}`;
        const existing = groups.get(key) || [];
        existing.push(r);
        groups.set(key, existing);
      }
    });

    const anomalies: Array<{
      studentNisn: string;
      studentName: string;
      kelas: string;
      date: string;
      dateStr: string;
      firstRecord: AttendanceRecord;
      duplicateRecords: AttendanceRecord[];
      records: AttendanceRecord[];
    }> = [];

    groups.forEach((records, key) => {
      if (records.length > 1) {
        const [nisn, date] = key.split('_');
        const sorted = [...records].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const first = sorted[0];
        const duplicates = sorted.slice(1);
        anomalies.push({
          studentNisn: nisn,
          studentName: first.nama,
          kelas: first.kelas || '-',
          date,
          dateStr: date,
          firstRecord: first,
          duplicateRecords: duplicates,
          records: sorted,
        });
      }
    });

    return anomalies;
  }

  public repairDoubleMasukRecords(selectedRecordIds?: string[]): number {
    const anomalies = this.findDoubleMasukRecords();
    let removedCount = 0;

    anomalies.forEach((group) => {
      // Sort ascending by timestamp -> keep earliest, remove duplicates
      const sorted = [...group.records].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const toKeep = sorted[0];
      const duplicates = sorted.slice(1);

      duplicates.forEach((d) => {
        if (!selectedRecordIds || selectedRecordIds.includes(d.id)) {
          this.deleteAttendance(d.id);
          removedCount++;
        }
      });
    });

    if (removedCount > 0) {
      toast.success('Pembersihan Berhasil', `Berhasil menghapus ${removedCount} data scan Masuk ganda.`);
    }
    return removedCount;
  }

  public autoRepairAttendanceFromActivityLogs(): number {
    const missing = this.getMissingAttendanceItemsFromLogs();
    if (missing.length === 0) {
      toast.info('Pemeriksaan Log', 'Tidak ditemukan rekaman presensi yang hilang dari log aktivitas.');
      return 0;
    }

    const ids = missing.map((m) => m.logId);
    this.restoreSpecificMissingAttendanceItems(ids);
    toast.success('Pemulihan Log Berhasil', `Berhasil memulihkan ${missing.length} rekaman presensi dari log aktivitas.`);
    return missing.length;
  }

  public autoRepairFromAttendance(): number {
    const studentNisns = new Set(this.students.map((s) => s.nisn).filter(Boolean));
    const orphanedMap = new Map<string, AttendanceRecord>();

    this.attendance.forEach((a) => {
      if (a.nisn && !studentNisns.has(a.nisn)) {
        if (!orphanedMap.has(a.nisn)) {
          orphanedMap.set(a.nisn, a);
        }
      }
    });

    const newStudents: Student[] = [];
    orphanedMap.forEach((att, nisn) => {
      const newStudent: Student = {
        id: `std-repaired-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        nisn: nisn,
        nama: att.nama || `Siswa ${nisn}`,
        kelas: att.kelas || 'X',
        id_qr: att.id_qr || `69933068.${nisn}.${att.nama || 'SISWA'}`,
        foto: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 100)}?auto=format&fit=crop&q=80&w=250`,
        status: 'aktif',
        createdAt: new Date().toISOString(),
      };
      newStudents.push(newStudent);
    });

    if (newStudents.length > 0) {
      this.students = [...this.students, ...newStudents];
      this.notify();
      syncStudentsToSupabase(newStudents, this.getSupabaseConfig()).catch(() => {});
      this.addLog(
        'REPAIR_SISWA_DARI_PRESENSI',
        `Sistem merekonstruksi ${newStudents.length} profil siswa dari rekaman presensi yatim (termasuk kelas ${newStudents.map((s) => s.kelas).join(', ')}).`
      );
      toast.success('Rekonstruksi Berhasil', `Berhasil merekonstruksi dan mendaftarkan ${newStudents.length} profil siswa ke master data.`);
    } else {
      toast.info('Data Siswa Konsisten', 'Seluruh data presensi sudah memiliki profil siswa yang terdaftar di master data.');
    }

    return newStudents.length;
  }

  public getMissingAttendanceItemsFromLogs(): MissingAttendanceLogItem[] {
    const missing: MissingAttendanceLogItem[] = [];
    const studentMapByName = new Map<string, Student>();
    this.students.forEach((s) => {
      if (s.nama) studentMapByName.set(s.nama.toLowerCase().trim(), s);
    });

    this.logs.forEach((log) => {
      if (!log.action || (!log.action.startsWith('SCAN_') && !log.action.startsWith('PRESENSI_'))) {
        return;
      }

      const dateStr = this.normalizeToYyyyMmDd(log.timestamp);
      const isPulang = log.action.includes('PULANG') || log.details.toLowerCase().includes('pulang');
      const jenis: AttendanceType = isPulang ? 'Pulang' : 'Masuk';

      // Parse Nama, Kelas, Status from details
      // e.g., "Scan Presensi Masuk [HADIR]: DADANG BUAMONA (XI IPA 1) oleh Petugas Piket"
      // or "Scan Presensi Masuk [TERLAMBAT]: NAMA (KELAS) Terlambat 10 mnt oleh..."
      // or "Menambahkan presensi manual: NAMA (KELAS) - Hadir"
      let parsedNama = '';
      let parsedKelas = '';
      let parsedStatus: AttendanceStatus = 'Hadir';

      const scanMatch = log.details.match(/Scan Presensi (?:Masuk|Pulang)(?: \[(.*?)\])?: ([^(]+) \(([^)]+)\)/i);
      const manualMatch = log.details.match(/presensi manual: ([^(]+) \(([^)]+)\) - (\w+)/i);

      if (scanMatch) {
        if (scanMatch[1]) {
          const rawSt = scanMatch[1].trim().toUpperCase();
          if (rawSt.includes('TERLAMBAT')) parsedStatus = 'Terlambat';
          else if (rawSt.includes('IZIN')) parsedStatus = 'Izin';
          else if (rawSt.includes('SAKIT')) parsedStatus = 'Sakit';
          else if (rawSt.includes('ALPA')) parsedStatus = 'Alpa';
          else parsedStatus = 'Hadir';
        }
        parsedNama = scanMatch[2]?.trim() || '';
        parsedKelas = scanMatch[3]?.trim() || '';
      } else if (manualMatch) {
        parsedNama = manualMatch[1]?.trim() || '';
        parsedKelas = manualMatch[2]?.trim() || '';
        const rawSt = manualMatch[3]?.trim().toUpperCase();
        if (rawSt.includes('TERLAMBAT')) parsedStatus = 'Terlambat';
        else if (rawSt.includes('IZIN')) parsedStatus = 'Izin';
        else if (rawSt.includes('SAKIT')) parsedStatus = 'Sakit';
        else if (rawSt.includes('ALPA')) parsedStatus = 'Alpa';
        else parsedStatus = 'Hadir';
      }

      if (!parsedNama) return;

      const matchedStudent = studentMapByName.get(parsedNama.toLowerCase().trim());
      const nisn = matchedStudent ? matchedStudent.nisn : `manual-${parsedNama.replace(/\s+/g, '').toLowerCase()}`;
      const kelas = matchedStudent ? matchedStudent.kelas : (parsedKelas || 'X');

      // Check if this attendance event exists in this.attendance
      const exists = this.attendance.some(
        (a) =>
          (a.nisn === nisn || a.nama.toLowerCase().trim() === parsedNama.toLowerCase().trim()) &&
          this.isRecordForDate(a, dateStr) &&
          a.jenis === jenis
      );

      if (!exists) {
        const parts = dateStr.split('-');
        const dateFormatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;

        missing.push({
          logId: log.id,
          timestamp: log.timestamp,
          dateFormatted,
          nama: parsedNama,
          nisn,
          kelas,
          jenis,
          status: parsedStatus,
          petugas: log.user || 'Petugas Piket',
          action: log.action,
          details: log.details,
        });
      }
    });

    return missing;
  }

  public restoreSpecificMissingAttendanceItems(ids: string[]): boolean {
    const missingList = this.getMissingAttendanceItemsFromLogs();
    const idSet = new Set(ids);
    const targets = missingList.filter((m) => idSet.has(m.logId));

    if (targets.length === 0) return false;

    const newRecords: AttendanceRecord[] = targets.map((t) => {
      const normTanggal = this.normalizeToYyyyMmDd(t.timestamp || t.dateFormatted) || this.getTodayYyyyMmDd();

      return {
        id: `att-recovered-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tanggal: normTanggal,
        timestamp: t.timestamp,
        nisn: t.nisn,
        nama: t.nama,
        kelas: t.kelas,
        id_qr: `69933068.${t.nisn}.${t.nama}`,
        jenis: t.jenis,
        status: t.status,
        petugas: formatPetugasRole(t.petugas),
        catatan: `Dipulihkan dari log aktivitas (${t.action})`,
        terlambatMenit: t.status === 'Terlambat' ? 15 : 0,
      };
    });

    this.attendance = [...this.attendance, ...newRecords];
    this.notify();
    syncAttendanceToSupabase(newRecords, this.getSupabaseConfig()).catch(() => {});
    this.addLog('RESTORASI_PRESENSI_DARI_LOG', `Memulihkan ${newRecords.length} rekaman presensi dari catatan log aktivitas.`);
    return true;
  }

  public runDataHealthCheck(): HealthCheckResult {
    const totalStudents = this.students.length;
    const totalAttendance = this.attendance.length;
    const studentNisns = new Set(this.students.map((s) => s.nisn).filter(Boolean));

    const attNisns = new Set(this.attendance.map((a) => a.nisn).filter(Boolean));

    const orphanedMap = new Map<string, { name: string; class: string; count: number }>();
    this.attendance.forEach((a) => {
      if (a.nisn && !studentNisns.has(a.nisn)) {
        const existing = orphanedMap.get(a.nisn);
        if (existing) {
          existing.count++;
        } else {
          orphanedMap.set(a.nisn, {
            name: a.nama || 'Tanpa Nama',
            class: a.kelas || '-',
            count: 1,
          });
        }
      }
    });

    const orphanedAttendanceCount = Array.from(orphanedMap.values()).reduce((sum, item) => sum + item.count, 0);
    const missingStudentDetails = Array.from(orphanedMap.entries()).map(([nisn, data]) => ({
      nisn,
      name: data.name,
      class: data.class,
      scanCount: data.count,
    }));

    // Check double masuk
    const doubleMasukAnomalies = this.findDoubleMasukRecords();
    const doubleMasukCount = doubleMasukAnomalies.reduce((sum, a) => sum + a.records.length - 1, 0);

    // Check class inconsistencies (presensi class vs student master class)
    const studentClassMap = new Map<string, string>();
    this.students.forEach((s) => studentClassMap.set(s.nisn, s.kelas.trim()));

    let classMismatchCount = 0;
    this.attendance.forEach((a) => {
      const masterClass = studentClassMap.get(a.nisn);
      if (masterClass && a.kelas && a.kelas.trim() !== masterClass) {
        classMismatchCount++;
      }
    });

    const discrepancies: string[] = [];
    const recommendations: string[] = [];

    if (orphanedAttendanceCount > 0) {
      discrepancies.push(
        `Terdapat ${orphanedAttendanceCount} rekaman presensi dari ${orphanedMap.size} siswa yang belum terdaftar di data master siswa.`
      );
      recommendations.push(
        'Klik tombol "Rekonstruksi Profil Siswa" untuk otomatis mendaftarkan siswa yang belum ada ke master data.'
      );
    }

    if (doubleMasukCount > 0) {
      discrepancies.push(
        `Ditemukan ${doubleMasukCount} rekaman scan Masuk ganda pada ${doubleMasukAnomalies.length} siswa.`
      );
      recommendations.push(
        'Gunakan fitur pembersihan "Bersihkan Scan Masuk Ganda" untuk menjaga konsistensi rekap harian.'
      );
    }

    if (classMismatchCount > 0) {
      discrepancies.push(
        `Terdapat ${classMismatchCount} rekaman presensi dengan nama kelas yang tidak selaras dengan kelas siswa saat ini.`
      );
      recommendations.push('Sinkronkan nama kelas presensi dengan kelas master siswa.');
    }

    if (discrepancies.length === 0) {
      discrepancies.push('Semua data presensi, data master siswa, dan log aktivitas dalam kondisi konsisten.');
      recommendations.push('Database Supabase Cloud PostgreSQL dan cache lokal berfungsi normal.');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (orphanedAttendanceCount > 0 || doubleMasukCount > 0) {
      status = 'warning';
    }
    if (orphanedAttendanceCount > 10 || totalStudents === 0 && totalAttendance > 0) {
      status = 'critical';
    }

    return {
      status,
      totalStudents,
      totalAttendance,
      uniqueAttendanceStudents: attNisns.size,
      orphanedAttendanceCount,
      missingStudentDetails,
      backupInfo: {
        exists: true,
        timestamp: new Date().toISOString(),
        studentCount: totalStudents,
        attendanceCount: totalAttendance,
      },
      discrepancies,
      recommendations,
    };
  }

  public async clearCacheAndRefresh(): Promise<void> {
    await this.fetchFromServer();
    toast.success('Data Diperbarui', 'Berhasil memperbarui data terbaru dari Supabase Cloud PostgreSQL.');
  }

  public async clearAllDatabase(): Promise<void> {
    const studentIds = this.students.map((s) => s.id);
    const attendanceIds = this.attendance.map((a) => a.id);
    const teacherIds = this.teachers.map((t) => t.id);
    const teacherAttIds = this.teacherAttendance.map((a) => a.id);
    const logIds = this.logs.map((l) => l.id);

    this.students = [];
    this.attendance = [];
    this.teachers = [];
    this.teacherAttendance = [];
    this.logs = [];
    this.syncQueue = [];
    try {
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    } catch {}
    this.saveLocalData(true);
    this.notify();

    if (studentIds.length > 0) {
      await Promise.all(studentIds.map((id) => deleteStudentFromSupabase(id)));
    }
    if (attendanceIds.length > 0) {
      await Promise.all(attendanceIds.map((id) => deleteAttendanceFromSupabase(id)));
    }
    if (teacherIds.length > 0) {
      await Promise.all(teacherIds.map((id) => deleteTeacherFromSupabase(id, this.getSupabaseConfig())));
    }
    if (teacherAttIds.length > 0) {
      await Promise.all(teacherAttIds.map((id) => deleteTeacherAttendanceFromSupabase(id, this.getSupabaseConfig())));
    }
    if (logIds.length > 0) {
      await Promise.all(logIds.map((id) => deleteLogFromSupabase(id)));
    }

    toast.success('Database Dibersihkan', 'Seluruh data di aplikasi dan Supabase Cloud PostgreSQL telah berhasil dikosongkan.');
  }

  public async resetToSeedData(): Promise<void> {
    await this.clearAllDatabase();
  }

  public getOfflineQueueCount(): number {
    return this.syncQueue.length;
  }

  public async processOfflineQueue(): Promise<boolean> {
    const res = await this.processPendingSyncQueue(true);
    return res.success;
  }

  public async syncAllToServer(): Promise<void> {
    await this.syncAllWithFirestore();
    const config = this.getSupabaseConfig();
    if (isSupabaseConfigured(config)) {
      await this.syncAllToSupabase();
    }
  }

  public createManualBackup() {
    toast.info('Cadangan Cloud Aktif', 'Data presensi sekolah tersimpan aman di Database Cloud Firebase Firestore & Cache Lokal.');
  }

  public restoreFromBrowserBackup() {
    this.fetchFromServer();
  }

  // ==========================================
  // WALI KELAS & PROBLEMATIC STUDENT DISPATCH
  // ==========================================

  public getDispatches(): ProblematicStudentDispatch[] {
    return [...this.dispatches];
  }

  public addDispatch(
    data: Omit<ProblematicStudentDispatch, 'id' | 'dispatchedAt'>
  ): ProblematicStudentDispatch {
    const newDispatch: ProblematicStudentDispatch = {
      ...data,
      id: `dsp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      dispatchedAt: new Date().toISOString(),
    };

    // Remove any existing active pending dispatch for the exact same student if re-dispatching
    this.dispatches = [newDispatch, ...this.dispatches.filter((d) => d.nisn !== newDispatch.nisn || d.status === 'Selesai / Ditangani')];
    this.saveLocalData();
    this.notify();

    // Persist to Supabase and Firestore
    this.enqueueSync({ id: newDispatch.id, type: 'dispatch', action: 'upsert', data: newDispatch });
    saveDispatchToFirestore(newDispatch).catch(() => {});
    syncDispatchesToSupabase([newDispatch], this.getSupabaseConfig()).catch(() => {});

    this.addLog(
      'DISPOSISI_WALI_KELAS',
      `Data siswa bermasalah ${newDispatch.studentName} (${newDispatch.kelas}) dikirim ke Wali Kelas ${newDispatch.waliKelasName} via ${newDispatch.channel}.`
    );
    return newDispatch;
  }

  public updateDispatchStatus(
    id: string,
    status: ProblematicStudentDispatch['status'],
    tindakLanjutNotes?: string
  ): boolean {
    const idx = this.dispatches.findIndex((d) => d.id === id);
    if (idx === -1) return false;

    this.dispatches[idx] = {
      ...this.dispatches[idx],
      status,
      tindakLanjutNotes: tindakLanjutNotes !== undefined ? tindakLanjutNotes : this.dispatches[idx].tindakLanjutNotes,
      resolvedAt: status === 'Selesai / Ditangani' ? new Date().toISOString() : this.dispatches[idx].resolvedAt,
    };

    this.saveLocalData();
    this.notify();

    // Persist status update to Supabase and Firestore
    this.enqueueSync({ id: this.dispatches[idx].id, type: 'dispatch', action: 'upsert', data: this.dispatches[idx] });
    saveDispatchToFirestore(this.dispatches[idx]).catch(() => {});
    syncDispatchesToSupabase([this.dispatches[idx]], this.getSupabaseConfig()).catch(() => {});

    this.addLog(
      'UPDATE_DISPOSISI',
      `Status disposisi siswa ${this.dispatches[idx].studentName} diperbarui menjadi: ${status}`
    );
    return true;
  }

  public deleteDispatch(id: string): boolean {
    const target = this.dispatches.find((d) => d.id === id);
    if (!target) return false;
    this.dispatches = this.dispatches.filter((d) => d.id !== id);
    this.saveLocalData();
    this.notify();

    // Delete from Supabase and Firestore
    this.enqueueSync({ id, type: 'dispatch', action: 'delete' });
    deleteDispatchFromFirestore(id).catch(() => {});
    deleteDispatchFromSupabase(id, this.getSupabaseConfig()).catch(() => {});

    this.addLog('HAPUS_DISPOSISI', `Riwayat disposisi siswa ${target.studentName} dihapus.`);
    return true;
  }

  public clearDispatches(): void {
    const ids = this.dispatches.map((d) => d.id);
    this.dispatches = [];
    this.saveLocalData(true);
    this.notify();

    ids.forEach((id) => {
      this.enqueueSync({ id, type: 'dispatch', action: 'delete' });
      deleteDispatchFromFirestore(id).catch(() => {});
      deleteDispatchFromSupabase(id, this.getSupabaseConfig()).catch(() => {});
    });

    this.addLog('CLEAR_DISPOSISI', 'Seluruh riwayat disposisi ke wali kelas telah dibersihkan.');
  }

  /**
   * Cari Wali Kelas untuk kelas tertentu
   */
  public getHomeroomTeacherForClass(kelas: string): {
    teacher?: Teacher;
    name: string;
    nip?: string;
    phone?: string;
    source: 'teacher_db' | 'settings_map' | 'none';
  } {
    if (!kelas) {
      return { name: 'Wali Kelas', source: 'none' };
    }

    const cleanKelas = String(kelas).trim().toLowerCase();

    // 1. Cek dari database guru yang memiliki field wali_kelas sesuai
    const matchByField = this.teachers.find(
      (t) => t.status !== 'nonaktif' && t.wali_kelas && t.wali_kelas.trim().toLowerCase() === cleanKelas
    );
    if (matchByField) {
      return {
        teacher: matchByField,
        name: matchByField.nama,
        nip: matchByField.nip,
        phone: matchByField.no_hp || '',
        source: 'teacher_db',
      };
    }

    // 2. Cek dari database guru yang jabatan-nya mengandung "Wali Kelas [kelas]"
    const matchByJabatan = this.teachers.find(
      (t) =>
        t.status !== 'nonaktif' &&
        t.jabatan &&
        t.jabatan.toLowerCase().includes('wali kelas') &&
        t.jabatan.toLowerCase().includes(cleanKelas)
    );
    if (matchByJabatan) {
      return {
        teacher: matchByJabatan,
        name: matchByJabatan.nama,
        nip: matchByJabatan.nip,
        phone: matchByJabatan.no_hp || '',
        source: 'teacher_db',
      };
    }

    // 3. Cek dari settings homeroomAssignments
    const assignments = this.settings.homeroomAssignments || {};
    const directKey = Object.keys(assignments).find((k) => k.toLowerCase() === cleanKelas);
    if (directKey && assignments[directKey]) {
      const assigned = assignments[directKey];
      const matchTeacher = assigned.teacherNip ? this.getTeacherByNip(assigned.teacherNip) : undefined;
      return {
        teacher: matchTeacher,
        name: assigned.teacherName || 'Wali Kelas ' + kelas,
        nip: assigned.teacherNip,
        phone: assigned.phone || matchTeacher?.no_hp || '',
        source: 'settings_map',
      };
    }

    return {
      name: `Wali Kelas ${kelas}`,
      source: 'none',
    };
  }

  /**
   * Set pemetaan Wali Kelas untuk kelas tertentu di Settings
   */
  public setHomeroomAssignment(
    kelas: string,
    data: { teacherName: string; teacherNip?: string; phone?: string }
  ): void {
    const currentAssignments = { ...(this.settings.homeroomAssignments || {}) };
    currentAssignments[kelas] = data;
    this.updateSettings({ homeroomAssignments: currentAssignments });

    // Jika guru ada di database, update juga field wali_kelas di guru tersebut
    if (data.teacherNip) {
      const teacher = this.getTeacherByNip(data.teacherNip);
      if (teacher) {
        this.updateTeacher(teacher.id, { wali_kelas: kelas });
      }
    }
  }

  /**
   * Analisis & Identifikasi Seluruh Siswa Bermasalah / Berisiko
   */
  public getProblematicStudentsAnalysis(options?: {
    kelas?: string;
    bulan?: string;
    minAlpa?: number;
    minTerlambat?: number;
    maxAttendanceRate?: number;
    riskLevel?: string;
    searchQuery?: string;
  }): Array<{
    student: Student;
    waliKelas: { name: string; nip?: string; phone?: string; source: string };
    totalDays: number;
    hadirCount: number;
    terlambatCount: number;
    sakitCount: number;
    izinCount: number;
    alpaCount: number;
    attendanceRate: number;
    riskLevel: 'Tinggi' | 'Sedang' | 'Perhatian';
    reasons: string[];
    datesWithIssues: Array<{ tanggal: string; status: AttendanceStatus; catatan?: string; terlambatMenit?: number }>;
    aiRecommendation: string;
    latestDispatch?: ProblematicStudentDispatch;
  }> {
    const isStudentActive = (s: Student) => {
      const st = String(s.status || 'aktif').trim().toLowerCase();
      return st !== 'nonaktif' && st !== 'tidak aktif' && st !== 'inactive';
    };
    const activeStudents = this.students.filter(isStudentActive);
    const inactiveNisns = new Set(this.students.filter((s) => !isStudentActive(s)).map((s) => s.nisn).filter(Boolean));
    const isFilteredMonth = Boolean(options?.bulan && options.bulan !== 'Semua');
    const scopedAttendance = (isFilteredMonth
      ? this.attendance.filter((a) => a.tanggal.startsWith(options!.bulan!))
      : this.attendance
    ).filter((a) => !inactiveNisns.has(a.nisn));

    const allUniqueDates = Array.from(new Set(scopedAttendance.map((a) => a.tanggal)));
    const totalRecordedDays = Math.max(allUniqueDates.length, 1);

    const minAlpa = options?.minAlpa ?? this.settings.problemThresholdAlpa ?? 2;
    const minTerlambat = options?.minTerlambat ?? this.settings.problemThresholdTerlambat ?? 3;
    const maxAttendanceRate = options?.maxAttendanceRate ?? this.settings.problemThresholdMinRate ?? 75;

    const list: Array<any> = [];

    activeStudents.forEach((student) => {
      if (options?.kelas && options.kelas !== 'Semua Kelas' && options.kelas !== 'Semua' && student.kelas !== options.kelas) {
        return;
      }

      const studentRecords = scopedAttendance.filter((a) => a.nisn === student.nisn && a.jenis === 'Masuk');
      const studentUniqueDates = new Set(studentRecords.map((r) => r.tanggal));
      const studentTotalDays = Math.max(studentUniqueDates.size, totalRecordedDays);

      let hadirCount = 0;
      let terlambatCount = 0;
      let sakitCount = 0;
      let izinCount = 0;
      let alpaCount = 0;
      const datesWithIssues: Array<{ tanggal: string; status: AttendanceStatus; catatan?: string; terlambatMenit?: number }> = [];

      studentRecords.forEach((r) => {
        if (r.status === 'Hadir') {
          hadirCount++;
        } else if (r.status === 'Terlambat') {
          terlambatCount++;
          datesWithIssues.push({ tanggal: r.tanggal, status: r.status, catatan: r.catatan, terlambatMenit: r.terlambatMenit });
        } else if (r.status === 'Sakit') {
          sakitCount++;
          datesWithIssues.push({ tanggal: r.tanggal, status: r.status, catatan: r.catatan });
        } else if (r.status === 'Izin') {
          izinCount++;
          datesWithIssues.push({ tanggal: r.tanggal, status: r.status, catatan: r.catatan });
        } else if (r.status === 'Alpa') {
          alpaCount++;
          datesWithIssues.push({ tanggal: r.tanggal, status: r.status, catatan: r.catatan });
        }
      });

      const totalPresent = hadirCount + terlambatCount;
      const attendanceRate = Math.round((totalPresent / studentTotalDays) * 100);

      const reasons: string[] = [];

      if (alpaCount >= minAlpa) {
        reasons.push(`Memiliki ${alpaCount} kali Alpa (tanpa keterangan sah).`);
      } else if (alpaCount === 1) {
        reasons.push(`Tercatat 1 kali Alpa.`);
      }

      if (terlambatCount >= minTerlambat + 2) {
        reasons.push(`Sangat sering terlambat (${terlambatCount} kali).`);
      } else if (terlambatCount >= minTerlambat) {
        reasons.push(`Sering terlambat masuk sekolah (${terlambatCount} kali).`);
      }

      if (attendanceRate < maxAttendanceRate - 10) {
        reasons.push(`Persentase kehadiran sangat kritis (${attendanceRate}%).`);
      } else if (attendanceRate < maxAttendanceRate) {
        reasons.push(`Persentase kehadiran di bawah standar minimal (${attendanceRate}% < ${maxAttendanceRate}%).`);
      }

      if (sakitCount + izinCount >= 5) {
        reasons.push(`Akumulasi izin/sakit sangat tinggi (${sakitCount} Sakit, ${izinCount} Izin).`);
      }

      const isProblematic =
        reasons.length > 0 ||
        alpaCount >= minAlpa ||
        terlambatCount >= minTerlambat ||
        attendanceRate < maxAttendanceRate;

      if (isProblematic) {
        let riskLevel: 'Tinggi' | 'Sedang' | 'Perhatian' = 'Sedang';

        if (attendanceRate < 65 || alpaCount >= 3 || terlambatCount >= 6) {
          riskLevel = 'Tinggi';
        } else if (attendanceRate < 75 || alpaCount >= 2 || terlambatCount >= 3) {
          riskLevel = 'Sedang';
        } else {
          riskLevel = 'Perhatian';
        }

        if (options?.riskLevel && options.riskLevel !== 'semua' && options.riskLevel !== 'Semua' && riskLevel !== options.riskLevel) {
          return;
        }

        if (options?.searchQuery) {
          const q = options.searchQuery.toLowerCase().trim();
          const match =
            student.nama.toLowerCase().includes(q) ||
            student.nisn.includes(q) ||
            student.kelas.toLowerCase().includes(q);
          if (!match) return;
        }

        let aiRec = '';
        if (riskLevel === 'Tinggi') {
          aiRec = 'Sangat Mendesak: Terbitkan Surat Panggilan Orang Tua ke Sekolah, Koordinasi Penanganan Khusus Guru BK & Sidang Disiplin Wali Kelas.';
        } else if (riskLevel === 'Sedang') {
          aiRec = 'Penting: Hubungi Orang Tua / Wali murid via WhatsApp dan jadwalkan sesi konseling pembinaan bersama Wali Kelas.';
        } else {
          aiRec = 'Perhatian: Pantau ketat presensi siswa minggu ini dan ingatkan siswa terkait batas toleransi kedisiplinan sekolah.';
        }

        const waliKelas = this.getHomeroomTeacherForClass(student.kelas);
        const latestDispatch = this.dispatches.find((d) => d.nisn === student.nisn);

        list.push({
          student,
          waliKelas,
          totalDays: studentTotalDays,
          hadirCount,
          terlambatCount,
          sakitCount,
          izinCount,
          alpaCount,
          attendanceRate,
          riskLevel,
          reasons,
          datesWithIssues,
          aiRecommendation: aiRec,
          latestDispatch,
        });
      }
    });

    // Urutkan prioritas: Risiko Tinggi > Sedang > Perhatian, lalu persentase kehadiran terendah
    const priority = { Tinggi: 1, Sedang: 2, Perhatian: 3 };
    list.sort((a, b) => {
      if (priority[a.riskLevel] !== priority[b.riskLevel]) {
        return priority[a.riskLevel] - priority[b.riskLevel];
      }
      return a.attendanceRate - b.attendanceRate;
    });

    return list;
  }

  /**
   * Membuat draf pesan WhatsApp resmi untuk Wali Kelas per individu siswa
   */
  public generateWaliKelasWhatsAppMessage(
    student: Student,
    stats: {
      alpaCount: number;
      terlambatCount: number;
      sakitCount: number;
      izinCount: number;
      attendanceRate: number;
      reasons: string[];
      notes?: string;
      aiRecommendation?: string;
      datesWithIssues?: Array<{ tanggal: string; status: AttendanceStatus; catatan?: string; terlambatMenit?: number }>;
    },
    waliKelasName?: string
  ): string {
    const sName = this.settings.schoolName || 'SMA NEGERI 15 AMBON';
    const now = new Date();
    const dateFormatted = `${now.getDate()} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][now.getMonth()]} ${now.getFullYear()}`;
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIT`;

    let template = this.settings.waTemplateWaliKelas || DEFAULT_SETTINGS.waTemplateWaliKelas || '';

    const reasonsFormatted = stats.reasons && stats.reasons.length > 0
      ? stats.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : '• Perlu pemantauan presensi dan pembinaan kedisiplinan.';

    const recFormatted = stats.aiRecommendation || 'Mohon koordinasi tindak lanjut pembinaan siswa bersama Guru BK dan pemanggilan Orang Tua / Wali.';
    const notesFormatted = stats.notes?.trim() || 'Laporan otomatis dari Tim Presensi & Kedisiplinan Sekolah.';

    let message = template
      .replace(/{sekolah}/g, sName)
      .replace(/{kelas}/g, student.kelas)
      .replace(/{wali_kelas}/g, waliKelasName || 'Bapak/Ibu Guru')
      .replace(/{nama}/g, student.nama)
      .replace(/{nisn}/g, student.nisn)
      .replace(/{no_hp_ortu}/g, student.no_hp_ortu ? student.no_hp_ortu : '(Belum tercatat di database)')
      .replace(/{persentase_kehadiran}/g, `${stats.attendanceRate}%`)
      .replace(/{alpa}/g, String(stats.alpaCount))
      .replace(/{terlambat}/g, String(stats.terlambatCount))
      .replace(/{sakit_izin}/g, String(stats.sakitCount + stats.izinCount))
      .replace(/{alasan_masalah}/g, reasonsFormatted)
      .replace(/{rekomendasi}/g, recFormatted)
      .replace(/{catatan_petugas}/g, notesFormatted)
      .replace(/{tanggal}/g, dateFormatted)
      .replace(/{waktu}/g, timeFormatted);

    // Tambahkan rincian tanggal ketidakhadiran jika ada
    if (stats.datesWithIssues && stats.datesWithIssues.length > 0) {
      const datesDetail = stats.datesWithIssues
        .slice(0, 5)
        .map((d) => `  - ${d.tanggal}: *${d.status}* ${d.terlambatMenit ? `(${d.terlambatMenit} mnt)` : ''} ${d.catatan ? `(${d.catatan})` : ''}`)
        .join('\n');
      message += `\n\n📅 *Rincian Tanggal Ketidakhadiran/Keterlambatan:*\n${datesDetail}`;
      if (stats.datesWithIssues.length > 5) {
        message += `\n  - ...dan ${stats.datesWithIssues.length - 5} rekaman lainnya di sistem.`;
      }
    }

    return message;
  }

  /**
   * Membuat draf pesan WhatsApp rekap batch seluruh siswa bermasalah di 1 kelas ke Wali Kelasnya
   */
  public generateClassBatchWaliKelasWhatsAppMessage(
    kelas: string,
    list: Array<{
      student: Student;
      alpaCount: number;
      terlambatCount: number;
      sakitCount: number;
      izinCount: number;
      attendanceRate: number;
      riskLevel: string;
      reasons: string[];
    }>,
    waliKelasName?: string
  ): string {
    const sName = this.settings.schoolName || 'SMA NEGERI 15 AMBON';
    const now = new Date();
    const dateFormatted = `${now.getDate()} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][now.getMonth()]} ${now.getFullYear()}`;

    let msg = `Yth. Bapak/Ibu Wali Kelas *${kelas}* (${waliKelasName || 'Bapak/Ibu Guru'}),\n\n`;
    msg += `Salam hormat dari Tim Presensi & Kedisiplinan *${sName}*.\n\n`;
    msg += `Berikut kami sampaikan *Rekapitulasi Siswa yang Membutuhkan Perhatian / Pembinaan Khusus* di kelas *${kelas}* (Total: ${list.length} Siswa):\n\n`;

    list.forEach((item, idx) => {
      const riskBadge = item.riskLevel === 'Tinggi' ? '🔴 RISIKO TINGGI' : item.riskLevel === 'Sedang' ? '🟠 PERLU PERHATIAN' : '🟡 MONITORING';
      msg += `*${idx + 1}. ${item.student.nama}* (NISN: ${item.student.nisn})\n`;
      msg += `   Status: *${riskBadge}*\n`;
      msg += `   Kehadiran: *${item.attendanceRate}%* | Alpa: *${item.alpaCount}x* | Terlambat: *${item.terlambatCount}x* | Izin/Sakit: *${item.sakitCount + item.izinCount}x*\n`;
      if (item.student.no_hp_ortu) {
        msg += `   Kontak Ortu: ${item.student.no_hp_ortu}\n`;
      }
      if (item.reasons && item.reasons.length > 0) {
        msg += `   Catatan: ${item.reasons.join(', ')}\n`;
      }
      msg += `\n`;
    });

    msg += `📌 *Rekomendasi Tindak Lanjut:*\n`;
    msg += `1. Pembinaan personal oleh Wali Kelas pada jam bimbingan kelas.\n`;
    msg += `2. Koordinasi dengan Guru BK untuk penjadwalan konseling.\n`;
    msg += `3. Pengiriman pemberitahuan resmi / pemanggilan Orang Tua siswa bagi siswa berisiko tinggi.\n\n`;
    msg += `Terima kasih atas kerja sama dan dedikasi Bapak/Ibu demi kemajuan kedisiplinan belajar siswa di ${sName}.\n\n`;
    msg += `_Tim Presensi Digital & Kesiswaan ${sName}_\n📅 ${dateFormatted}`;

    return msg;
  }
}

export const store = new AppStore();
