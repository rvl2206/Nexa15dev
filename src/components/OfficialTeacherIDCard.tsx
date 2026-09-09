import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { SchoolLogo } from './SchoolLogo';
import { store } from '../lib/store';
import {
  User,
  Hash,
  Briefcase,
  ShieldCheck,
  Building2,
  Star,
  ClipboardList,
  MapPin,
  Sparkles,
} from 'lucide-react';

export type CardSizeOption = 'CR80' | 'B2' | 'B1';

export const TEACHER_CARD_SIZES: Record<
  CardSizeOption,
  {
    name: string;
    badge: string;
    widthMM: number;
    heightMM: number;
    widthPx: number;
    heightPx: number;
  }
> = {
  CR80: {
    name: 'CR80 Standar KTP / ATM (53.98 x 85.60 mm)',
    badge: 'CR80 (54 x 85.6 MM)',
    widthMM: 53.98,
    heightMM: 85.6,
    widthPx: 204,
    heightPx: 324,
  },
  B2: {
    name: 'Plastik B2 (70 x 100 mm / 7 x 10 cm)',
    badge: 'B2 (70 x 100 MM)',
    widthMM: 70,
    heightMM: 100,
    widthPx: 265,
    heightPx: 378,
  },
  B1: {
    name: 'Plastik B1 (55 x 90 mm / 5.5 x 9 cm)',
    badge: 'B1 (55 x 90 MM)',
    widthMM: 55,
    heightMM: 90,
    widthPx: 208,
    heightPx: 340,
  },
};

interface TeacherCardFrontProps {
  nama: string;
  nip: string;
  jabatan?: string;
  tahunAjaran?: string;
  schoolName?: string;
  schoolNpsn?: string;
  statusGuru?: string;
  qrValue?: string;
  cardSize?: CardSizeOption;
  isSelected?: boolean;
  onClick?: () => void;
  showCheckbox?: boolean;
  className?: string;
}

