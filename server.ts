import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Enable CORS for mobile and web requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

const DB_FILE = path.join(process.cwd(), "nexa15_server_db.json");

interface ServerDatabase {
  students: any[];
  attendance: any[];
  teachers: any[];
  teacherAttendance: any[];
  logs: any[];
  settings: any | null;
  passwords: any | null;
}

let serverData: ServerDatabase = {
  students: [],
  attendance: [],
  teachers: [],
  teacherAttendance: [],
  logs: [],
  settings: null,
  passwords: null,
};

// Load initial database
function loadServerData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        serverData = {
          students: Array.isArray(parsed.students) ? parsed.students : [],
          attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
          teachers: Array.isArray(parsed.teachers) ? parsed.teachers : [],
          teacherAttendance: Array.isArray(parsed.teacherAttendance) ? parsed.teacherAttendance : [],
          logs: Array.isArray(parsed.logs) ? parsed.logs : [],
          settings: parsed.settings || null,
          passwords: parsed.passwords || null,
        };
      }
    } else {
      saveServerData();
    }
  } catch (err) {
    console.error("Error reading server database file:", err);
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
function saveServerData() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(serverData, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing server database file:", err);
    }
  }, 100);
}

loadServerData();

// Health Check API
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    appName: "NEXA15",
    supabaseConfigured: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    timestamp: new Date().toISOString(),
  });
});

// Supabase Status Endpoint
const DEFAULT_SUPABASE_URL = "https://tpxyvbfbahsjssqwubfl.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_oH-2538e28kbMbpk8ESZ7w_LpeIn1Jh";

app.get("/api/supabase/status", (_req, res) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  res.json({
    configured: Boolean(url && key),
    supabaseUrl: url ? url.substring(0, 30) + "..." : null,
    hasKey: Boolean(key),
    tables: ["students", "attendance", "activity_logs"],
  });
});

// Attendance API
app.get("/api/attendance", (_req, res) => {
  res.json(serverData.attendance || []);
});

app.post("/api/attendance", (req, res) => {
  const record = req.body;
  if (!record || !record.id) {
    res.status(400).json({ error: "Invalid attendance record" });
    return;
  }
  const idx = serverData.attendance.findIndex((a) => a.id === record.id);
  if (idx !== -1) {
    serverData.attendance[idx] = { ...serverData.attendance[idx], ...record };
  } else {
    serverData.attendance.unshift(record);
  }
  saveServerData();
  res.json({ success: true, count: serverData.attendance.length });
});

app.post("/api/attendance/sync", (req, res) => {
  const { attendance, mode } = req.body;
  if (!Array.isArray(attendance)) {
    res.status(400).json({ error: "attendance must be an array" });
    return;
  }

  if (mode === "replace") {
    serverData.attendance = attendance;
  } else {
    const map = new Map<string, any>();
    serverData.attendance.forEach((r) => map.set(r.id, r));
    attendance.forEach((r) => {
      if (r && r.id) {
        map.set(r.id, r);
      }
    });
    serverData.attendance = Array.from(map.values());
  }

  saveServerData();
  res.json({ success: true, count: serverData.attendance.length });
});

app.post("/api/attendance/delete-multiple", (req, res) => {
  const { ids } = req.body;
  if (Array.isArray(ids)) {
    const set = new Set(ids);
    serverData.attendance = serverData.attendance.filter((a) => !set.has(a.id));
    saveServerData();
  }
  res.json({ success: true, count: serverData.attendance.length });
});

app.delete("/api/attendance/:id", (req, res) => {
  const { id } = req.params;
  serverData.attendance = serverData.attendance.filter((a) => a.id !== id);
  saveServerData();
  res.json({ success: true });
});

app.post("/api/attendance/clear", (_req, res) => {
  serverData.attendance = [];
  saveServerData();
  res.json({ success: true });
});

// Students API
app.get("/api/students", (_req, res) => {
  res.json(serverData.students || []);
});

app.post("/api/students/sync", (req, res) => {
  const { students, mode } = req.body;
  if (!Array.isArray(students)) {
    res.status(400).json({ error: "students must be an array" });
    return;
  }

  if (mode === "replace") {
    serverData.students = students;
  } else {
    const map = new Map<string, any>();
    serverData.students.forEach((s) => {
      if (s.id) map.set(s.id, s);
      if (s.nisn) map.set("nisn-" + s.nisn, s);
    });
    students.forEach((s) => {
      if (!s) return;
      const key = s.id || (s.nisn ? "nisn-" + s.nisn : null);
      if (key) {
        map.set(key, s);
      }
    });
    serverData.students = Array.from(map.values());
  }

  saveServerData();
  res.json({ success: true, count: serverData.students.length });
});

app.post("/api/students/clear", (_req, res) => {
  serverData.students = [];
  saveServerData();
  res.json({ success: true });
});

// Teachers API
app.get("/api/teachers", (_req, res) => {
  res.json(serverData.teachers || []);
});

app.post("/api/teachers/sync", (req, res) => {
  const { teachers, mode } = req.body;
  if (!Array.isArray(teachers)) {
    res.status(400).json({ error: "teachers must be an array" });
    return;
  }

  if (mode === "replace") {
    serverData.teachers = teachers;
  } else {
    const map = new Map<string, any>();
    serverData.teachers.forEach((t) => {
      if (t.id) map.set(t.id, t);
      if (t.nip) map.set("nip-" + t.nip, t);
    });
    teachers.forEach((t) => {
      if (!t) return;
      const key = t.id || (t.nip ? "nip-" + t.nip : null);
      if (key) {
        map.set(key, t);
      }
    });
    serverData.teachers = Array.from(map.values());
  }

  saveServerData();
  res.json({ success: true, count: serverData.teachers.length });
});

