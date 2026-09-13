import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import jsQR from 'jsqr';
import { store } from '../lib/store';
import {
  Student,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceType,
  AttendanceScanMethod,
  Teacher,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
} from '../types';
import {
  formatLateDuration,
  getWhatsAppLink,
  generateWhatsAppMessage,
} from '../lib/exportUtils';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Clock,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  GraduationCap,
  User,
  MessageCircle,
  Zap,
  Sliders,
  ListCheck,
  History,
  Smartphone,
  Check,
  Barcode,
  Briefcase,
  Layers,
  ShieldAlert,
  ShieldCheck,
  LogIn,
  LogOut,
  XCircle,
  Info,
  Radio,
  Wifi,
  WifiOff,
  CreditCard,
  ZoomIn,
  ZoomOut,
  Sun,
  Maximize2,
  Focus,
  Crosshair,
  ExternalLink,
  Search,
  Users,
  Filter,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { toast } from '../lib/toast';

interface QRScannerProps {
  currentOfficer: string;
}

export type ScanTargetMode = 'siswa' | 'guru' | 'auto';

interface ScanOutcome {
  success: boolean;
  isDuplicate?: boolean;
  isOffline?: boolean;
  targetMode?: ScanTargetMode;
  scanMethod?: AttendanceScanMethod;
  isForgotCard?: boolean;
  student?: Student;
  teacher?: Teacher;
  record?: AttendanceRecord;
  teacherRecord?: TeacherAttendanceRecord;
  type?: 'Masuk' | 'Pulang';
  status?: AttendanceStatus | TeacherAttendanceStatus;
  message: string;
  scannedCode: string;
  timestamp: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ currentOfficer }) => {
  const [scanTargetMode, setScanTargetMode] = useState<ScanTargetMode>('siswa');
  const [scanTypeMode, setScanTypeMode] = useState<'Auto' | 'Masuk' | 'Pulang'>('Auto');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanOutcome | null>(null);

  // Web NFC Support (for Android Chrome / NFC Devices)
  const [hasNfcSupport, setHasNfcSupport] = useState<boolean>(false);
  const [isNfcActive, setIsNfcActive] = useState<boolean>(false);
  const nfcAbortControllerRef = useRef<AbortController | null>(null);

  // Network Status State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(store.getOfflineQueueCount());
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);

  // Scan Feed / History for current session
  const [scanFeed, setScanFeed] = useState<ScanOutcome[]>([]);

  // Performance & Queue Options - Mode Scan Massal starts DISABLED so popup info shows for 3 seconds
  const [rapidQueueMode, setRapidQueueMode] = useState<boolean>(false); // Mode Antrean Cepat (false by default)
  const [debounceSeconds, setDebounceSeconds] = useState<number>(3); // 3 seconds debounce per same QR
  const [scanFps, setScanFps] = useState<number>(15); // 15 FPS balanced responsiveness & lightweight CPU
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [modalDuration, setModalDuration] = useState<number>(3); // Durasi popup 3 detik

  // Camera Devices & Hardware Capabilities
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanFlash, setScanFlash] = useState<boolean>(false);

  // Schema 1: Turbo Digital Zoom & Small QR Enhancements
  const [zoomLevel, setZoomLevel] = useState<number>(1.2); // Default 1.2x zoom
  const [macroMode, setMacroMode] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isHardwareZoomSupported, setIsHardwareZoomSupported] = useState<boolean>(false);
  const [activeEngineLabel, setActiveEngineLabel] = useState<string>('Standard Fast Engine');
  const [tapFocusCoord, setTapFocusCoord] = useState<{ x: number; y: number } | null>(null);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string>('');
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(true);
  const [showPermissionGuide, setShowPermissionGuide] = useState<boolean>(false);

  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [countdown, setCountdown] = useState<number>(3);
  const [lastScannedQR, setLastScannedQR] = useState<string>('');
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>(store.getAttendance());
  const [teacherAttendanceList, setTeacherAttendanceList] = useState<TeacherAttendanceRecord[]>(store.getTeacherAttendance());
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<string>('');
  const [selectedTeacherForQR, setSelectedTeacherForQR] = useState<string>('');
  const [manualInput, setManualInput] = useState('');

  // Autocomplete & Forgot ID Card Feature States
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<number>(-1);
  const [markAsForgotCard, setMarkAsForgotCard] = useState<boolean>(true);
  const [showForgotCardModal, setShowForgotCardModal] = useState<boolean>(false);
  const [forgotCardClassFilter, setForgotCardClassFilter] = useState<string>('Semua');
  const [forgotCardStatusFilter, setForgotCardStatusFilter] = useState<'belum' | 'semua'>('belum');
  const [forgotCardSearch, setForgotCardSearch] = useState<string>('');

  const suggestionBoxRef = useRef<HTMLDivElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const recentScanTimesRef = useRef<Map<string, number>>(new Map());

  const handleTriggerBulkPulang1430 = () => {
    const todayTarget = store.getTodayYyyyMmDd();
    const dayRecords = store.getAttendance().filter((a) => store.isRecordForDate(a, todayTarget));
    const activeStudents = store.getStudents().filter((s) => s.status === 'aktif');

    const unreturnedStudents = activeStudents.filter((student) => {
      const studentDayRecords = dayRecords.filter(
        (a) => a.nisn === student.nisn || a.nama === student.nama
      );
      const hasPulang = studentDayRecords.some((a) => a.jenis === 'Pulang');
      return !hasPulang;
    });

    if (unreturnedStudents.length === 0) {
      toast.info('Semua Lengkap', 'Semua siswa yang aktif sudah memiliki rekaman scan Pulang hari ini.');
      return;
    }

    const res = store.recordBulkStudentsPulang1430(todayTarget, 'Semua', currentOfficer);
    if (res.success) {
      toast.success('Batas Akhir Pulang Dicatat', `${res.count} siswa tercatat pulang pada batas akhir pukul 14:30 WIT.`);
    }
  };

  // Countdown timer for modal when modal is active (3-second display)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    if (showModal && !rapidQueueMode) {
      setCountdown(modalDuration);
      interval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      timer = setTimeout(() => {
        setShowModal(false);
      }, modalDuration * 1000);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [showModal, modalDuration, rapidQueueMode]);

  // Load student & teacher list & fetch cameras & setup network listeners
  useEffect(() => {
    setStudentsList(store.getStudents());
    setTeachersList(store.getTeachers());
    setAttendanceList(store.getAttendance());
    setTeacherAttendanceList(store.getTeacherAttendance());
    store.fetchFromServer();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Koneksi Internet Pulih', 'Perangkat kembali online. Menyinkronkan data tertunda ke Database Cloud...', 4000);
      store.syncAllPendingToDatabase(true).then((res) => {
        if (res.processedCount > 0) {
          toast.success('Sinkronisasi Otomatis Sukses', `${res.processedCount} data scan berhasil terekam ke database Cloud.`);
        }
      }).catch(() => {});
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Koneksi Internet Terputus', 'Perangkat beralih ke Mode Offline. Scan presensi akan disimpan secara lokal.', 6000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = store.subscribe(() => {
      setStudentsList(store.getStudents());
      setTeachersList(store.getTeachers());
      setAttendanceList(store.getAttendance());
      setTeacherAttendanceList(store.getTeacherAttendance());
      setOfflineQueueCount(store.getOfflineQueueCount());
    });

    fetchAvailableCameras();

    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setHasNfcSupport(true);
    }

    // Auto-trigger camera startup on menu open so browser immediately displays the permission prompt
    let autoStartTimer: NodeJS.Timeout | null = null;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      setIsStartingCamera(true);
      autoStartTimer = setTimeout(() => {
        startCamera();
      }, 300);
    }

    // Check camera permission status via Permissions API if supported
    if (typeof navigator !== 'undefined' && (navigator as any).permissions && (navigator as any).permissions.query) {
      (navigator as any).permissions
        .query({ name: 'camera' })
        .then((perm: any) => {
          if (perm.state === 'granted') {
            setCameraPermissionStatus('granted');
            setShowPermissionGuide(false);
          } else if (perm.state === 'denied') {
            setCameraPermissionStatus('denied');
            setShowPermissionGuide(true);
            setIsStartingCamera(false);
          }
          perm.onchange = () => {
            if (perm.state === 'granted') {
              setCameraPermissionStatus('granted');
              setShowPermissionGuide(false);
              startCamera();
            } else if (perm.state === 'denied') {
              setCameraPermissionStatus('denied');
              setShowPermissionGuide(true);
              stopCamera();
            }
          };
        })
        .catch(() => {});
    }

    return () => {
      if (autoStartTimer) clearTimeout(autoStartTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (nfcAbortControllerRef.current) {
        nfcAbortControllerRef.current.abort();
        nfcAbortControllerRef.current = null;
      }
      unsubscribe();
      stopCamera();
    };
  }, []);

  // Close autocomplete suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(e.target as Node) &&
        manualInputRef.current &&
        !manualInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleWebNfc = async () => {
    if (!hasNfcSupport) {
      toast.info(
        'NFC Tidak Didukung',
        'Browser atau perangkat ini tidak mendukung Web NFC API. Anda tetap dapat menggunakan USB RFID Reader (Plug & Play) atau Kamera.'
      );
      return;
    }

    if (isNfcActive) {
      if (nfcAbortControllerRef.current) {
        nfcAbortControllerRef.current.abort();
        nfcAbortControllerRef.current = null;
      }
      setIsNfcActive(false);
      toast.info('NFC Dinonaktifkan', 'Sensor NFC perangkat dimatikan.');
      return;
    }

    try {
      const NDEFReaderClass = (window as any).NDEFReader;
      const ndef = new NDEFReaderClass();
      const ctrl = new AbortController();
      nfcAbortControllerRef.current = ctrl;

      await ndef.scan({ signal: ctrl.signal });
      setIsNfcActive(true);
      toast.success(
        'Sensor NFC Aktif!',
        'Tempelkan kartu RFID/NFC (Mifare/e-KTP/Tag) ke bagian belakang perangkat.'
      );

      ndef.addEventListener('reading', (event: any) => {
        const serialNumber = event.serialNumber;
        if (serialNumber) {
          const cleanSerial = serialNumber.replace(/[\s:-]+/g, '').toUpperCase();
          processScannedCode(cleanSerial);
        }
      });

      ndef.addEventListener('readingerror', () => {
        toast.error('Gagal Baca NFC', 'Kartu NFC tidak terbaca dengan jelas. Silakan tap ulang.');
      });
    } catch (err: any) {
      console.error('NFC error:', err);
      setIsNfcActive(false);
      toast.error('Izin NFC Ditolak / Tidak Aktif', err.message || 'Pastikan NFC diaktifkan di setelan HP.');
    }
  };

  const handleManualCheckConnection = async () => {
    setIsCheckingConnection(true);
    const onlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(onlineState);
    if (onlineState) {
      await store.fetchFromServer();
      toast.success('Koneksi Cloud Normal', 'Perangkat terhubung dengan database Supabase Cloud PostgreSQL.');
    } else {
      toast.warning('Koneksi Masih Terputus', 'Perangkat masih offline. Hasil scan tetap disimpan secara aman di cache lokal.');
    }
    setIsCheckingConnection(false);
  };

  // Listen for USB/Bluetooth Hardware Barcode & QR Scanner Gun
  useEffect(() => {
    let buffer = '';
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.trim().length >= 3) {
          processScannedCode(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          buffer = '';
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [debounceSeconds, rapidQueueMode, currentOfficer, scanTargetMode, scanTypeMode]);

  const fetchAvailableCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const formatted = devices.map((d) => ({
          id: d.id,
          label: d.label || `Kamera ${d.id.substring(0, 6)}`,
        }));
        setAvailableCameras(formatted);

        // Auto select rear camera
        const backCam =
          formatted.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment') ||
              c.label.toLowerCase().includes('0')
          ) || formatted[0];

        setSelectedCameraId(backCam.id);
      }
    } catch (e) {
      console.log('Failed to enumerate video devices:', e);
    }
  };

  const requestCameraAccess = async () => {
    setIsRequestingPermission(true);
    setCameraErrorMessage('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser atau perangkat ini tidak mendukung API kamera WebRTC.');
      }
      // Request simple permission stream to prompt browser dialog
      const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
      testStream.getTracks().forEach((track) => track.stop());

      setCameraPermissionStatus('granted');
      setShowPermissionGuide(false);
      await fetchAvailableCameras();
      await startCamera();
      toast.success('Izin Kamera Diberikan', 'Kamera berhasil diizinkan dan siap digunakan untuk scan.');
    } catch (err: any) {
      console.error('Camera permission request error:', err);
      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('denied')
      ) {
        setCameraPermissionStatus('denied');
        setCameraErrorMessage(
          'Izin akses kamera diblokir atau ditolak di browser. Silakan izinkan akses kamera melalui ikon gembok/pengaturan situs di samping URL browser.'
        );
        setShowPermissionGuide(true);
        toast.error('Izin Kamera Ditolak', 'Akses kamera diblokir browser. Buka setelan situs untuk mengizinkan.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraPermissionStatus('error');
        setCameraErrorMessage('Tidak ada kamera yang terdeteksi pada perangkat ini.');
        toast.error('Kamera Tidak Ditemukan', 'Pastikan kamera HP atau webcam laptop terhubung.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraPermissionStatus('error');
        setCameraErrorMessage('Kamera sedang aktif digunakan oleh aplikasi lain (seperti Zoom, Google Meet, WhatsApp, atau tab lain). Tutup aplikasi tersebut.');
        toast.error('Kamera Sibuk', 'Tutup aplikasi lain yang sedang menggunakan kamera.');
      } else {
        setCameraPermissionStatus('error');
        setCameraErrorMessage(errMsg || 'Gagal memperoleh izin kamera.');
        toast.error('Gagal Mengakses Kamera', errMsg || 'Periksa pengaturan kamera perangkat Anda.');
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const playSuccessSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Double upbeat chime: C5 (523.25Hz) -> G5 (783.99Hz)
      const notes = [523.25, 783.99];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.07);

        gain.gain.setValueAtTime(0, now + index * 0.07);
        gain.gain.linearRampToValueAtTime(0.25, now + index * 0.07 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.07);
        osc.stop(now + index * 0.07 + 0.22);
      });
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  };

  const playErrorSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Unmistakable rejection / duplicate warning buzz
      const freqs = [220, 165];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0, now + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.25, now + index * 0.1 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.2);
      });
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  };

  const playVoiceFeedback = (name: string, status: string, isSuccess: boolean) => {
    if (!soundEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        let text = '';
        if (isSuccess) {
           const firstName = name.split(' ')[0];
           if (status === 'Terlambat') {
             text = `Hadir terlambat, ${firstName}`;
           } else {
             text = `Terima kasih, ${firstName}`;
           }
        } else {
           text = `Maaf, presensi gagal`;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 1.1; 
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.log('TTS Error', e);
    }
  };

  // Helper for highlighting matching letters in search results
  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim()) return text;
    const q = query.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <span>
        {before}
        <span className="bg-yellow-200 dark:bg-yellow-900/60 text-slate-900 dark:text-yellow-200 font-extrabold underline rounded px-0.5">
          {match}
        </span>
        {after}
      </span>
    );
  };

  // Distinct classes list for filter
  const availableClasses = React.useMemo(() => {
    const set = new Set<string>();
    studentsList.forEach((s) => {
      if (s.kelas && s.kelas.trim()) set.add(s.kelas.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [studentsList]);

  // Realtime attendance status resolver for students
  const getStudentAttendanceStatusToday = (student: Student) => {
    const today = store.getTodayYyyyMmDd();
    const studentRecords = attendanceList.filter(
      (a) =>
        store.isRecordForDate(a, today) &&
        (a.nisn === student.nisn || (a.nama === student.nama && a.kelas === student.kelas)) &&
        !(a.id?.startsWith('att-autoalpa-') || a.catatan?.includes('Alpa Otomatis'))
    );
    const masuk = studentRecords.find((a) => a.jenis === 'Masuk');
    const pulang = studentRecords.find((a) => a.jenis === 'Pulang');

    if (masuk && pulang) {
      return {
        status: 'Lengkap',
        badgeText: `Lengkap (${store.formatRecordTimeWIT(pulang.timestamp)})`,
        isComplete: true,
        canScanMasuk: false,
        canScanPulang: false,
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      };
    }
    if (masuk) {
      return {
        status: masuk.status,
        badgeText: `Hadir (${store.formatRecordTimeWIT(masuk.timestamp)})`,
        isComplete: false,
        canScanMasuk: false,
        canScanPulang: true,
        color:
          masuk.status === 'Terlambat'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
      };
    }
    return {
      status: 'Belum',
      badgeText: 'Belum Presensi',
      isComplete: false,
      canScanMasuk: true,
      canScanPulang: false,
      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
  };

  // Realtime attendance status resolver for teachers
  const getTeacherAttendanceStatusToday = (teacher: Teacher) => {
    const today = store.getTodayYyyyMmDd();
    const teacherRecords = teacherAttendanceList.filter(
      (a) =>
        store.isRecordForDate(a, today) &&
        (a.nip === teacher.nip || a.nama === teacher.nama)
    );
    const masuk = teacherRecords.find((a) => a.jenis === 'Masuk');
    const pulang = teacherRecords.find((a) => a.jenis === 'Pulang');

    if (masuk && pulang) {
      return {
        status: 'Lengkap',
        badgeText: `Lengkap (${store.formatRecordTimeWIT(pulang.timestamp)})`,
        isComplete: true,
        canScanMasuk: false,
        canScanPulang: false,
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      };
    }
    if (masuk) {
      return {
        status: masuk.status,
        badgeText: `Hadir (${store.formatRecordTimeWIT(masuk.timestamp)})`,
        isComplete: false,
        canScanMasuk: false,
        canScanPulang: true,
        color:
          masuk.status === 'Terlambat'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
      };
    }
    return {
      status: 'Belum',
      badgeText: 'Belum Presensi',
      isComplete: false,
      canScanMasuk: true,
      canScanPulang: false,
      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
  };

  // Autocomplete candidate suggestions based on manual input
  const suggestions = React.useMemo(() => {
    const query = manualInput.trim().toLowerCase();
    if (!query) return [];

    if (scanTargetMode === 'guru') {
      return teachersList
        .filter((t) => t.status !== 'nonaktif')
        .filter((t) => {
          const nameMatch = t.nama.toLowerCase().includes(query);
          const nipMatch = t.nip?.toLowerCase().includes(query);
          const jabMatch = t.jabatan?.toLowerCase().includes(query);
          return nameMatch || nipMatch || jabMatch;
        })
        .slice(0, 7);
    } else {
      return studentsList
        .filter((s) => s.status === 'aktif')
        .filter((s) => {
          const nameMatch = s.nama.toLowerCase().includes(query);
          const nisnMatch = s.nisn?.toLowerCase().includes(query);
          const classMatch = s.kelas?.toLowerCase().includes(query);
          return nameMatch || nisnMatch || classMatch;
        })
        .slice(0, 7);
    }
  }, [manualInput, scanTargetMode, studentsList, teachersList]);

  // Filtered students for the dedicated "Lupa ID Card" search modal
  const filteredForgotCardStudents = React.useMemo(() => {
    let list = studentsList.filter((s) => s.status === 'aktif');

    if (forgotCardClassFilter !== 'Semua') {
      list = list.filter((s) => s.kelas === forgotCardClassFilter);
    }

    if (forgotCardSearch.trim()) {
      const q = forgotCardSearch.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          s.nisn?.toLowerCase().includes(q) ||
          s.kelas?.toLowerCase().includes(q)
      );
    }

    if (forgotCardStatusFilter === 'belum') {
      const today = store.getTodayYyyyMmDd();
      list = list.filter((student) => {
        const hasAtt = attendanceList.some(
          (a) =>
            store.isRecordForDate(a, today) &&
            (a.nisn === student.nisn || (a.nama === student.nama && a.kelas === student.kelas)) &&
            !(a.id?.startsWith('att-autoalpa-') || a.catatan?.includes('Alpa Otomatis'))
        );
        return !hasAtt;
      });
    }

    return list;
  }, [studentsList, forgotCardClassFilter, forgotCardSearch, forgotCardStatusFilter, attendanceList]);

  const processScannedCode = (
    decodedText: string,
    options?: {
      scanMethod?: AttendanceScanMethod;
      customNote?: string;
      isManualForgotCard?: boolean;
      forcedType?: AttendanceType;
    }
  ) => {
    if (!decodedText || !decodedText.trim()) return;

    const raw = decodedText.trim();
    const now = Date.now();

    // 1. Same-QR debounce check (skip debounce if manual from autocomplete / modal)
    if (!options?.isManualForgotCard) {
      const lastTime = recentScanTimesRef.current.get(raw);
      if (lastTime && now - lastTime < debounceSeconds * 1000) {
        toast.warning('Terlalu Cepat!', 'Data ini baru saja dipindai beberapa detik yang lalu. Mohon tunggu sesaat.');
        return;
      }
    }

    // Keep map bounded to prevent memory growth
    if (recentScanTimesRef.current.size > 200) {
      const cutoff = now - 60000;
      for (const [key, t] of recentScanTimesRef.current.entries()) {
        if (t < cutoff) recentScanTimesRef.current.delete(key);
      }
    }

    // 2. Atomic frame processing lock
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    recentScanTimesRef.current.set(raw, now);
    setLastScannedQR(raw);

    const currentlyOffline = !isOnline || (typeof navigator !== 'undefined' && !navigator.onLine);
    if (currentlyOffline) {
      toast.warning(
        'Mode Offline: Disimpan di Cache Lokal',
        'Koneksi internet terputus. Data presensi tetap tersimpan aman di perangkat dan akan disinkronkan ke Supabase Cloud saat online.',
        5000
      );
    }

    // Visual flash effect
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 300);

    const timeStr =
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jayapura',
      }) + ' WIT';

    // Smart target resolution: check if target explicitly matches student or teacher
    let effectiveTarget: ScanTargetMode = scanTargetMode;
    if (scanTargetMode === 'auto') {
      const match = store.findPersonByRfidOrCode(raw);
      if (match) {
        effectiveTarget = match.type === 'guru' ? 'guru' : 'siswa';
      } else {
        effectiveTarget = 'siswa';
      }
    } else if (scanTargetMode === 'siswa') {
      const studentMatch = store.findStudentByScannedCode(raw);
      if (!studentMatch) {
        const teacherMatch = store.findTeacherByScannedCode(raw);
        if (teacherMatch) {
          effectiveTarget = 'guru';
        }
      }
    } else if (scanTargetMode === 'guru') {
      const teacherMatch = store.findTeacherByScannedCode(raw);
      if (!teacherMatch) {
        const studentMatch = store.findStudentByScannedCode(raw);
        if (studentMatch) {
          effectiveTarget = 'siswa';
        }
      }
    }

    const effectiveScanType = options?.forcedType || scanTypeMode;

    if (effectiveTarget === 'guru') {
      // Record scan in teacher attendance store with scan type mode
      const result = store.recordTeacherScan(
        raw,
        raw,
        raw,
        currentOfficer,
        effectiveScanType,
        options?.scanMethod,
        options?.customNote
      );

      if (result.success) {
        playSuccessSound();
        if (result.teacher?.nama) playVoiceFeedback(result.teacher.nama, result.status || '', true);
      } else {
        playErrorSound();
        playVoiceFeedback('', '', false);
      }

      const isRfid = result.record?.scan_method === 'RFID' || (result.teacher?.rfid_uid && raw.toUpperCase().includes(result.teacher.rfid_uid.toUpperCase()));
      const isManual = options?.scanMethod === 'Manual' || result.record?.scan_method === 'Manual';
      const scanMethodFinal: AttendanceScanMethod = isManual ? 'Manual' : isRfid ? 'RFID' : 'QR';

      const outcome: ScanOutcome = {
        success: result.success,
        isDuplicate: result.isDuplicate,
        isOffline: currentlyOffline,
        targetMode: 'guru',
        scanMethod: scanMethodFinal,
        isForgotCard: options?.isManualForgotCard || result.record?.catatan?.includes('Lupa'),
        teacher: result.teacher,
        teacherRecord: result.record,
        type: result.type,
        status: result.status,
        message: result.message,
        scannedCode: raw,
        timestamp: timeStr,
      };

      setScanResult(outcome);
      setScanFeed((prev) => [outcome, ...prev].slice(0, 30));

      if (!rapidQueueMode) {
        setShowModal(true);
      }
    } else {
      // Record scan in student attendance store with scan type mode
      const result = store.recordScan(
        raw,
        raw,
        raw,
        currentOfficer,
        effectiveScanType,
        options?.scanMethod,
        options?.customNote
      );

      if (result.success) {
        playSuccessSound();
        if (result.student?.nama) playVoiceFeedback(result.student.nama, result.status || '', true);
      } else {
        playErrorSound();
        playVoiceFeedback('', '', false);
      }

      const isRfid = result.record?.scan_method === 'RFID' || (result.student?.rfid_uid && raw.toUpperCase().includes(result.student.rfid_uid.toUpperCase()));
      const isManual = options?.scanMethod === 'Manual' || result.record?.scan_method === 'Manual';
      const scanMethodFinal: AttendanceScanMethod = isManual ? 'Manual' : isRfid ? 'RFID' : 'QR';

      const outcome: ScanOutcome = {
        success: result.success,
        isDuplicate: result.isDuplicate,
        isOffline: currentlyOffline,
        targetMode: 'siswa',
        scanMethod: scanMethodFinal,
        isForgotCard: options?.isManualForgotCard || result.record?.catatan?.includes('Lupa'),
        student: result.student,
        record: result.record,
        type: result.type,
        status: result.status,
        message: result.message,
        scannedCode: raw,
        timestamp: timeStr,
      };

      setScanResult(outcome);
      setScanFeed((prev) => [outcome, ...prev].slice(0, 30));

      if (!rapidQueueMode) {
        setShowModal(true);
      }
    }

    // Reset processing lock
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 250);
  };

  const handleSelectStudentForManualAttendance = (
    student: Student,
    customForcedType?: AttendanceType
  ) => {
    setShowSuggestions(false);
    setManualInput('');
    setFocusedSuggestionIndex(-1);

    const identifier = student.nisn || student.nama;
    processScannedCode(identifier, {
      scanMethod: markAsForgotCard ? 'Manual' : undefined,
      isManualForgotCard: markAsForgotCard,
      customNote: markAsForgotCard ? 'Presensi Manual (Lupa Bawa ID Card)' : undefined,
      forcedType: customForcedType,
    });

    toast.success(
      'Presensi Manual Diproses',
      `${student.nama} (${student.kelas}) berhasil diproses secara manual.${markAsForgotCard ? ' Dicatat keterangan lupa kartu.' : ''}`
    );
  };

  const handleSelectTeacherForManualAttendance = (
    teacher: Teacher,
    customForcedType?: AttendanceType
  ) => {
    setShowSuggestions(false);
    setManualInput('');
    setFocusedSuggestionIndex(-1);

    const identifier = teacher.nip || teacher.nama;
    processScannedCode(identifier, {
      scanMethod: markAsForgotCard ? 'Manual' : undefined,
      isManualForgotCard: markAsForgotCard,
      customNote: markAsForgotCard ? 'Presensi Manual Guru (Lupa Bawa ID Card)' : undefined,
      forcedType: customForcedType,
    });

    toast.success(
      'Presensi Manual Guru Diproses',
      `${teacher.nama} berhasil diproses secara manual.`
    );
  };

  const handleAssignRfidToStudent = (rfidUid: string, studentId: string) => {
    if (!rfidUid || !studentId) return;
    const success = store.assignRfidToStudent(studentId, rfidUid);
    if (success) {
      toast.success('Kartu RFID Ditaungkan', 'Kartu RFID berhasil ditautkan ke siswa. Memproses absensi...');
      processScannedCode(rfidUid);
    }
  };

  const handleAssignRfidToTeacher = (rfidUid: string, teacherId: string) => {
    if (!rfidUid || !teacherId) return;
    const success = store.assignRfidToTeacher(teacherId, rfidUid);
    if (success) {
      toast.success('Kartu RFID Ditautkan', 'Kartu RFID berhasil ditautkan ke guru. Memproses absensi...');
      processScannedCode(rfidUid);
    }
  };

  const handleConnectQRToStudent = (codeToConnect: string, studentId: string) => {
    if (!codeToConnect || !studentId) return;

    store.updateStudent(studentId, { id_qr: codeToConnect });
    const result = store.recordScan(codeToConnect, codeToConnect, codeToConnect, currentOfficer);

    const currentlyOffline = !isOnline || (typeof navigator !== 'undefined' && !navigator.onLine);
    if (currentlyOffline) {
      toast.warning(
        'Mode Offline: Disimpan di Cache Lokal',
        'Koneksi internet terputus. Data presensi disimpan di perangkat dan akan disinkronkan ke Supabase Cloud saat online.',
        5000
      );
    }

    if (result.success) {
      playSuccessSound();
      if (result.student?.nama) playVoiceFeedback(result.student.nama, result.status || '', true);
    } else {
      playErrorSound();
      playVoiceFeedback('', '', false);
    }

    const timeStr =
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jayapura',
      }) + ' WIT';

    const outcome: ScanOutcome = {
      success: result.success,
      isOffline: currentlyOffline,
      targetMode: 'siswa',
      scanMethod: 'QR',
      student: result.student,
      record: result.record,
      type: result.type,
      status: result.status,
      message: result.message,
      scannedCode: codeToConnect,
      timestamp: timeStr,
    };

    setScanResult(outcome);
    setScanFeed((prev) => [outcome, ...prev].slice(0, 30));
    setSelectedStudentForQR('');
  };

  const handleConnectQRToTeacher = (codeToConnect: string, teacherId: string) => {
    if (!codeToConnect || !teacherId) return;

    store.updateTeacher(teacherId, { id_qr: codeToConnect });
    const result = store.recordTeacherScan(
      codeToConnect,
      codeToConnect,
      codeToConnect,
      currentOfficer
    );

    const currentlyOffline = !isOnline || (typeof navigator !== 'undefined' && !navigator.onLine);
    if (currentlyOffline) {
      toast.warning(
        'Mode Offline: Disimpan di Cache Lokal',
        'Koneksi internet terputus. Data presensi disimpan di perangkat dan akan disinkronkan ke Supabase Cloud saat online.',
        5000
      );
    }

    if (result.success) {
      playSuccessSound();
      if (result.teacher?.nama) playVoiceFeedback(result.teacher.nama, result.status || '', true);
    } else {
      playErrorSound();
      playVoiceFeedback('', '', false);
    }

    const timeStr =
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jayapura',
      }) + ' WIT';

    const outcome: ScanOutcome = {
      success: result.success,
      isOffline: currentlyOffline,
      targetMode: 'guru',
      scanMethod: 'QR',
      teacher: result.teacher,
      teacherRecord: result.record,
      type: result.type,
      status: result.status,
      message: result.message,
      scannedCode: codeToConnect,
      timestamp: timeStr,
    };

    setScanResult(outcome);
    setScanFeed((prev) => [outcome, ...prev].slice(0, 30));
    setSelectedTeacherForQR('');
  };

  // Set Fast Scanner Engine Label
  useEffect(() => {
    setActiveEngineLabel('Fast Hardware Scanner');
  }, []);

  const handleApplyZoom = async (newZoom: number) => {
    setZoomLevel(newZoom);
    if (videoTrackRef.current) {
      try {
        const caps = videoTrackRef.current.getCapabilities ? (videoTrackRef.current.getCapabilities() as any) : {};
        if (caps && caps.zoom) {
          const minZ = caps.zoom.min || 1;
          const maxZ = caps.zoom.max || 5;
          const clampedZoom = Math.min(Math.max(newZoom, minZ), maxZ);
          await videoTrackRef.current.applyConstraints({
            advanced: [{ zoom: clampedZoom } as any],
          });
        }
      } catch (e) {
        console.log('Hardware zoom not available, using digital ROI crop', e);
      }
    }

    // Apply instantaneous visual scale transform to video element
    const videoEl = document.querySelector('#reader video') as HTMLVideoElement;
    if (videoEl) {
      videoEl.style.transform = `scale(${newZoom})`;
      videoEl.style.transformOrigin = 'center center';
      videoEl.style.transition = 'transform 0.2s ease-out';
    }
  };

  const handleToggleTorch = async () => {
    if (!videoTrackRef.current) {
      toast.warning('Kamera Belum Aktif', 'Aktifkan kamera terlebih dahulu untuk menyalakan lampu flash.');
      return;
    }
    try {
      const nextTorch = !isTorchOn;
      await videoTrackRef.current.applyConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setIsTorchOn(nextTorch);
      if (nextTorch) {
        toast.success('Lampu Flash Aktif', 'Pencahayaan kamera diaktifkan untuk scan di ruangan gelap.');
      } else {
        toast.info('Lampu Flash Mati', 'Pencahayaan flash dinonaktifkan.');
      }
    } catch (err: any) {
      console.log('Torch error:', err);
      toast.error('Flash Tidak Didukung', 'Sensor lampu flash tidak dapat diaktifkan pada kamera ini.');
    }
  };

  const handleToggleMacroMode = () => {
    const nextMode = !macroMode;
    setMacroMode(nextMode);
    if (nextMode) {
      handleApplyZoom(1.5);
      toast.success('Mode Makro Aktif', 'Kamera dioptimalkan untuk membaca QR Code jarak dekat.');
    } else {
      handleApplyZoom(1.0);
      toast.info('Mode Standar Aktif', 'Zoom kamera dikembalikan ke sudut normal.');
    }
  };

  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTapFocusCoord({ x, y });
    setTimeout(() => setTapFocusCoord(null), 1200);

    if (videoTrackRef.current) {
      try {
        videoTrackRef.current.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as any],
        }).catch(() => {});
      } catch {}
    }
  };

  const startCamera = async (camIdOverride?: string) => {
    try {
      setIsStartingCamera(true);
      setIsRequestingPermission(true);
      await stopCamera();
      setScanResult(null);
      setCameraErrorMessage('');

      // Brief pause to ensure DOM container #reader is mounted
      await new Promise((resolve) => setTimeout(resolve, 80));

      const targetCamId = camIdOverride || selectedCameraId;

      const config = {
        fps: Math.min(20, scanFps || 15),
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const edgeSize = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.82);
          return { width: edgeSize, height: edgeSize };
        },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      // Lightweight, efficient standard constraints (VGA / 480p / 720p - zero 1080p lag)
      const candidateConstraints: any[] = [];

      if (targetCamId) {
        candidateConstraints.push({
          deviceId: targetCamId,
          width: { ideal: 640 },
          height: { ideal: 480 },
        });
        candidateConstraints.push({
          deviceId: targetCamId,
        });
      }

      // Default rear camera with lightweight 640x480 resolution
      candidateConstraints.push({
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 },
      });

      // Rear camera standard
      candidateConstraints.push({
        facingMode: 'environment',
      });

      // Front camera / webcam fallback
      candidateConstraints.push({
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      });

      // Universal fallback
      candidateConstraints.push({});

      let started = false;
      let lastErr: any = null;

      for (let i = 0; i < candidateConstraints.length; i++) {
        const constraint = candidateConstraints[i];
        try {
          // Recreate clean Html5Qrcode instance
          if (!scannerRef.current) {
            const readerEl = document.getElementById('reader');
            if (!readerEl) {
              await new Promise((r) => setTimeout(r, 80));
            }
            scannerRef.current = new Html5Qrcode('reader', {
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
              verbose: false,
            });
          }

          await scannerRef.current.start(
            constraint,
            config,
            (decodedText) => {
              processScannedCode(decodedText);
            },
            () => {
              // Ignore frame parse misses
            }
          );

          started = true;
          setIsCameraActive(true);
          setIsStartingCamera(false);
          setIsRequestingPermission(false);
          setCameraPermissionStatus('granted');
          setCameraErrorMessage('');
          setShowPermissionGuide(false);
          // Refresh camera list now that permissions are granted to show real device labels
          fetchAvailableCameras();
          break;
        } catch (err: any) {
          lastErr = err;
          const errName = err?.name || '';
          const errMsg = err?.message || '';

          // If browser explicitly rejected camera permission, abort constraint fallback
          if (
            errName === 'NotAllowedError' ||
            errName === 'PermissionDeniedError' ||
            errMsg.toLowerCase().includes('permission') ||
            errMsg.toLowerCase().includes('denied')
          ) {
            setIsStartingCamera(false);
            setIsRequestingPermission(false);
            setCameraPermissionStatus('denied');
            setCameraErrorMessage('Izin kamera ditolak oleh browser. Silakan klik "Minta Izin Ulang" atau ubah izin situs di browser.');
            setShowPermissionGuide(true);
            throw err;
          }

          // Reset scanner before trying next constraint
          try {
            if (scannerRef.current && scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
          } catch {}
          scannerRef.current = null;
        }
      }

      if (!started) {
        throw lastErr || new Error('Gagal membuka aliran video kamera setelah beberapa konfigurasi.');
      }

      // Inspect hardware stream track capabilities and apply initial Zoom configuration
      setTimeout(() => {
        try {
          const videoEl = document.querySelector('#reader video') as HTMLVideoElement;
          if (videoEl) {
            const stream = (videoEl as any).srcObject as MediaStream;
            if (stream) {
              const track = stream.getVideoTracks()[0];
              if (track) {
                videoTrackRef.current = track;
                const caps = track.getCapabilities ? (track.getCapabilities() as any) : {};
                if (caps && caps.torch) {
                  setIsTorchSupported(true);
                }
                if (caps && caps.zoom) {
                  setIsHardwareZoomSupported(true);
                  const initialZ = macroMode ? 1.5 : zoomLevel;
                  track.applyConstraints({
                    advanced: [{ zoom: initialZ } as any],
                  }).catch(() => {});
                }
                // Continuous Autofocus lock
                try {
                  track.applyConstraints({
                    advanced: [{ focusMode: 'continuous' } as any],
                  }).catch(() => {});
                } catch {}
              }
            }

            // Visual zoom scaling
            const initialZoomVal = macroMode ? 1.5 : zoomLevel;
            videoEl.style.transform = `scale(${initialZoomVal})`;
            videoEl.style.transformOrigin = 'center center';
            videoEl.style.transition = 'transform 0.2s ease-out';
          }
        } catch (e) {
          console.log('Track capabilities inspection info:', e);
        }
      }, 150);
    } catch (err: any) {
      console.error('Camera activation error:', err);
      setIsCameraActive(false);
      setIsStartingCamera(false);
      setIsRequestingPermission(false);
      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('denied')
      ) {
        setCameraPermissionStatus('denied');
        setShowPermissionGuide(true);
        toast.error('Izin Kamera Ditolak', 'Akses kamera diblokir browser. Buka setelan izin situs untuk mengaktifkan.');
      } else {
        setCameraPermissionStatus('error');
        setCameraErrorMessage(errMsg || 'Kamera tidak dapat dimulai.');
        toast.error('Gagal Mengaktifkan Kamera', errMsg || 'Periksa koneksi kamera di browser Anda.');
      }
    }
  };

  const stopCamera = async () => {
    setIsStartingCamera(false);
    setIsRequestingPermission(false);
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.log('Scanner stop error:', e);
      }
    }
    if (videoTrackRef.current) {
      try {
        if (isTorchOn) {
          videoTrackRef.current.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
        }
      } catch {}
      videoTrackRef.current = null;
    }
    setIsTorchOn(false);
    scannerRef.current = null;
    setIsCameraActive(false);
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher & Scan Configuration Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`p-2.5 rounded-xl ${
                scanTargetMode === 'guru'
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              }`}
            >
              {scanTargetMode === 'guru' ? (
                <Briefcase className="w-6 h-6" />
              ) : (
                <GraduationCap className="w-6 h-6" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Scanner Presensi Digital NEXA15
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  Anti Scan Ganda Aktif
                </span>
                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Database Cloud Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40 animate-pulse">
                    <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Mode Offline (Internet Terputus)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {scanTargetMode === 'guru'
                  ? 'Mode target: Presensi Guru & Pegawai (Scan Kartu NIP / QR)'
                  : 'Mode target: Presensi Siswa Sekolah (Scan Kartu NISN / QR)'}
              </p>
            </div>
          </div>

          {/* Segmented Switcher for Target (Siswa vs Guru) */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setScanTargetMode('siswa');
                setScanResult(null);
              }}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                scanTargetMode === 'siswa'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm border border-indigo-200/60 dark:border-indigo-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Presensi Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanTargetMode('guru');
                setScanResult(null);
              }}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                scanTargetMode === 'guru'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-sm border border-sky-200/60 dark:border-sky-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Presensi Guru & Staf</span>
            </button>
          </div>
        </div>

        {/* Prominent Unsynced Scan Data Warning */}
        {offlineQueueCount > 0 && (
          <div className="bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-amber-500/20 border-2 border-amber-500/80 dark:border-amber-500 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-rose-600 text-white rounded-xl shadow-sm flex-shrink-0 animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-xs sm:text-sm text-rose-700 dark:text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                      <span>PERINGATAN: {offlineQueueCount} DATA SCAN BELUM TERKIRIM KE DATABASE</span>
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                      Antisipasi Data Hilang
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                    Data scan presensi ini tersimpan di memori lokal dan <b>belum terekam ke Database Cloud</b>. Segera klik tombol <b>Kirim ke Database</b> agar rekapitulasi presensi tidak hilang saat berpindah perangkat atau browser ditutup.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-unsynced-modal'))}
                  className="px-3.5 py-2 text-xs font-black bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-slate-700 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Buka Popup Petugas</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await store.syncAllPendingToDatabase(true);
                    if (res.success) {
                      toast.success('Pengiriman Berhasil', res.message);
                    } else {
                      toast.warning('Pengiriman Tertunda', res.message);
                    }
                  }}
                  className="px-4 py-2 text-xs font-black bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 hover:from-amber-700 hover:to-rose-800 active:scale-95 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kirim ke Server ({offlineQueueCount})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Prominent Network Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-400/80 dark:border-amber-600/80 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-500/30 flex-shrink-0 animate-pulse">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-xs sm:text-sm text-amber-950 dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Peringatan: Koneksi Internet Terputus (Mode Offline Aktif)</span>
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-900 dark:text-amber-200 border border-amber-400/50">
                      Presensi Disimpan di Cache Lokal
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    Aplikasi presensi mengandalkan koneksi database remote Supabase Cloud PostgreSQL. Karena internet terputus, Anda tetap dapat melakukan scan QR — data akan disimpan sementara di memori lokal browser dan otomatis disinkronkan ke server cloud saat internet terhubung kembali.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  type="button"
                  onClick={handleManualCheckConnection}
                  disabled={isCheckingConnection}
                  className="px-3.5 py-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Cek apakah koneksi internet sudah aktif kembali"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                  <span>{isCheckingConnection ? 'Memeriksa...' : 'Cek Status Jaringan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scan Type & Queue Mode Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Scan Type Selector (Otomatis / Masuk / Pulang) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Sesi Presensi:</span>
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setScanTypeMode('Auto')}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                  scanTypeMode === 'Auto'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Otomatis tentukan Masuk/Pulang berdasarkan jam (sebelum 10:00 WIT = Masuk, mulai 10:00 WIT ke atas = Pulang)"
              >
                Otomatis (Jam)
              </button>
              <button
                type="button"
                onClick={() => setScanTypeMode('Masuk')}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg flex items-center gap-1 transition-all ${
                  scanTypeMode === 'Masuk'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Paksa hanya rekam presensi Masuk"
              >
                <LogIn className="w-3 h-3" />
                <span>Masuk Saja</span>
              </button>
              <button
                type="button"
                onClick={() => setScanTypeMode('Pulang')}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg flex items-center gap-1 transition-all ${
                  scanTypeMode === 'Pulang'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Paksa hanya rekam presensi Pulang"
              >
                <LogOut className="w-3 h-3" />
                <span>Pulang Saja</span>
              </button>
            </div>
          </div>

          {/* Mode Scan Massal / Popup Mode Toggle & Auto Pulang 14:30 */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleTriggerBulkPulang1430}
              className="px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer active:scale-95"
              title="Set otomatis scan Pulang 14:30 WIT untuk semua siswa yang belum/lupa scan pulang hari ini"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>⚡ Auto Pulang 14:30</span>
            </button>

            <button
              type="button"
              onClick={() => setRapidQueueMode(!rapidQueueMode)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 border shadow-sm ${
                !rapidQueueMode
                  ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800 ring-2 ring-blue-400/20'
                  : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
              }`}
              title="Klik untuk beralih antara Mode Popup Detail (3 Detik) dan Mode Scan Massal (Cepat)"
            >
              {!rapidQueueMode ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <span>Mode Standar (Popup 3 Detik)</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Mode Scan Massal (Cepat / Non-Popup)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Camera & Scanner Panel */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-between transition-colors">
          {/* Header Controls */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isCameraActive ? 'bg-emerald-400' : 'bg-slate-300'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isCameraActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                ></span>
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {isCameraActive ? 'Kamera Aktif & Siap Scan' : 'Kamera Siaga (Off)'}
              </span>
              {isOnline ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <Wifi className="w-3 h-3" />
                  <span>Cloud Online</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 animate-pulse">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline Mode</span>
                </span>
              )}
            </div>

            {/* Camera Controls & Selector */}
            <div className="flex items-center gap-2">
              {availableCameras.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    if (isCameraActive) {
                      startCamera(e.target.value);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                >
                  {availableCameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label}
                    </option>
                  ))}
                </select>
              )}

              {isCameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1 hover:bg-rose-200 transition-colors"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Matikan</span>
                </button>
              )}
            </div>
          </div>

          {/* Video Container Box */}
          <div
            onClick={isCameraActive ? handleViewfinderClick : undefined}
            className={`w-full max-w-md aspect-square bg-slate-950 rounded-2xl border-2 overflow-hidden relative flex items-center justify-center shadow-inner transition-all cursor-crosshair ${
              scanFlash
                ? 'border-emerald-400 ring-4 ring-emerald-400/30'
                : 'border-dashed border-slate-700'
            }`}
          >
            {/* Target element for html5-qrcode */}
            <div id="reader" className="w-full h-full"></div>

            {/* Tap-to-Focus Reticle Visual Indicator */}
            {tapFocusCoord && isCameraActive && (
              <div
                className="absolute z-40 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all"
                style={{ left: tapFocusCoord.x, top: tapFocusCoord.y }}
              >
                <div className="w-12 h-12 border-2 border-amber-400 rounded-lg animate-ping opacity-80" />
                <div className="w-8 h-8 border-2 border-emerald-400 rounded-lg absolute inset-2 flex items-center justify-center">
                  <Crosshair className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            )}

            {/* Offline Viewfinder Warning Overlay Badge */}
            {!isOnline && isCameraActive && (
              <div className="absolute top-3 inset-x-3 z-30 pointer-events-none">
                <div className="bg-amber-950/90 text-amber-200 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/60 shadow-lg flex items-center justify-center gap-2 text-center text-[11px] font-extrabold tracking-wide animate-pulse">
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>MODE OFFLINE: KONEKSI TERPUTUS • SCAN DISIMPAN LOKAL</span>
                </div>
              </div>
            )}

            {/* In-Viewfinder Top Control Badges & Flashlight button */}
            {isCameraActive && (
              <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between gap-2 pointer-events-auto">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-900/85 backdrop-blur-md text-emerald-400 border border-emerald-500/40 shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>FHD 1080p ⚡ GPU</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMacroMode();
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all border shadow-xs flex items-center gap-1 cursor-pointer ${
                      macroMode
                        ? 'bg-amber-500/90 text-slate-950 border-amber-400 ring-2 ring-amber-400/40 font-black'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                    title="Aktifkan Mode Makro (2.0x Zoom) untuk membaca QR Code berukuran kecil dari jarak aman"
                  >
                    <Focus className="w-3 h-3" />
                    <span>Makro QR: {macroMode ? '2.0x (Aktif)' : 'Off'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTorch();
                    }}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm cursor-pointer ${
                      isTorchOn
                        ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-300/50'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
                    }`}
                    title={isTorchOn ? 'Matikan Lampu Flash' : 'Nyalakan Lampu Flash'}
                  >
                    <Sun className={`w-3.5 h-3.5 ${isTorchOn ? 'fill-current animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Flash / Scan feedback indicator ring */}
            {scanFlash && (
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-ping z-20" />
            )}

            {!isCameraActive && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-5 z-10 overflow-y-auto">
                {cameraPermissionStatus === 'denied' || showPermissionGuide ? (
                  <div className="flex flex-col items-center space-y-3 max-w-sm w-full">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shadow-lg animate-pulse">
                      <CameraOff className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-1.5 text-rose-400">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Izin Kamera Diperlukan</span>
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        Browser memblokir atau belum mengizinkan akses ke kamera. Silakan buka izin kamera untuk mulai memindai QR code.
                      </p>
                    </div>

                    {/* Step by step browser instruction card */}
                    <div className="w-full text-left bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 space-y-2 shadow-inner">
                      <div className="font-bold text-amber-400 flex items-center gap-1 text-[11px]">
                        <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>Langkah Membuka Izin di Browser:</span>
                      </div>
                      <div className="text-[10px] leading-relaxed text-slate-300 space-y-1.5">
                        <p>
                          <strong className="text-amber-300">1. Google Chrome & Edge:</strong> Ketuk ikon <strong className="text-white">🔒 (gembok)</strong> atau tombol setelan situs di samping kiri bilah URL ➔ Pilih <strong className="text-white">Izin Situs</strong> ➔ Ubah Kamera dari "Blokir" menjadi <strong className="text-emerald-400">"Izinkan" (Allow)</strong> ➔ Muat ulang halaman.
                        </p>
                        <p>
                          <strong className="text-amber-300">2. Safari (iPhone / iPad):</strong> Buka <strong className="text-white">Pengaturan iOS</strong> ➔ Safari ➔ Kamera ➔ Pilih <strong className="text-emerald-400">"Izinkan"</strong>.
                        </p>
                        <p>
                          <strong className="text-amber-300">3. Mode Pratinjau / Frame:</strong> Buka aplikasi di tab baru agar kamera tidak dibatasi oleh iframe.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col w-full gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => requestCameraAccess()}
                        disabled={isRequestingPermission}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRequestingPermission ? 'animate-spin' : ''}`} />
                        <span>{isRequestingPermission ? 'Meminta Akses Kamera...' : 'Minta Ulang Izin Kamera'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="w-full py-2 px-3 bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-xs rounded-xl border border-blue-500/50 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        title="Buka aplikasi langsung di tab baru browser untuk mengatasi batasan frame / sandbox"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
                        <span>Buka Aplikasi di Tab Baru</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPermissionGuide(false);
                          setCameraPermissionStatus('prompt');
                          setIsStartingCamera(false);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 underline mt-0.5 cursor-pointer"
                      >
                        Tutup Panduan & Coba Mulai Lagi
                      </button>
                    </div>
                  </div>
                ) : isStartingCamera ? (
                  <div className="flex flex-col items-center space-y-3.5 max-w-xs">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shadow-lg animate-pulse">
                        <Camera className="w-8 h-8 text-cyan-400" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-slate-950"></span>
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm sm:text-base flex items-center justify-center gap-1.5">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Menghubungkan Kamera...</span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        Meminta izin akses kamera dari browser. Harap klik <strong className="text-cyan-300">"Izinkan" (Allow)</strong> pada notifikasi izin browser yang muncul.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => requestCameraAccess()}
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer pt-1"
                    >
                      Buka Dialog Izin Ulang
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-cyan-400 border border-blue-500/30 flex items-center justify-center shadow-md">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">Kamera Siap Diaktifkan</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        Kamera Full HD dengan akselerasi GPU BarcodeDetector & Zoom Cerdas untuk QR kecil.
                      </p>
                      {cameraErrorMessage && (
                        <p className="text-xs text-rose-400 mt-1.5 max-w-xs font-semibold bg-rose-950/60 border border-rose-800/60 px-2 py-1 rounded-lg">
                          {cameraErrorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full max-w-xs pt-1">
                      <button
                        onClick={() => startCamera()}
                        className="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Mulai Scan Kamera (FHD)</span>
                      </button>
                      <div className="flex items-center justify-center gap-3 text-[11px] pt-1">
                        <button
                          type="button"
                          onClick={() => requestCameraAccess()}
                          className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Uji Izin Kamera</span>
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => setShowPermissionGuide(true)}
                          className="text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer flex items-center gap-1"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Panduan Izin</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Digital Zoom Control Bar for Small QR Codes */}
          {isCameraActive && (
            <div className="w-full mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <ZoomIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Zoom Kamera Cerdas:</span>
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { label: '1.0x', val: 1.0, desc: 'Standar' },
                  { label: '1.5x', val: 1.5, desc: 'Optimal' },
                  { label: '2.0x', val: 2.0, desc: 'QR Kecil (Saran)' },
                  { label: '2.5x', val: 2.5, desc: 'QR Mikro' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleApplyZoom(item.val)}
                    className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all border cursor-pointer ${
                      zoomLevel === item.val
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400/20'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={`Pilih perbesaran ${item.label} (${item.desc})`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Small QR Guidance Banner */}
          <div className="w-full mt-2.5 px-3 py-2 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-xl text-[11px] text-blue-950 dark:text-blue-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <span className="font-bold">Tips Membaca QR Kecil Instan (&lt;0.5 detik):</span> Tahan kartu pada jarak <span className="font-bold underline">25–35 cm</span> di tengah kotak kamera (jangan terlalu dekat agar tidak buram). Gunakan <span className="font-bold text-blue-700 dark:text-blue-300">Zoom 1.5x atau 2.0x</span> untuk pembacaan otomatis berkecepatan tinggi.
            </p>
          </div>

          {/* Camera Settings & Tuning Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 w-full px-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 border ${
                  soundEnabled
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
                title="Suara Bip/Nada Indikator Absensi"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Suara Beep (On)</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Suara (Mute)</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  Durasi Popup:
                </span>
                <select
                  value={modalDuration}
                  onChange={(e) => setModalDuration(Number(e.target.value))}
                  className="bg-transparent font-bold text-blue-600 dark:text-blue-400 focus:outline-none"
                  title="Durasi waktu tampilan popup informasi hasil scan"
                >
                  <option value={2}>2 Detik</option>
                  <option value={3}>3 Detik (Default)</option>
                  <option value={4}>4 Detik</option>
                  <option value={5}>5 Detik</option>
                </select>
              </div>

              <div className="flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <ShieldAlert className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  Jeda Anti-Ganda:
                </span>
                <select
                  value={debounceSeconds}
                  onChange={(e) => setDebounceSeconds(Number(e.target.value))}
                  className="bg-transparent font-bold text-blue-600 dark:text-blue-400 focus:outline-none"
                  title="Jeda waktu (detik) untuk mencegah kode QR yang sama ter-scan berulang kali"
                >
                  <option value={1}>1s</option>
                  <option value={2}>2s</option>
                  <option value={3}>3s (Saran)</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                FPS Frame:
              </span>
              {[10, 15, 20].map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => {
                    setScanFps(fps);
                    if (isCameraActive) startCamera();
                  }}
                  className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg border transition-all ${
                    scanFps === fps
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                  title={`${fps} Frame Per Second`}
                >
                  {fps} FPS
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setShowPermissionGuide(true);
                  if (isCameraActive) stopCamera();
                }}
                className="ml-1 px-2 py-0.5 text-[10px] font-extrabold rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-all flex items-center gap-1 cursor-pointer"
                title="Bantuan & Solusi jika izin kamera diblokir atau gagal dibuka"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Bantuan Izin Kamera</span>
              </button>
            </div>
          </div>

          {/* Hardware Scanner, USB RFID Reader & Web NFC Card */}
          <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>Reader RFID USB, Web NFC & Barcode Scanner</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <CreditCard className="w-3 h-3" />
                  <span>USB RFID Plug & Play Aktif</span>
                </span>
                {hasNfcSupport && (
                  <button
                    type="button"
                    onClick={toggleWebNfc}
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                      isNfcActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm animate-pulse'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100'
                    }`}
                    title="Aktifkan sensor Web NFC perangkat (misal: HP Android)"
                  >
                    <Radio className="w-3 h-3" />
                    <span>{isNfcActive ? 'NFC Sensor Aktif' : 'NFC HP Siaga'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Hardware Scanner, USB RFID Reader & Autocomplete Presensi Manual */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  <span>Reader RFID USB, Web NFC & Presensi Manual Siswa</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    <CreditCard className="w-3 h-3" />
                    <span>USB RFID Plug & Play Aktif</span>
                  </span>
                  {hasNfcSupport && (
                    <button
                      type="button"
                      onClick={toggleWebNfc}
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                        isNfcActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm animate-pulse'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100'
                      }`}
                      title="Aktifkan sensor Web NFC perangkat (misal: HP Android)"
                    >
                      <Radio className="w-3 h-3" />
                      <span>{isNfcActive ? 'NFC Sensor Aktif' : 'NFC HP Siaga'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Input with Autocomplete Dropdown & Quick Dialog */}
              <div className="relative">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (focusedSuggestionIndex >= 0 && suggestions[focusedSuggestionIndex]) {
                      const selected = suggestions[focusedSuggestionIndex];
                      if ('nip' in selected) {
                        handleSelectTeacherForManualAttendance(selected as Teacher);
                      } else {
                        handleSelectStudentForManualAttendance(selected as Student);
                      }
                      return;
                    }

                    if (manualInput.trim()) {
                      processScannedCode(manualInput.trim(), {
                        scanMethod: markAsForgotCard ? 'Manual' : undefined,
                        isManualForgotCard: markAsForgotCard,
                        customNote: markAsForgotCard ? 'Presensi Manual (Lupa Bawa ID Card)' : undefined,
                      });
                      setManualInput('');
                      setShowSuggestions(false);
                    }
                  }}
                  className="flex gap-2 items-center"
                >
                  <div className="relative flex-1">
                    <input
                      ref={manualInputRef}
                      type="text"
                      value={manualInput}
                      onFocus={() => {
                        if (manualInput.trim().length > 0) setShowSuggestions(true);
                      }}
                      onChange={(e) => {
                        setManualInput(e.target.value);
                        setShowSuggestions(true);
                        setFocusedSuggestionIndex(-1);
                      }}
                      onKeyDown={(e) => {
                        if (showSuggestions && suggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setFocusedSuggestionIndex((prev) =>
                              prev < suggestions.length - 1 ? prev + 1 : 0
                            );
                            return;
                          }
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setFocusedSuggestionIndex((prev) =>
                              prev > 0 ? prev - 1 : suggestions.length - 1
                            );
                            return;
                          }
                          if (e.key === 'Escape') {
                            setShowSuggestions(false);
                            return;
                          }
                        }
                      }}
                      placeholder={
                        scanTargetMode === 'guru'
                          ? 'Tempelkan Kartu RFID / Ketik Nama Guru atau NIP...'
                          : 'Tempelkan Kartu RFID / Ketik Nama Siswa, NISN, atau Kelas...'
                      }
                      className="w-full pl-9 pr-9 py-2.5 text-xs font-medium border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-xs transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    {manualInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualInput('');
                          setShowSuggestions(false);
                          manualInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Proses langsung kode / nama yang diketik"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Proses</span>
                  </button>

                  {/* Button to open dedicated Forgotten Card Dialog */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotCardModal(true);
                      setForgotCardSearch('');
                    }}
                    className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Cari dan pilih siswa yang lupa membawa ID Card dengan filter kelas"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Daftar Lupa Kartu</span>
                    <span className="sm:hidden">Lupa Kartu</span>
                  </button>
                </form>

                {/* Floating Autocomplete Suggestions Panel */}
                {showSuggestions && manualInput.trim().length > 0 && (
                  <div
                    ref={suggestionBoxRef}
                    className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span>
                        Pilihan Hasil Pencarian ({suggestions.length} Ditemukan)
                      </span>
                      <span className="text-[9px] lowercase font-normal">
                        Gunakan ↑↓ panah & tekan Enter
                      </span>
                    </div>

                    {suggestions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          Tidak ada {scanTargetMode === 'guru' ? 'guru' : 'siswa'} yang cocok dengan "{manualInput}".
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Pastikan ejaan nama atau nomor NISN/NIP sudah benar, atau buka menu "Daftar Lupa Kartu".
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                        {suggestions.map((item, idx) => {
                          const isStudent = 'kelas' in item;
                          const student = isStudent ? (item as Student) : null;
                          const teacher = !isStudent ? (item as Teacher) : null;
                          const isFocused = idx === focusedSuggestionIndex;

                          const statusInfo = isStudent
                            ? getStudentAttendanceStatusToday(student!)
                            : getTeacherAttendanceStatusToday(teacher!);

                          return (
                            <div
                              key={item.id}
                              onMouseEnter={() => setFocusedSuggestionIndex(idx)}
                              className={`p-2.5 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                                isFocused
                                  ? 'bg-blue-50 dark:bg-blue-950/50'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <div
                                onClick={() => {
                                  if (isStudent) {
                                    handleSelectStudentForManualAttendance(student!);
                                  } else {
                                    handleSelectTeacherForManualAttendance(teacher!);
                                  }
                                }}
                                className="flex items-center gap-2.5 flex-1 min-w-0"
                              >
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200 dark:border-blue-800">
                                  {item.nama.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                      {highlightMatch(item.nama, manualInput)}
                                    </span>
                                    {isStudent && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                                        {highlightMatch(student!.kelas, manualInput)}
                                      </span>
                                    )}
                                    {!isStudent && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 shrink-0">
                                        {teacher!.jabatan}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span>
                                      {isStudent ? 'NISN: ' : 'NIP: '}
                                      <span className="font-mono">
                                        {highlightMatch(
                                          (isStudent ? student!.nisn : teacher!.nip) || '-',
                                          manualInput
                                        )}
                                      </span>
                                    </span>
                                    <span>•</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded-full font-bold border text-[9px] ${statusInfo.color}`}
                                    >
                                      {statusInfo.badgeText}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons for this item */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {scanTypeMode === 'Auto' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isStudent) {
                                          handleSelectStudentForManualAttendance(student!, 'Masuk');
                                        } else {
                                          handleSelectTeacherForManualAttendance(teacher!, 'Masuk');
                                        }
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                      title="Presensi Manual Masuk"
                                    >
                                      <LogIn className="w-3 h-3" />
                                      <span>Masuk</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isStudent) {
                                          handleSelectStudentForManualAttendance(student!, 'Pulang');
                                        } else {
                                          handleSelectTeacherForManualAttendance(teacher!, 'Pulang');
                                        }
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                      title="Presensi Manual Pulang"
                                    >
                                      <LogOut className="w-3 h-3" />
                                      <span>Pulang</span>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isStudent) {
                                        handleSelectStudentForManualAttendance(student!);
                                      } else {
                                        handleSelectTeacherForManualAttendance(teacher!);
                                      }
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                    title={`Presensi Manual (${scanTypeMode.toUpperCase()})`}
                                  >
                                    <span>Pilih ({scanTypeMode})</span>
                                    <ArrowRight className="w-3 h-3" />
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
              </div>

              {/* Option Checkbox for Forgotten Card */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={markAsForgotCard}
                    onChange={(e) => setMarkAsForgotCard(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                  />
                  <span>
                    Beri tanda otomatis sebagai <span className="font-bold text-amber-700 dark:text-amber-300">"Presensi Manual (Lupa Bawa ID Card)"</span>
                  </span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Total Siswa: {studentsList.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Realtime Output Panel & Session Stream */}
        <div className="lg:col-span-5 space-y-4">
          {/* Latest Scan Result Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>
                  Hasil Scan Terakhir ({scanTargetMode === 'guru' ? 'Guru' : 'Siswa'})
                </span>
              </span>
              {scanResult && (
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                  {scanResult.timestamp}
                </span>
              )}
            </h3>

            {scanResult ? (
              <div
                className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                  scanResult.success
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                    : scanResult.isDuplicate
                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                    : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    {scanResult.success ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : scanResult.isDuplicate ? (
                      <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-sm uppercase tracking-tight">
                          {scanResult.success
                            ? 'ABSENSI BERHASIL'
                            : scanResult.isDuplicate
                            ? 'SCAN GANDA DITOLAK'
                            : 'SCAN DITOLAK'}
                        </h4>
                        {scanResult.isDuplicate && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 text-white rounded uppercase tracking-wider">
                            Duplikat Dicegah
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
                        {scanResult.message}
                      </p>
                    </div>
                  </div>

                  {/* Teacher Result */}
                  {scanResult.teacher && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Nama Guru:</span>
                        <span className="font-extrabold text-slate-900 dark:text-white uppercase">
                          {scanResult.teacher.nama}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">NIP / Jabatan:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          <span className="font-mono font-bold text-sky-800 dark:text-sky-300">
                            {scanResult.teacher.nip}
                          </span>{' '}
                          • {scanResult.teacher.jabatan}
                        </span>
                      </div>

                      {scanResult.type && (
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">
                            Status & Jenis:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                                scanResult.type === 'Masuk'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                              }`}
                            >
                              {scanResult.type.toUpperCase()}
                            </span>
                            {scanResult.status && (
                              <span
                                className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                                  scanResult.status === 'Hadir'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                                }`}
                              >
                                {scanResult.status.toUpperCase()}
                              </span>
                            )}
                            <span
                              className={`font-extrabold text-[9px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 border ${
                                scanResult.scanMethod === 'Manual'
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                  : scanResult.scanMethod === 'RFID'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {scanResult.scanMethod === 'Manual' ? (
                                <>
                                  <UserCheck className="w-2.5 h-2.5" />
                                  <span>MANUAL (LUPA KARTU)</span>
                                </>
                              ) : scanResult.scanMethod === 'RFID' ? (
                                <>
                                  <CreditCard className="w-2.5 h-2.5" />
                                  <span>RFID Card</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-2.5 h-2.5" />
                                  <span>QR Code</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {scanResult.teacherRecord?.terlambatMenit &&
                      scanResult.teacherRecord.terlambatMenit > 0 ? (
                        <div className="flex justify-between items-center py-1 bg-amber-100/80 dark:bg-amber-900/40 px-2 rounded-lg border border-amber-300 dark:border-amber-700">
                          <span className="text-amber-800 dark:text-amber-300 font-bold">
                            Terlambat:
                          </span>
                          <span className="font-extrabold text-amber-950 dark:text-amber-200">
                            +{scanResult.teacherRecord.terlambatMenit} Menit
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Student Result */}
                  {scanResult.student && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Nama Siswa:</span>
                        <span className="font-extrabold text-slate-900 dark:text-white uppercase">
                          {scanResult.student.nama}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Kelas / NISN:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {scanResult.student.kelas} •{' '}
                          <span className="font-mono">{scanResult.student.nisn}</span>
                        </span>
                      </div>

                      {scanResult.type && (
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">
                            Status & Jenis:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                                scanResult.type === 'Masuk'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                              }`}
                            >
                              {scanResult.type.toUpperCase()}
                            </span>
                            {scanResult.status && (
                              <span
                                className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                                  scanResult.status === 'Hadir'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                                }`}
                              >
                                {scanResult.status.toUpperCase()}
                              </span>
                            )}
                            <span
                              className={`font-extrabold text-[9px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 border ${
                                scanResult.scanMethod === 'Manual'
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                  : scanResult.scanMethod === 'RFID'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {scanResult.scanMethod === 'Manual' ? (
                                <>
                                  <UserCheck className="w-2.5 h-2.5" />
                                  <span>MANUAL (LUPA KARTU)</span>
                                </>
                              ) : scanResult.scanMethod === 'RFID' ? (
                                <>
                                  <CreditCard className="w-2.5 h-2.5" />
                                  <span>RFID Card</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-2.5 h-2.5" />
                                  <span>QR Code</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {scanResult.record?.catatan && (
                        <div className="flex justify-between items-center py-0.5 text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Keterangan:</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-300 italic">
                            {scanResult.record.catatan}
                          </span>
                        </div>
                      )}

                      {scanResult.record?.terlambatMenit &&
                      scanResult.record.terlambatMenit > 0 ? (
                        <div className="flex justify-between items-center py-1 bg-amber-100/80 dark:bg-amber-900/40 px-2 rounded-lg border border-amber-300 dark:border-amber-700">
                          <span className="text-amber-800 dark:text-amber-300 font-bold">
                            Terlambat:
                          </span>
                          <span className="font-extrabold text-amber-950 dark:text-amber-200">
                            {formatLateDuration(scanResult.record.terlambatMenit)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Network sync indicator in result card */}
                {scanResult.isOffline ? (
                  <div className="mt-3 p-2.5 bg-amber-100/90 dark:bg-amber-950/70 rounded-xl border border-amber-300 dark:border-amber-700/80 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                    <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-[10px] uppercase tracking-wider block">Mode Offline: Disimpan di Cache Lokal</span>
                      <span className="text-[11px] text-slate-700 dark:text-slate-300">
                        Koneksi internet terputus. Presensi diamankan di memori lokal dan akan disinkronkan otomatis ke database cloud saat online.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-bold">
                    <Wifi className="w-3 h-3 text-emerald-500" />
                    <span>Tersinkronisasi langsung dengan Database Cloud Supabase PostgreSQL</span>
                  </div>
                )}

                {/* Send WhatsApp Notification Option for Students */}
                {scanResult.student && scanResult.success && (
                  <button
                    onClick={() => {
                      const s = scanResult.student!;
                      let phone = s.no_hp_ortu;
                      if (!phone) {
                        phone =
                          prompt(
                            `Masukkan No WhatsApp OrtU/Siswa ${s.nama}:`,
                            '08123456789'
                          ) || undefined;
                        if (phone && phone.trim()) {
                          store.updateStudent(s.id, { no_hp_ortu: phone.trim() });
                          s.no_hp_ortu = phone.trim();
                        }
                      }
                      if (phone) {
                        const schoolSettings = store.getSettings();
                        let template: string | undefined;
                        if (scanResult.status === 'Hadir')
                          template = schoolSettings.waTemplateHadir;
                        else if (scanResult.status === 'Terlambat')
                          template = schoolSettings.waTemplateTerlambat;

                        const schoolName = schoolSettings.schoolName || 'SMA NEGERI 15 AMBON';
                        const waMsg = generateWhatsAppMessage(
                          s,
                          scanResult.record,
                          schoolName,
                          template
                        );
                        const waUrl = getWhatsAppLink(phone, waMsg);
                        window.open(waUrl, '_blank');
                      }
                    }}
                    className="mt-3 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim WA OrtU ({scanResult.student.no_hp_ortu || 'Input No HP'})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 dark:text-slate-500 space-y-1">
                <QrCode className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-bold text-xs text-slate-600 dark:text-slate-300">
                  {scanTargetMode === 'guru'
                    ? 'Arahkan Kartu NIP Guru ke Kamera'
                    : 'Arahkan QR Siswa ke Kamera'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Hasil absensi akan otomatis diperbarui secara instant di sini.
                </p>
              </div>
            )}
          </div>

          {/* Session Stream / Live Feed List */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-500" />
                <span>Riwayat Scan Sesi Ini ({scanFeed.length})</span>
              </span>

              {scanFeed.length > 0 && (
                <button
                  onClick={() => setScanFeed([])}
                  className="text-[10px] text-slate-400 hover:text-red-500 font-bold"
                >
                  Bersihkan
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {scanFeed.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4 italic">
                  Belum ada riwayat scan pada sesi ini.
                </p>
              ) : (
                scanFeed.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                      item.success
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        : item.isDuplicate
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                        : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {item.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : item.isDuplicate ? (
                        <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                            {item.teacher
                              ? item.teacher.nama
                              : item.student
                              ? item.student.nama
                              : item.scannedCode}
                          </span>
                          {item.isOffline && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-200/80 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-0.5">
                              <WifiOff className="w-2.5 h-2.5" />
                              <span>Lokal</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                          {item.teacher
                            ? `NIP: ${item.teacher.nip} • ${item.teacher.jabatan}`
                            : item.student
                            ? `${item.student.kelas} • ${item.student.nisn}`
                            : item.message}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                        {item.timestamp.split(' ')[0]}
                      </span>
                      {item.status ? (
                        <span
                          className={`inline-block text-[9px] font-black px-1.5 py-0.2 rounded ${
                            item.status === 'Hadir'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      ) : item.isDuplicate ? (
                        <span className="inline-block text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                          Ditolak
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pop-Up Modal Notifikasi (Aktif durasi 3 detik saat mode standar) */}
      {showModal && scanResult && !rapidQueueMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            {/* Header Banner */}
            <div
              className={`p-6 text-white relative overflow-hidden text-center ${
                scanResult.success
                  ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700'
                  : scanResult.isDuplicate
                  ? 'bg-gradient-to-br from-rose-600 via-red-600 to-amber-700'
                  : 'bg-gradient-to-br from-amber-600 via-orange-600 to-red-700'
              }`}
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                  {scanResult.success ? (
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  ) : scanResult.isDuplicate ? (
                    <ShieldAlert className="w-10 h-10 text-white animate-bounce" />
                  ) : (
                    <AlertTriangle className="w-10 h-10 text-amber-200" />
                  )}
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-extrabold uppercase tracking-wider mb-1">
                {scanResult.success ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>PRESENSI BERHASIL</span>
                  </>
                ) : scanResult.isDuplicate ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-white" />
                    <span>SCAN GANDA DITOLAK</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>PERINGATAN ABSENSI</span>
                  </>
                )}
              </div>

              <h3 className="text-xl font-black uppercase tracking-tight">
                {scanResult.success
                  ? 'SCAN QR BERHASIL'
                  : scanResult.isDuplicate
                  ? 'PRESENSI SUDAH ADA'
                  : 'NOTIFIKASI SISTEM'}
              </h3>
              <p className="text-xs text-white/95 font-medium mt-1 px-2">{scanResult.message}</p>
            </div>

            {/* Body Details */}
            <div className="p-6 space-y-4">
              {scanResult.teacher ? (
                <>
                  <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                      Nama Guru / Pegawai
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {scanResult.teacher.nama}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-sky-50/80 dark:bg-sky-950/50 p-3 rounded-2xl border border-sky-200/80 dark:border-sky-800/60 text-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-0.5">
                        NIP
                      </span>
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        {scanResult.teacher.nip}
                      </span>
                    </div>

                    <div className="bg-emerald-50/80 dark:bg-emerald-950/50 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 text-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
                        Jabatan
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                        {scanResult.teacher.jabatan}
                      </span>
                    </div>
                  </div>
                </>
              ) : scanResult.student ? (
                <>
                  <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                      Nama Siswa
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {scanResult.student.nama}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50/80 dark:bg-blue-950/50 p-3 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 text-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                        NISN
                      </span>
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        {scanResult.student.nisn}
                      </span>
                    </div>

                    <div className="bg-emerald-50/80 dark:bg-emerald-950/50 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 text-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
                        Kelas
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {scanResult.student.kelas}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3 text-left">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        {scanResult.scanMethod === 'RFID' ? (
                          <>
                            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Daftarkan Kartu RFID</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>Hubungkan Kode QR</span>
                          </>
                        )}
                      </span>
                      <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-bold">
                        {scanResult.scannedCode || lastScannedQR}
                      </span>
                    </div>

                    {/* Choose Target Type if in Auto or specific mode */}
                    {(scanTargetMode === 'auto' || scanTargetMode === 'siswa') && (
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          1. Hubungkan ke Siswa
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedStudentForQR}
                            onChange={(e) => setSelectedStudentForQR(e.target.value)}
                            className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl font-medium"
                          >
                            <option value="">-- Pilih Nama Siswa --</option>
                            {studentsList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nama} ({s.kelas} - NISN: {s.nisn})
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={!selectedStudentForQR}
                            onClick={() => {
                              const code = scanResult.scannedCode || lastScannedQR;
                              if (scanResult.scanMethod === 'RFID') {
                                handleAssignRfidToStudent(code, selectedStudentForQR);
                              } else {
                                handleConnectQRToStudent(code, selectedStudentForQR);
                              }
                            }}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow whitespace-nowrap cursor-pointer"
                          >
                            Hubungkan Siswa
                          </button>
                        </div>
                      </div>
                    )}

                    {(scanTargetMode === 'auto' || scanTargetMode === 'guru') && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          2. Hubungkan ke Guru / Tenaga Pendidik
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedTeacherForQR}
                            onChange={(e) => setSelectedTeacherForQR(e.target.value)}
                            className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl font-medium"
                          >
                            <option value="">-- Pilih Nama Guru / NIP --</option>
                            {teachersList.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.nama} (NIP: {t.nip}) - {t.jabatan}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={!selectedTeacherForQR}
                            onClick={() => {
                              const code = scanResult.scannedCode || lastScannedQR;
                              if (scanResult.scanMethod === 'RFID') {
                                handleAssignRfidToTeacher(code, selectedTeacherForQR);
                              } else {
                                handleConnectQRToTeacher(code, selectedTeacherForQR);
                              }
                            }}
                            className="px-3.5 py-2 bg-sky-700 hover:bg-sky-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow whitespace-nowrap cursor-pointer"
                          >
                            Hubungkan Guru
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Offline Storage Notice in Modal */}
              {scanResult.isOffline && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-300 dark:border-amber-700 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold">
                    <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>Tersimpan di Cache Lokal (Mode Offline)</span>
                  </div>
                  <p className="leading-relaxed text-[10.5px]">
                    Koneksi internet terputus saat pemindaian. Data presensi disimpan di memori browser dan akan otomatis disinkronkan ke Supabase Cloud saat jaringan pulih.
                  </p>
                </div>
              )}

              {/* Duplicate Information Explainer */}
              {scanResult.isDuplicate && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold">
                    <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Pencegahan Scan Ganda Otomatis</span>
                  </div>
                  <p className="leading-relaxed">
                    Sistem mendeteksi dan menolak pemindaian berulang untuk menjaga integritas dan kevalidan data presensi harian.
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowModal(false)}
                className={`w-full py-3 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  scanResult.isDuplicate
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                <span>Tutup & Lanjutkan Scan ({countdown}s)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Quick Search & Manual Attendance for Students without ID Card */}
      {showForgotCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold leading-tight">
                    Presensi Manual Siswa (Lupa ID Card)
                  </h3>
                  <p className="text-xs text-amber-100 font-medium">
                    Pilih siswa langsung untuk mencatat kehadiran tanpa kartu fisik QR/RFID.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotCardModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Tutup jendela"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Controls Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Search query */}
                <div className="sm:col-span-7 relative">
                  <input
                    type="text"
                    value={forgotCardSearch}
                    onChange={(e) => setForgotCardSearch(e.target.value)}
                    placeholder="Ketik nama siswa atau NISN..."
                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  {forgotCardSearch && (
                    <button
                      type="button"
                      onClick={() => setForgotCardSearch('')}
                      className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Kelas */}
                <div className="sm:col-span-5 relative">
                  <select
                    value={forgotCardClassFilter}
                    onChange={(e) => setForgotCardClassFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Semua">Semua Kelas ({studentsList.length})</option>
                    {availableClasses.map((cls) => {
                      const count = studentsList.filter((s) => s.kelas === cls).length;
                      return (
                        <option key={cls} value={cls}>
                          Kelas {cls} ({count} siswa)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setForgotCardStatusFilter('belum')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      forgotCardStatusFilter === 'belum'
                        ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Belum Presensi Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotCardStatusFilter('semua')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      forgotCardStatusFilter === 'semua'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Semua Siswa
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{filteredForgotCardStudents.length}</span> siswa
                </div>
              </div>
            </div>

            {/* Students List Table / Cards */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredForgotCardStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                  <UserCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    Tidak ada siswa yang sesuai kriteria filter
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {forgotCardStatusFilter === 'belum'
                      ? 'Semua siswa di kelas ini mungkin sudah melakukan presensi hari ini, atau periksa kembali kata kunci pencarian.'
                      : 'Periksa kembali kata kunci pencarian nama atau filter kelas.'}
                  </p>
                  {forgotCardStatusFilter === 'belum' && (
                    <button
                      type="button"
                      onClick={() => setForgotCardStatusFilter('semua')}
                      className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 underline cursor-pointer"
                    >
                      Tampilkan Semua Siswa Kelas Ini
                    </button>
                  )}
                </div>
              ) : (
                filteredForgotCardStudents.map((student) => {
                  const statusInfo = getStudentAttendanceStatusToday(student);

                  return (
                    <div
                      key={student.id}
                      className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950 dark:to-amber-900 text-amber-800 dark:text-amber-200 font-black text-sm flex items-center justify-center shrink-0 border border-amber-300/60 dark:border-amber-700">
                          {student.nama.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {highlightMatch(student.nama, forgotCardSearch)}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                              {student.kelas}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>
                              NISN: <span className="font-mono font-medium">{highlightMatch(student.nisn, forgotCardSearch)}</span>
                            </span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.color}`}>
                              {statusInfo.badgeText}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {statusInfo.canScanMasuk && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectStudentForManualAttendance(student, 'Masuk');
                              setShowForgotCardModal(false);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            title="Presensi Masuk Siswa (Lupa Kartu)"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Presensi Masuk</span>
                          </button>
                        )}

                        {statusInfo.canScanPulang && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectStudentForManualAttendance(student, 'Pulang');
                              setShowForgotCardModal(false);
                            }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            title="Presensi Pulang Siswa (Lupa Kartu)"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Presensi Pulang</span>
                          </button>
                        )}

                        {statusInfo.isComplete && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                              Sudah Lengkap
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectStudentForManualAttendance(student);
                                setShowForgotCardModal(false);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                              title="Update Ulang Presensi"
                            >
                              Ubah
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Presensi akan dicatat dengan metode <span className="font-bold text-amber-700 dark:text-amber-300">Manual (Lupa ID Card)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowForgotCardModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