export const OfficialTeacherIDCardFront: React.FC<TeacherCardFrontProps> = ({
  nama,
  nip,
  jabatan,
  tahunAjaran = '2026/2027',
  schoolName,
  schoolNpsn,
  statusGuru = 'Guru & Tenaga Kependidikan',
  qrValue,
  cardSize = 'CR80',
  isSelected = true,
  onClick,
  showCheckbox = false,
  className = '',
}) => {
  const currentSize = TEACHER_CARD_SIZES[cardSize] || TEACHER_CARD_SIZES.CR80;
  const activeSchoolName = schoolName || store.getSettings().schoolName || 'SMA NEGERI 15 AMBON';
  const activeNpsn = schoolNpsn || store.getSettings().schoolNPSN || '69933068';
  const computedQr = qrValue || (nip ? `${activeNpsn}.${nip}` : 'SMANEGERI15AMBON_TEACHER_TEMPLATE');

  return (
    <div
      onClick={onClick}
      style={{
        width: `${currentSize.widthPx}px`,
        height: `${currentSize.heightPx}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1.5px solid #0284c7',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className={`shadow-md relative transition-all select-none print:shadow-none print:border-sky-600 ${
        showCheckbox && isSelected ? 'ring-2 ring-sky-600 ring-offset-1' : ''
      } ${className}`}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-sky-500/10 via-cyan-500/5 to-transparent rounded-full -mr-12 -mt-12 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-sky-500/10 to-transparent rounded-full -ml-10 -mb-10 pointer-events-none" />

      {/* Header Band with Dedicated Logo Frame */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-sky-900 text-white px-2.5 py-1.5 flex items-center gap-2 border-b border-sky-400/40 relative z-10">
        <div className="w-7 h-7 flex items-center justify-center overflow-hidden shrink-0">
          <SchoolLogo size={28} className="w-full h-full" />
        </div>
        <div className="leading-tight overflow-hidden flex-1">
          <p className="text-[6.5px] uppercase tracking-wider text-sky-300 font-semibold truncate">
            KARTU PRESENSI RESMI GURU
          </p>
          <p className="text-[8.5px] font-black tracking-tight text-white truncate">
            {activeSchoolName}
          </p>
          <p className="text-[6px] text-slate-300 truncate">
            NPSN: {activeNpsn}
          </p>
        </div>
      </div>

      {/* Main Body */}
      <div className="px-2.5 py-1 flex-1 flex flex-col justify-between items-center text-center relative z-10">
        {/* Badge Card Type */}
        <div className="inline-flex items-center gap-1 bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full text-[7px] font-bold border border-sky-300">
          <Briefcase className="w-2.5 h-2.5 text-sky-700" />
          <span>KARTU IDENTITAS GURU & TENDIK</span>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-1.5 rounded-xl border border-sky-300 shadow-sm flex flex-col items-center">
          <QRCodeSVG
            value={computedQr}
            size={currentSize.widthPx < 220 ? 80 : 96}
            level="M"
            includeMargin={false}
          />
          <span className="text-[6.5px] text-slate-500 font-mono mt-0.5 tracking-tight font-semibold">
            {nip || 'NIP -'}
          </span>
        </div>

        {/* Teacher Identity Block */}
        <div className="w-full bg-slate-50/80 rounded-lg p-1.5 border border-slate-200">
          <p className="text-[9px] font-black text-slate-900 leading-snug line-clamp-2">
            {nama || 'Nama Guru'}
          </p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span className="text-[7.5px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded border border-sky-300 truncate max-w-[170px]">
              {jabatan || 'Guru Mata Pelajaran'}
            </span>
          </div>
          <p className="text-[6.5px] text-slate-500 font-mono mt-0.5">
            NIP: <span className="font-bold text-slate-800">{nip || '-'}</span>
          </p>
        </div>
      </div>

      {/* Footer Strip */}
      <div className="bg-slate-900 text-white px-2 py-1 flex items-center justify-between text-[6px] border-t border-slate-700 relative z-10">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
          <span className="font-semibold text-slate-200">Presensi Digital</span>
        </div>
        <span className="text-slate-400 font-mono">TA {tahunAjaran}</span>
      </div>
    </div>
  );
};

interface TeacherCardBackProps {
  cardSize?: CardSizeOption;
  tahunAjaran?: string;
  className?: string;
}

export const OfficialTeacherIDCardBack: React.FC<TeacherCardBackProps> = ({
  cardSize = 'CR80',
  tahunAjaran = '2026/2027',
  className = '',
}) => {
  const currentSize = TEACHER_CARD_SIZES[cardSize] || TEACHER_CARD_SIZES.CR80;

  return (
    <div
      style={{
        width: `${currentSize.widthPx}px`,
        height: `${currentSize.heightPx}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: '16px',
        border: '1.5px solid #0284c7',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className={`shadow-md relative select-none print:shadow-none print:border-sky-600 ${className}`}
    >
      {/* Header */}
      <div className="bg-slate-900 text-white px-2.5 py-1.5 flex items-center justify-between border-b border-sky-400/30">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3 h-3 text-sky-400" />
          <span className="text-[7.5px] font-bold tracking-wide">TATA TERTIB & KETENTUAN</span>
        </div>
        <span className="text-[6.5px] text-sky-300 font-mono font-bold">NEXA15</span>
      </div>

      {/* Rules content */}
      <div className="p-2 flex-1 flex flex-col justify-between text-[6.5px] text-slate-700 leading-relaxed">
        <div className="space-y-1">
          <div className="flex items-start gap-1">
            <span className="font-bold text-sky-700 min-w-[8px]">1.</span>
            <span>Kartu ini adalah identitas resmi presensi digital Guru & Tendik di SMAN 15 Ambon.</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="font-bold text-sky-700 min-w-[8px]">2.</span>
            <span>Wajib di-scan pada mesin presensi saat hadir masuk dan kepulangan tugas.</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="font-bold text-sky-700 min-w-[8px]">3.</span>
            <span>Kode QR unik terhubung langsung dengan NIP di sistem informasi sekolah.</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="font-bold text-sky-700 min-w-[8px]">4.</span>
            <span>Dilarang menitipkan scan kartu kepada orang lain (Presensi Mandiri).</span>
          </div>
        </div>

        {/* Signature Area */}
        <div className="border-t border-slate-300 pt-1 flex flex-col items-center text-center">
          <p className="text-[6px] text-slate-500 font-semibold">Ambon, Kepala Sekolah</p>
          <div className="h-5 my-0.5 flex items-center justify-center">
            <span className="text-[6px] text-slate-400 italic">Cap & Tanda Tangan Digital</span>
          </div>
          <p className="text-[7px] font-bold text-slate-900">Drs. La Ode Alimin, M.Pd.</p>
          <p className="text-[5.5px] text-slate-600 font-mono">NIP. 196803151994031008</p>
        </div>
      </div>

      {/* Bottom info */}
      <div className="bg-sky-950 text-white px-2 py-0.5 flex items-center justify-between text-[5.5px] text-slate-300">
        <span>Jln. Dr. Leimena, Hative Besar</span>
        <span>Kota Ambon</span>
      </div>
    </div>
  );
};
