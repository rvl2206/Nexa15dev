import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, AttendanceRecord, ActivityLog, Teacher, TeacherAttendanceRecord } from '../types';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/+$/, '');
  if (url.endsWith('/rest/v1')) {
    url = url.substring(0, url.length - '/rest/v1'.length);
  }
  return url.replace(/\/+$/, '');
}

const DEFAULT_SUPABASE_URL = 'https://tpxyvbfbahsjssqwubfl.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_oH-2538e28kbMbpk8ESZ7w_LpeIn1Jh';

export function getSupabaseCredentials(): SupabaseConfig {
  let url = '';
  let key = '';

  try {
    const savedV3 = localStorage.getItem('nexa15_settings_v3');
    if (savedV3) {
      const parsed = JSON.parse(savedV3);
      if (parsed.supabaseUrl) url = sanitizeSupabaseUrl(parsed.supabaseUrl);
      if (parsed.supabaseKey) key = parsed.supabaseKey.trim();
    }
    if (!url || !key) {
      const savedV2 = localStorage.getItem('school_settings_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (!url && parsed.supabaseUrl) url = sanitizeSupabaseUrl(parsed.supabaseUrl);
        if (!key && parsed.supabaseKey) key = parsed.supabaseKey.trim();
      }
    }
  } catch {
    // ignore
  }

  if (!url) {
    const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    url = sanitizeSupabaseUrl(envUrl) || DEFAULT_SUPABASE_URL;
  }
  if (!key) {
    key = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY || '').trim() || DEFAULT_SUPABASE_KEY;
  }

  return { url: sanitizeSupabaseUrl(url), key };
}

export function isSupabaseConfigured(customConfig?: SupabaseConfig): boolean {
  const config = customConfig || getSupabaseCredentials();
  return Boolean(config.url && config.key && config.url.startsWith('https://'));
}

export function getSupabaseClient(customConfig?: SupabaseConfig): SupabaseClient | null {
  const rawConfig = customConfig || getSupabaseCredentials();
  const config = {
    url: sanitizeSupabaseUrl(rawConfig.url),
    key: rawConfig.key?.trim() || '',
  };
  if (!config.url || !config.key || !config.url.startsWith('https://')) {
    return null;
  }

  const currentKey = `${config.url}_${config.key}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.key, {
      auth: { persistSession: false },
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Utility helper to ensure a valid ISO 8601 string for TIMESTAMPTZ columns in PostgreSQL
 */
function toValidIsoTimestamp(rawTimestamp?: string, fallbackDate?: string): string {
  if (rawTimestamp) {
    const d = new Date(rawTimestamp);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  if (fallbackDate) {
    const clean = fallbackDate.trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts[0].length === 4) {
        const d = new Date(`${clean}T07:00:00.000Z`);
        if (!isNaN(d.getTime())) return d.toISOString();
      } else if (parts[2]?.length === 4) {
        const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T07:00:00.000Z`);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }
  }
  return new Date().toISOString();
}

/**
 * Utility helper to ensure a standard ISO YYYY-MM-DD date string for DATE columns in database and app
 */
export function toValidIsoDate(rawDate?: string, fallbackTimestamp?: string): string {
  if (rawDate) {
    const clean = rawDate.trim();
    // Already ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    // Check if DD-MM-YYYY or DD/MM/YYYY
    const parts = clean.includes('-') ? clean.split('-') : clean.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  if (fallbackTimestamp) {
    const d = new Date(fallbackTimestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
    }
  }

  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
}

/**
 * Utility helper to chunk array for reliable batch upserts
 */
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Executes async tasks with concurrency control to prevent rate limits while maximizing speed
 */
async function parallelBatchExecution<T>(
  chunks: T[][],
  fn: (chunk: T[]) => Promise<any>,
  concurrency = 4
): Promise<void> {
  if (chunks.length === 0) return;
  const executing: Promise<any>[] = [];
  for (const chunk of chunks) {
    const p = fn(chunk);
    executing.push(p);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Clean up settled promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const status = await Promise.race([executing[i].then(() => true).catch(() => true), Promise.resolve(false)]);
        if (status) {
          executing.splice(i, 1);
        }
      }
    }
  }
  await Promise.all(executing);
}

/**
 * Fetches all rows from a Supabase table by automatically paginating
 * past Supabase PostgREST's default 1000-row limit.
 */
