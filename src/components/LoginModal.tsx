import React, { useState } from 'react';
import { User } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { store } from '../lib/store';
import { signInWithGoogle, sendPasswordResetLink } from '../lib/firebase';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  ShieldCheck,
  GraduationCap,
  CheckCircle2,
  X,
  Mail,
  Send,
  AlertCircle,
} from 'lucide-react';

interface LoginModalProps {
  onLogin: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Forgot Password State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Silakan masukkan Username atau Email Anda.');
      return;
    }
    if (!password.trim()) {
      setError('Silakan masukkan Kata Sandi.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await store.loginWithCredentials(identifier, password);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.message || 'Login gagal. Periksa kembali username dan password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);

    try {
      const gUser = await signInWithGoogle();
      const result = await store.loginWithGoogleUser(gUser);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.message || 'Gagal masuk dengan Google.');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal autentikasi Google. Silakan gunakan Username & Password.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    setForgotResult(null);

    try {
      // 1. Try Firebase Auth password reset
      const res = await sendPasswordResetLink(forgotEmail.trim());
      if (res.success) {
        setForgotResult({ success: true, message: res.message });
      } else {
        // Check if email exists in database store
        const dbUsers = store.getUsers();
        const found = dbUsers.find(
          (u) =>
            (u.email && u.email.toLowerCase() === forgotEmail.trim().toLowerCase()) ||
            (u.username && u.username.toLowerCase() === forgotEmail.trim().toLowerCase())
        );

        if (found) {
          setForgotResult({
            success: true,
            message: `Akun "${found.name}" (@${found.username}) ditemukan dalam database lokal. Silakan hubungi Administrator / Super Admin untuk mereset kata sandi Anda melalui panel Manajemen Akun.`,
          });
        } else {
          setForgotResult({
            success: false,
            message:
              res.message ||
              'Email/Username tidak ditemukan. Jika Anda staf/guru yang dibuatkan akun secara manual, silakan hubungi Administrator sekolah.',
          });
        }
      }
    } catch (err: any) {
      setForgotResult({
        success: false,
        message: err?.message || 'Gagal memproses permintaan reset kata sandi.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[65%] h-[65%] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 my-4">
        <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/80 border border-slate-800/80 overflow-hidden ring-1 ring-white/10">
          
          {/* Header Card */}
          <div className="pt-8 pb-6 px-6 sm:px-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 flex justify-center mb-4">
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-md">
                <SchoolLogo className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-md" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 rounded-full border border-blue-400/30 text-cyan-300 text-[11px] font-extrabold mb-2">
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
              <span>SMA NEGERI 15 AMBON</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white">
              <span className="bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
                NEXA15
              </span>{' '}
              <span className="text-cyan-400 text-lg font-bold">SMART</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Sistem Manajemen Presensi & Disiplin Digital Terpadu
            </p>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8 pt-2 space-y-4">
            
            {/* Error Message */}
            {error && (
              <div className="p-3.5 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl flex items-start gap-2.5 animate-in fade-in duration-200">
                <span className="font-bold text-rose-400 text-sm mt-[-1px]">⚠️</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Password Login Form */}
            <form onSubmit={handlePasswordLogin} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username / Email / NIP
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Contoh: admin atau nama_guru"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(identifier.includes('@') ? identifier : '');
                      setForgotResult(null);
                      setIsForgotModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    Lupa Kata Sandi?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    className="w-full pl-10 pr-11 py-3 bg-slate-800/80 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Aplikasi</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Atau
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {isGoogleLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  <span>Menghubungkan Akun Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                    <path fill="none" d="M1 1h22v22H1z" />
                  </svg>
                  <span>Masuk dengan Akun Google</span>
                </>
              )}
            </button>

            {/* Security Notice Footer */}
            <div className="pt-2 text-center text-[10px] text-slate-500 font-medium leading-relaxed border-t border-slate-800/60">
              Sistem terenkripsi aman. Akun dikelola secara mandiri oleh Administrator di Database.
            </div>

          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Pemulihan Kata Sandi</h3>
                  <p className="text-[11px] text-slate-400">Reset kata sandi akun NEXA15 SMART</p>
                </div>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleForgotPasswordSubmit} autoComplete="off" className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Alamat Email / Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Masukkan email terdaftar atau username"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                {forgotResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                      forgotResult.success
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {forgotResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    )}
                    <span className="leading-relaxed">{forgotResult.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl shadow-md shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Tautan / Cek Akun</span>
                    </>
                  )}
                </button>
              </form>

              {/* Admin Contact Help */}
              <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2 text-xs text-slate-300">
                <p className="font-extrabold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Bantuan Akun Manual Database
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Jika akun Anda dibuat langsung oleh Staf TU atau Administrator sekolah, Admin dapat mereset kata sandi Anda secara langsung tanpa email di panel <strong>Manajemen Akun</strong>.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginModal;