app.post("/api/teachers/clear", (_req, res) => {
  serverData.teachers = [];
  saveServerData();
  res.json({ success: true });
});

// Teacher Attendance API
app.get("/api/teacher-attendance", (_req, res) => {
  res.json(serverData.teacherAttendance || []);
});

app.post("/api/teacher-attendance", (req, res) => {
  const record = req.body;
  if (!record || !record.id) {
    res.status(400).json({ error: "Invalid teacher attendance record" });
    return;
  }
  const idx = serverData.teacherAttendance.findIndex((a) => a.id === record.id);
  if (idx !== -1) {
    serverData.teacherAttendance[idx] = { ...serverData.teacherAttendance[idx], ...record };
  } else {
    serverData.teacherAttendance.unshift(record);
  }
  saveServerData();
  res.json({ success: true, count: serverData.teacherAttendance.length });
});

app.post("/api/teacher-attendance/sync", (req, res) => {
  const { attendance, mode } = req.body;
  if (!Array.isArray(attendance)) {
    res.status(400).json({ error: "attendance must be an array" });
    return;
  }

  if (mode === "replace") {
    serverData.teacherAttendance = attendance;
  } else {
    const map = new Map<string, any>();
    serverData.teacherAttendance.forEach((r) => map.set(r.id, r));
    attendance.forEach((r) => {
      if (r && r.id) {
        map.set(r.id, r);
      }
    });
    serverData.teacherAttendance = Array.from(map.values());
  }

  saveServerData();
  res.json({ success: true, count: serverData.teacherAttendance.length });
});

app.post("/api/teacher-attendance/clear", (_req, res) => {
  serverData.teacherAttendance = [];
  saveServerData();
  res.json({ success: true });
});

// Clear All Database
app.post("/api/database/clear-all", (_req, res) => {
  serverData = {
    students: [],
    attendance: [],
    teachers: [],
    teacherAttendance: [],
    logs: [],
    settings: null,
    passwords: null,
  };
  saveServerData();
  res.json({ success: true });
});

// Logs API
app.get("/api/logs", (_req, res) => {
  res.json(serverData.logs || []);
});

app.post("/api/logs", (req, res) => {
  const log = req.body;
  if (log && log.id) {
    serverData.logs.unshift(log);
    if (serverData.logs.length > 1000) {
      serverData.logs = serverData.logs.slice(0, 1000);
    }
    saveServerData();
  }
  res.json({ success: true, count: serverData.logs.length });
});

app.post("/api/logs/sync", (req, res) => {
  const { logs, mode } = req.body;
  if (!Array.isArray(logs)) {
    res.status(400).json({ error: "logs must be an array" });
    return;
  }

  if (mode === "replace") {
    serverData.logs = logs;
  } else {
    const map = new Map<string, any>();
    serverData.logs.forEach((l) => map.set(l.id, l));
    logs.forEach((l) => {
      if (l && l.id) map.set(l.id, l);
    });
    serverData.logs = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  saveServerData();
  res.json({ success: true, count: serverData.logs.length });
});

app.delete("/api/logs/:id", (req, res) => {
  const { id } = req.params;
  serverData.logs = serverData.logs.filter((l) => l.id !== id);
  saveServerData();
  res.json({ success: true });
});

app.post("/api/logs/clear", (_req, res) => {
  serverData.logs = [];
  saveServerData();
  res.json({ success: true });
});

// Settings API
app.get("/api/settings", (_req, res) => {
  res.json(serverData.settings || null);
});

app.post("/api/settings", (req, res) => {
  const settings = req.body;
  if (settings) {
    serverData.settings = settings;
    saveServerData();
  }
  res.json({ success: true });
});

// Gemini AI Integration
app.post("/api/gemini/analyze", async (req, res) => {
  const { prompt, type, attendanceData, studentData, month, kelas } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ success: false, error: "GEMINI_API_KEY is not configured on the server." });
    return;
  }

  let finalPrompt = prompt;
  if (!finalPrompt) {
    if (type === 'risk_detection' || type === 'low_attendance_alert') {
      finalPrompt = `Anda adalah Asisten Pakar Kedisiplinan Sekolah di SMA Negeri 15 Ambon.
Tugas Anda adalah menganalisis data siswa berisiko kehadiran rendah / sering alpa / sering terlambat.
Data Siswa & Kehadiran:
${JSON.stringify({ month, kelas, studentCount: studentData?.length, recordsCount: attendanceData?.length, sampleStudents: studentData?.slice(0, 30) }, null, 2)}

Mohon berikan:
1. Ringkasan Eksekutif Pola Risiko Kehadiran.
2. Identifikasi tingkat risiko utama (Tinggi / Sedang / Perhatian Khusus).
3. Langkah penanganan konkret untuk Guru BK, Wali Kelas, dan Piket (termasuk rekomendasi pemanggilan orang tua).`;
    } else {
      finalPrompt = `Anda adalah Konsultan Kehadiran AI di SMA Negeri 15 Ambon.
Mohon analisis ringkasan data kehadiran berikut:
${JSON.stringify({ type, month, kelas, sampleAttendance: attendanceData?.slice(0, 50) }, null, 2)}
Berikan ulasan evaluasi tingkat presensi siswa secara menyeluruh dan saran perbaikan.`;
    }
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: finalPrompt,
    });

    const text = response.text || '';
    res.json({ success: true, result: text, analysis: text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate AI response" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