async function fetchAllRowsFromSupabaseTable(
  client: any,
  tableName: string,
  orderColumn: string = 'timestamp',
  ascending: boolean = false
): Promise<any[] | null> {
  const allRows: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const to = from + pageSize - 1;
    let query = client.from(tableName).select('*').range(from, to);
    if (orderColumn) {
      query = query.order(orderColumn, { ascending });
    }
    const { data, error } = await query;

    if (error) {
      console.warn(`Supabase ${tableName} fetch error:`, error.message);
      return allRows.length > 0 ? allRows : null;
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  return allRows;
}

export async function testSupabaseConnection(customConfig?: SupabaseConfig): Promise<{
  success: boolean;
  message: string;
  tablesFound?: string[];
  missingTables?: string[];
}> {
  const rawConfig = customConfig || getSupabaseCredentials();
  const config = {
    url: sanitizeSupabaseUrl(rawConfig.url),
    key: rawConfig.key?.trim() || '',
  };
  if (!config.url || !config.key) {
    return {
      success: false,
      message: 'URL Supabase dan Key belum dikonfigurasi. Masukkan URL dan Key terlebih dahulu.',
    };
  }

  if (!config.url.startsWith('https://')) {
    return {
      success: false,
      message: 'URL Supabase harus diawali dengan https:// (contoh: https://xyz.supabase.co)',
    };
  }

  const client = getSupabaseClient(config);
  if (!client) {
    return {
      success: false,
      message: 'Gagal membuat klien Supabase. Periksa format URL dan Key Anda.',
    };
  }

  try {
    const requiredTables = ['students', 'attendance', 'activity_logs', 'teachers', 'teacher_attendance'];
    const tablesFound: string[] = [];
    const missingTables: string[] = [];

    for (const tableName of requiredTables) {
      try {
        const { error } = await client.from(tableName).select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
            missingTables.push(tableName);
          } else {
            tablesFound.push(tableName);
          }
        } else {
          tablesFound.push(tableName);
        }
      } catch {
        missingTables.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      return {
        success: true,
        message: `Terhubung ke Supabase! Beberapa tabel belum dibuat: (${missingTables.join(', ')}). Gunakan tombol 'Tampilkan SQL Schema' untuk membuat tabel yang belum ada.`,
        tablesFound,
        missingTables,
      };
    }

    return {
      success: true,
      message: 'Koneksi ke Supabase Berhasil! Semua tabel database siap digunakan.',
      tablesFound,
      missingTables: [],
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal terhubung ke Supabase: ${err?.message || 'Koneksi gagal'}`,
    };
  }
}

// ==========================================
// STUDENTS SYNC & FETCH
// ==========================================

export async function syncStudentsToSupabase(
  students: Student[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (students.length === 0) return { success: true, count: 0 };

  try {
    const records = students
      .map((s) => ({
        id: s.id || `std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        id_qr: s.id_qr || '',
        nisn: s.nisn ? s.nisn.trim() : '',
        nama: s.nama ? s.nama.trim() : 'Siswa',
        kelas: s.kelas ? s.kelas.trim() : '-',
        no_hp_ortu: s.no_hp_ortu || '',
        foto: s.foto || '',
        status: s.status || 'aktif',
        created_at: toValidIsoTimestamp(s.createdAt),
      }))
      .filter((r) => r.nisn && r.nisn.length > 0);

    if (records.length === 0) return { success: true, count: 0 };

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('students').upsert(chunk, { onConflict: 'nisn' });
        if (error) throw error;
      },
      5
    );

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase student sync notice:', err?.message || err);
    return {
      success: false,
      count: 0,
      error: err?.message || 'Gagal menyimpan tabel students ke Supabase',
    };
  }
}

