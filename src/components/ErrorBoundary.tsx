import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('NEXA15 Uncaught React Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('nexa15_user_v3');
      sessionStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 rounded-2xl mx-auto flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h1 className="text-xl font-black text-white">Terjadi Kendala Memuat Aplikasi</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sistem mendeteksi adanya kendala sementara pada tampilan peramban. Silakan muat ulang atau pulihkan sesi aplikasi.
            </p>

            {this.state.error && (
              <div className="text-left bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-rose-400 font-mono break-words overflow-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang</span>
              </button>
              <button
                onClick={this.handleResetCache}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Reset Sesi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