export async function fetchStudentsFromSupabase(customConfig?: SupabaseConfig): Promise<Student[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const data = await fetchAllRowsFromSupabaseTable(client, 'students', 'nama', true);
    if (data === null) return null;
    return data.map((row) => ({
      id: row.id || `std-${row.nisn}`,
      id_qr: row.id_qr || '',
      nisn: row.nisn || '',
      nama: row.nama || '',
      kelas: row.kelas || '',
      no_hp_ortu: row.no_hp_ortu || '',
      foto: row.foto || '',
      status: (row.status as any) || 'aktif',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('Supabase fetch students error:', err?.message || err);
    return null;
  }
}

export async function deleteStudentFromSupabase(identifier: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !identifier) return false;

  try {
    const { error } = await client
      .from('students')
      .delete()
      .or(`nisn.eq.${identifier},id.eq.${identifier}`);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// ATTENDANCE SYNC & FETCH
// ==========================================

export async function syncAttendanceToSupabase(
  attendance: AttendanceRecord[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (attendance.length === 0) return { success: true, count: 0 };

  try {
    const records = attendance.map((a) => {
      const validTimestamp = toValidIsoTimestamp(a.timestamp, a.tanggal);
      const tanggal = toValidIsoDate(a.tanggal, validTimestamp);

      return {
        id: a.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tanggal,
        timestamp: validTimestamp,
        nisn: a.nisn ? String(a.nisn).trim() : '',
        nama: a.nama ? String(a.nama).trim() : 'Siswa',
        kelas: a.kelas ? String(a.kelas).trim() : '-',
        id_qr: a.id_qr ? String(a.id_qr).trim() : '',
        jenis: a.jenis || 'Masuk',
        status: a.status || 'Hadir',
        petugas: a.petugas ? String(a.petugas).trim() : 'Sistem',
        catatan: a.catatan || '',
        terlambat_menit: typeof a.terlambatMenit === 'number' && !isNaN(a.terlambatMenit) ? Math.max(0, Math.floor(a.terlambatMenit)) : 0,
      };
    });

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('attendance').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      },
      5
    );

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase attendance sync notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan tabel attendance ke Supabase' };
  }
}

export async function fetchAttendanceFromSupabase(customConfig?: SupabaseConfig): Promise<AttendanceRecord[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const data = await fetchAllRowsFromSupabaseTable(client, 'attendance', 'timestamp', false);
    if (data === null) return null;
    return data.map((row) => ({
      id: row.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tanggal: toValidIsoDate(row.tanggal, row.timestamp),
      timestamp: row.timestamp || new Date().toISOString(),
      nisn: row.nisn || '',
      nama: row.nama || '',
      kelas: row.kelas || '',
      id_qr: row.id_qr || '',
      jenis: (row.jenis as any) || 'Masuk',
      status: (row.status as any) || 'Hadir',
      petugas: row.petugas || 'Sistem',
      catatan: row.catatan || '',
      terlambatMenit: row.terlambat_menit || 0,
    }));
  } catch (err: any) {
    console.warn('Supabase fetch attendance error:', err?.message || err);
    return null;
  }
}

export async function deleteAttendanceFromSupabase(id: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !id) return false;
  try {
    const { error } = await client.from('attendance').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// TEACHERS SYNC & FETCH
// ==========================================

export async function syncTeachersToSupabase(
  teachers: Teacher[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (teachers.length === 0) return { success: true, count: 0 };

  try {
    const records = teachers
      .map((t) => ({
        id: t.id || `tch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        nip: t.nip ? t.nip.trim() : '',
        nama: t.nama ? t.nama.trim() : 'Guru',
        jabatan: t.jabatan ? t.jabatan.trim() : 'Guru',
        id_qr: t.id_qr || `69933068.${t.nip}`,
        status: t.status || 'aktif',
        no_hp: t.no_hp || '',
        foto: t.foto || '',
        created_at: toValidIsoTimestamp(t.createdAt),
      }))
      .filter((r) => r.nip && r.nip.length > 0);

    if (records.length === 0) return { success: true, count: 0 };

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('teachers').upsert(chunk, { onConflict: 'nip' });
        if (error) throw error;
      },
      5
    );

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase teachers sync notice:', err?.message || err);
    return {
      success: false,
      count: 0,
      error: err?.message || 'Gagal menyimpan tabel teachers ke Supabase',
    };
  }
}

export async function fetchTeachersFromSupabase(customConfig?: SupabaseConfig): Promise<Teacher[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const data = await fetchAllRowsFromSupabaseTable(client, 'teachers', 'nama', true);
    if (data === null) return null;
    return data.map((row) => ({
      id: row.id || `tch-${row.nip}`,
      nip: row.nip || '',
      nama: row.nama || '',
      jabatan: row.jabatan || '',
      id_qr: row.id_qr || `69933068.${row.nip}`,
      status: (row.status as any) || 'aktif',
      no_hp: row.no_hp || '',
      foto: row.foto || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('Supabase fetch teachers error:', err?.message || err);
    return null;
  }
}

export async function deleteTeacherFromSupabase(identifier: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !identifier) return false;

  try {
    const { error } = await client
      .from('teachers')
      .delete()
      .or(`nip.eq.${identifier},id.eq.${identifier}`);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// TEACHER ATTENDANCE SYNC & FETCH
// ==========================================

export async function syncTeacherAttendanceToSupabase(
  attendance: TeacherAttendanceRecord[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (attendance.length === 0) return { success: true, count: 0 };

  try {
    const records = attendance.map((a) => {
      const validTimestamp = toValidIsoTimestamp(a.timestamp, a.tanggal);
      const tanggal = toValidIsoDate(a.tanggal, validTimestamp);

      return {
        id: a.id || `tch-att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tanggal,
        timestamp: validTimestamp,
        nip: a.nip ? String(a.nip).trim() : '',
        nama: a.nama ? String(a.nama).trim() : 'Guru',
        jabatan: a.jabatan ? String(a.jabatan).trim() : 'Guru',
        id_qr: a.id_qr || `69933068.${a.nip}`,
        jenis: a.jenis || 'Masuk',
        status: a.status || 'Hadir',
        petugas: a.petugas ? String(a.petugas).trim() : 'Sistem',
        catatan: a.catatan || '',
        terlambat_menit: typeof a.terlambatMenit === 'number' && !isNaN(a.terlambatMenit) ? Math.max(0, Math.floor(a.terlambatMenit)) : 0,
      };
    });

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('teacher_attendance').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      },
      5
    );

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase teacher attendance sync notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan tabel teacher_attendance ke Supabase' };
  }
}

export async function fetchTeacherAttendanceFromSupabase(customConfig?: SupabaseConfig): Promise<TeacherAttendanceRecord[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const data = await fetchAllRowsFromSupabaseTable(client, 'teacher_attendance', 'timestamp', false);
    if (data === null) return null;
    return data.map((row) => ({
      id: row.id || `tch-att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tanggal: toValidIsoDate(row.tanggal, row.timestamp),
      timestamp: row.timestamp || new Date().toISOString(),
      nip: row.nip || '',
      nama: row.nama || '',
      jabatan: row.jabatan || '',
      id_qr: row.id_qr || '',
      jenis: (row.jenis as any) || 'Masuk',
      status: (row.status as any) || 'Hadir',
      petugas: row.petugas || 'Sistem',
      catatan: row.catatan || '',
      terlambatMenit: row.terlambat_menit || 0,
    }));
  } catch (err: any) {
    console.warn('Supabase fetch teacher attendance error:', err?.message || err);
    return null;
  }
}

export async function deleteTeacherAttendanceFromSupabase(id: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !id) return false;
  try {
    const { error } = await client.from('teacher_attendance').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// ACTIVITY LOGS SYNC & FETCH
// ==========================================

export async function syncLogsToSupabase(logs: ActivityLog[], customConfig?: SupabaseConfig): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (logs.length === 0) return { success: true, count: 0 };

  try {
    const records = logs.map((l) => ({
      id: l.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: toValidIsoTimestamp(l.timestamp),
      user_name: l.user || 'Sistem',
      role: l.role || 'Admin',
      action: l.action || 'LOG',
      details: l.details || '',
    }));

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('activity_logs').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      },
      5
    );

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase activity logs sync notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan tabel activity_logs ke Supabase' };
  }
}

export async function fetchLogsFromSupabase(customConfig?: SupabaseConfig): Promise<ActivityLog[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const data = await fetchAllRowsFromSupabaseTable(client, 'activity_logs', 'timestamp', false);
    if (data === null) return null;
    return data.map((row) => ({
      id: row.id || `log-${Date.now()}`,
      timestamp: row.timestamp || new Date().toISOString(),
      user: row.user_name || '',
      role: (row.role as any) || 'Admin',
      action: row.action || '',
      details: row.details || '',
    }));
  } catch (err: any) {
    console.warn('Supabase fetch logs error:', err?.message || err);
    return null;
  }
}

export async function deleteLogFromSupabase(id: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !id) return false;
  try {
    const { error } = await client.from('activity_logs').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// SQL SCHEMA GENERATOR
// ==========================================

export function getSupabaseTeacherOnlySchemaSQL(): string {
  return `-- ==============================================================================
-- SQL Schema Khusus Tabel Guru & Presensi Guru di Supabase (PostgreSQL)
-- Jalankan di menu: SQL Editor > New Query di Dashboard Supabase
-- ==============================================================================

-- 1. TABEL GURU & TENAGA KEPENDIDIKAN (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT,
    nip TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    id_qr TEXT,
    status TEXT DEFAULT 'aktif',
    no_hp TEXT,
    foto TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memastikan kolom baru ada
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS id_qr TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS no_hp TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_teachers_id_qr ON public.teachers(id_qr);
CREATE INDEX IF NOT EXISTS idx_teachers_nama ON public.teachers(nama);

-- 2. TABEL PRESENSI GURU & GTK (teacher_attendance)
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id TEXT PRIMARY KEY,
    tanggal TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    nip TEXT NOT NULL,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    id_qr TEXT,
    jenis TEXT NOT NULL,
    status TEXT NOT NULL,
    petugas TEXT,
    catatan TEXT,
    terlambat_menit INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memastikan kolom baru ada
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS terlambat_menit INT DEFAULT 0;
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_tanggal ON public.teacher_attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_nip ON public.teacher_attendance(nip);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_jenis ON public.teacher_attendance(jenis);

-- 3. HAK AKSES ROW LEVEL SECURITY (RLS)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Allow all teachers') THEN
        CREATE POLICY "Allow all teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_attendance' AND policyname = 'Allow all teacher attendance') THEN
        CREATE POLICY "Allow all teacher attendance" ON public.teacher_attendance FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
`;
}

export function getSupabaseSchemaSQL(): string {
  return `-- ==============================================================================
-- SQL Schema Lengkap untuk Aplikasi Presensi Digital di Supabase (PostgreSQL)
-- Jalankan seluruh script SQL ini di menu: SQL Editor > New Query di Supabase
-- ==============================================================================

-- 1. TABEL SISWA (students)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT,
    id_qr TEXT,
    nisn TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    no_hp_ortu TEXT,
    foto TEXT,
    status TEXT DEFAULT 'aktif',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS id_qr TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS no_hp_ortu TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_students_id_qr ON public.students(id_qr);
CREATE INDEX IF NOT EXISTS idx_students_nama ON public.students(nama);
CREATE INDEX IF NOT EXISTS idx_students_kelas ON public.students(kelas);

-- 2. TABEL PRESENSI SISWA (attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    tanggal TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    nisn TEXT,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    id_qr TEXT,
    jenis TEXT NOT NULL,
    status TEXT NOT NULL,
    petugas TEXT,
    catatan TEXT,
    terlambat_menit INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS terlambat_menit INT DEFAULT 0;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON public.attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_nisn ON public.attendance(nisn);
CREATE INDEX IF NOT EXISTS idx_attendance_id_qr ON public.attendance(id_qr);
CREATE INDEX IF NOT EXISTS idx_attendance_jenis ON public.attendance(jenis);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);

-- 3. TABEL GURU & TENAGA KEPENDIDIKAN (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT,
    nip TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    id_qr TEXT,
    status TEXT DEFAULT 'aktif',
    no_hp TEXT,
    foto TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS id_qr TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS no_hp TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_teachers_id_qr ON public.teachers(id_qr);
CREATE INDEX IF NOT EXISTS idx_teachers_nama ON public.teachers(nama);

-- 4. TABEL PRESENSI GURU & GTK (teacher_attendance)
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id TEXT PRIMARY KEY,
    tanggal TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    nip TEXT NOT NULL,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    id_qr TEXT,
    jenis TEXT NOT NULL,
    status TEXT NOT NULL,
    petugas TEXT,
    catatan TEXT,
    terlambat_menit INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS terlambat_menit INT DEFAULT 0;
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_tanggal ON public.teacher_attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_nip ON public.teacher_attendance(nip);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_jenis ON public.teacher_attendance(jenis);

-- 5. TABEL LOG AKTIVITAS (activity_logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    user_name TEXT,
    role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON public.activity_logs(timestamp);

-- 6. KEBIJAKAN ROW LEVEL SECURITY (RLS) & HAK AKSES API
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Allow all students') THEN
        CREATE POLICY "Allow all students" ON public.students FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'Allow all attendance') THEN
        CREATE POLICY "Allow all attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Allow all teachers') THEN
        CREATE POLICY "Allow all teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_attendance' AND policyname = 'Allow all teacher attendance') THEN
        CREATE POLICY "Allow all teacher attendance" ON public.teacher_attendance FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Allow all logs') THEN
        CREATE POLICY "Allow all logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
`;
}

/**
 * Standard PostgreSQL Schema for Self-Hosted PostgreSQL / Cloud SQL (GCP) / Docker
 */
export function getPostgresSelfHostedSchemaSQL(): string {
  return `-- ====================================================================
-- NEXA15 PRESENSI DIGITAL - POSTGRESQL SELF-HOSTED & CLOUD SQL DDL
-- Standalone Standard PostgreSQL Schema (No Supabase dependency)
-- ====================================================================

-- 1. Table: Students (Data Siswa)
CREATE TABLE IF NOT EXISTS students (
    nisn VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class VARCHAR(50) NOT NULL,
    gender VARCHAR(10) DEFAULT 'L',
    phone VARCHAR(50),
    parent_phone VARCHAR(50),
    id_qr VARCHAR(100),
    status VARCHAR(20) DEFAULT 'aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_id_qr ON students(id_qr);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- 2. Table: Student Attendance (Presensi Siswa)
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(100) PRIMARY KEY,
    tanggal DATE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    nisn VARCHAR(20) NOT NULL REFERENCES students(nisn) ON UPDATE CASCADE ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    class VARCHAR(50) NOT NULL,
    id_qr VARCHAR(100),
    jenis VARCHAR(20) NOT NULL, -- 'Masuk' | 'Pulang'
    status VARCHAR(20) NOT NULL, -- 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa'
    petugas VARCHAR(100),
    catatan TEXT,
    terlambat_menit INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_nisn ON attendance(nisn);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_jenis ON attendance(jenis);

-- 3. Table: Teachers & Staff (Guru & Tenaga Kependidikan)
CREATE TABLE IF NOT EXISTS teachers (
    nip VARCHAR(30) PRIMARY KEY,
    id VARCHAR(100),
    nama VARCHAR(255) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    id_qr VARCHAR(100),
    status VARCHAR(20) DEFAULT 'aktif',
    no_hp VARCHAR(50),
    foto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teachers_id_qr ON teachers(id_qr);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

-- 4. Table: Teacher Attendance (Presensi Guru & GTK)
CREATE TABLE IF NOT EXISTS teacher_attendance (
    id VARCHAR(100) PRIMARY KEY,
    tanggal DATE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    nip VARCHAR(30) NOT NULL REFERENCES teachers(nip) ON UPDATE CASCADE ON DELETE RESTRICT,
    nama VARCHAR(255) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    id_qr VARCHAR(100),
    jenis VARCHAR(20) NOT NULL, -- 'Masuk' | 'Pulang'
    status VARCHAR(20) NOT NULL, -- 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa' | 'Dinas Luar'
    petugas VARCHAR(100),
    catatan TEXT,
    terlambat_menit INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teacher_att_tanggal ON teacher_attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_teacher_att_nip ON teacher_attendance(nip);

-- 5. Table: Activity Logs (Audit Trail & Log Aktivitas)
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_name VARCHAR(100),
    role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON activity_logs(timestamp DESC);

-- 6. Table: School Settings (Pengaturan & Konfigurasi Sekolah)
CREATE TABLE IF NOT EXISTS school_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    school_name VARCHAR(255) NOT NULL,
    school_npsn VARCHAR(50),
    school_logo TEXT,
    cutoff_time VARCHAR(10) DEFAULT '07:15',
    auto_alpa_cutoff_time VARCHAR(10) DEFAULT '14:30',
    enable_auto_alpa BOOLEAN DEFAULT true,
    academic_year VARCHAR(50) DEFAULT '2026/2027',
    enable_wa_notif BOOLEAN DEFAULT true,
    holidays_json JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;
}

/**
 * Docker Compose snippet for ready-to-run self-hosted PostgreSQL + pgAdmin
 */
export function getDockerComposePostgresYAML(): string {
  return `version: '3.8'

services:
  # 1. PostgreSQL Database Server
  postgres:
    image: postgres:16-alpine
    container_name: nexa15_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: nexa15_presensi
      POSTGRES_USER: nexa_admin
      POSTGRES_PASSWORD: SecretPassword123! # Ganti dengan password kuat
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - nexa_network

  # 2. pgAdmin (Web GUI Management Database)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: nexa15_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@nexa15.sch.id
      PGADMIN_DEFAULT_PASSWORD: AdminPassword123!
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      - postgres
    networks:
      - nexa_network

volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local

networks:
  nexa_network:
    driver: bridge
`;
}

/**
 * Generates an executable SQL Dump (DDL + INSERT statements) from current in-memory store data
 */
export function generateFullSqlBackupDump(
  students: Student[],
  attendance: AttendanceRecord[],
  teachers: Teacher[],
  teacherAttendance: TeacherAttendanceRecord[],
  logs: ActivityLog[],
  schoolSettings?: any
): string {
  const escapeSql = (str: any): string => {
    if (str === null || str === undefined) return 'NULL';
    const s = String(str).replace(/'/g, "''");
    return `'${s}'`;
  };

  const escapeNum = (num: any, def = 0): number => {
    const n = Number(num);
    return isNaN(n) ? def : n;
  };

  let sql = `-- ====================================================================
-- NEXA15 DATABASE BACKUP DUMP (POSTGRESQL / CLOUD SQL COMPATIBLE)
-- Generated: ${new Date().toISOString()}
-- Total Students: ${students.length}
-- Total Attendance: ${attendance.length}
-- Total Teachers: ${teachers.length}
-- Total Teacher Attendance: ${teacherAttendance.length}
-- Total Logs: ${logs.length}
-- ====================================================================

-- 1. SCHEMA DDL CREATION
${getPostgresSelfHostedSchemaSQL()}

-- 2. DATA INSERTIONS
`;

  // Insert Students
  if (students.length > 0) {
    sql += `\n-- 2.1 Students Data (${students.length} rows)\n`;
    students.forEach((s) => {
      sql += `INSERT INTO students (nisn, name, class, gender, phone, parent_phone, id_qr, status) VALUES (${escapeSql(
        s.nisn
      )}, ${escapeSql(s.nama)}, ${escapeSql(s.kelas)}, ${escapeSql('L')}, ${escapeSql(
        ''
      )}, ${escapeSql(s.no_hp_ortu || '')}, ${escapeSql(s.id_qr || s.nisn)}, ${escapeSql(s.status || 'aktif')})
ON CONFLICT (nisn) DO UPDATE SET 
  name = EXCLUDED.name, 
  class = EXCLUDED.class, 
  gender = EXCLUDED.gender, 
  phone = EXCLUDED.phone, 
  parent_phone = EXCLUDED.parent_phone, 
  id_qr = EXCLUDED.id_qr, 
  status = EXCLUDED.status;\n`;
    });
  }

  // Insert Teachers
  if (teachers.length > 0) {
    sql += `\n-- 2.2 Teachers Data (${teachers.length} rows)\n`;
    teachers.forEach((t) => {
      sql += `INSERT INTO teachers (nip, id, nama, jabatan, id_qr, status, no_hp, foto) VALUES (${escapeSql(
        t.nip
      )}, ${escapeSql(t.id || t.nip)}, ${escapeSql(t.nama)}, ${escapeSql(t.jabatan)}, ${escapeSql(
        t.id_qr || t.nip
      )}, ${escapeSql(t.status || 'aktif')}, ${escapeSql(t.no_hp || '')}, ${escapeSql(t.foto || '')})
ON CONFLICT (nip) DO UPDATE SET 
  nama = EXCLUDED.nama, 
  jabatan = EXCLUDED.jabatan, 
  id_qr = EXCLUDED.id_qr, 
  status = EXCLUDED.status, 
  no_hp = EXCLUDED.no_hp;\n`;
    });
  }

  // Insert Student Attendance
  if (attendance.length > 0) {
    sql += `\n-- 2.3 Attendance Records (${attendance.length} rows)\n`;
    attendance.forEach((a) => {
      const ts = toValidIsoTimestamp(a.timestamp, a.tanggal);
      const isoDate = toValidIsoDate(a.tanggal, ts);
      sql += `INSERT INTO attendance (id, tanggal, timestamp, nisn, name, class, id_qr, jenis, status, petugas, catatan, terlambat_menit) VALUES (${escapeSql(
        a.id
      )}, ${escapeSql(isoDate)}, '${ts}', ${escapeSql(a.nisn)}, ${escapeSql(a.nama)}, ${escapeSql(
        a.kelas
      )}, ${escapeSql(a.id_qr || a.nisn)}, ${escapeSql(a.jenis)}, ${escapeSql(a.status)}, ${escapeSql(
        a.petugas || ''
      )}, ${escapeSql(a.catatan || '')}, ${escapeNum(a.terlambatMenit, 0)})
ON CONFLICT (id) DO NOTHING;\n`;
    });
  }

  // Insert Teacher Attendance
  if (teacherAttendance.length > 0) {
    sql += `\n-- 2.4 Teacher Attendance Records (${teacherAttendance.length} rows)\n`;
    teacherAttendance.forEach((ta) => {
      const ts = toValidIsoTimestamp(ta.timestamp, ta.tanggal);
      const isoDate = toValidIsoDate(ta.tanggal, ts);
      sql += `INSERT INTO teacher_attendance (id, tanggal, timestamp, nip, nama, jabatan, id_qr, jenis, status, petugas, catatan, terlambat_menit) VALUES (${escapeSql(
        ta.id
      )}, ${escapeSql(isoDate)}, '${ts}', ${escapeSql(ta.nip)}, ${escapeSql(ta.nama)}, ${escapeSql(
        ta.jabatan
      )}, ${escapeSql(ta.id_qr || ta.nip)}, ${escapeSql(ta.jenis)}, ${escapeSql(ta.status)}, ${escapeSql(
        ta.petugas || ''
      )}, ${escapeSql(ta.catatan || '')}, ${escapeNum(ta.terlambatMenit, 0)})
ON CONFLICT (id) DO NOTHING;\n`;
    });
  }

  // Insert Logs
  if (logs.length > 0) {
    sql += `\n-- 2.5 Activity Logs (${logs.length} rows)\n`;
    logs.slice(0, 500).forEach((l) => {
      const ts = toValidIsoTimestamp(l.timestamp);
      sql += `INSERT INTO activity_logs (id, timestamp, user_name, role, action, details) VALUES (${escapeSql(
        l.id
      )}, '${ts}', ${escapeSql(l.user || '')}, ${escapeSql(l.role || '')}, ${escapeSql(
        l.action
      )}, ${escapeSql(l.details || '')})
ON CONFLICT (id) DO NOTHING;\n`;
    });
  }

  sql += `\n-- ====================================================================
-- DUMP COMPLETED SUCCESSFULLY
-- ====================================================================\n`;

  return sql;
}

/**
 * Revisi & Hapus Seluruh Presensi Hari Sabtu yang Berstatus ALPA dari Supabase
 */
export async function purgeSaturdayAlpaFromSupabase(customConfig?: SupabaseConfig): Promise<{
  deletedStudents: number;
  deletedTeachers: number;
}> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { deletedStudents: 0, deletedTeachers: 0 };

  let deletedStudents = 0;
  let deletedTeachers = 0;

  const isSat = (dateStr?: string, timestamp?: string): boolean => {
    if (dateStr) {
      const s = String(dateStr).trim();
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
    if (timestamp) {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) return d.getDay() === 6;
    }
    return false;
  };

  try {
    // 1. Student Attendance
    const { data: studentRecords } = await client
      .from('attendance')
      .select('id, tanggal, timestamp, status')
      .eq('status', 'Alpa');

    if (studentRecords && studentRecords.length > 0) {
      const idsToDelete = studentRecords
        .filter((r: any) => isSat(r.tanggal, r.timestamp))
        .map((r: any) => r.id);

      if (idsToDelete.length > 0) {
        for (let i = 0; i < idsToDelete.length; i += 200) {
          const chunk = idsToDelete.slice(i, i + 200);
          await client.from('attendance').delete().in('id', chunk);
        }
        deletedStudents = idsToDelete.length;
      }
    }

    // 2. Teacher Attendance
    const { data: teacherRecords } = await client
      .from('teacher_attendance')
      .select('id, tanggal, timestamp, status')
      .eq('status', 'Alpa');

    if (teacherRecords && teacherRecords.length > 0) {
      const idsToDelete = teacherRecords
        .filter((r: any) => isSat(r.tanggal, r.timestamp))
        .map((r: any) => r.id);

      if (idsToDelete.length > 0) {
        for (let i = 0; i < idsToDelete.length; i += 200) {
          const chunk = idsToDelete.slice(i, i + 200);
          await client.from('teacher_attendance').delete().in('id', chunk);
        }
        deletedTeachers = idsToDelete.length;
      }
    }
  } catch (error) {
    console.warn('purgeSaturdayAlpaFromSupabase warning:', error);
  }

  return { deletedStudents, deletedTeachers };
}



