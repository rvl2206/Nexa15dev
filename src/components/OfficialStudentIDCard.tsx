import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { SchoolLogo } from './SchoolLogo';
import { store } from '../lib/store';
import {
  User,
  Hash,
  GraduationCap,
  Calendar,
  ShieldCheck,
  Building2,
  Star,
  ClipboardList,
  MapPin,
} from 'lucide-react';

export type CardSizeOption = 'CR80' | 'B2' | 'B1';

export const CARD_SIZES: Record<
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

interface CardFrontProps {
  nama: string;
  nisn: string;
  kelas: string;
  tahunAjaran?: string;
  schoolName?: string;
  statusSiswa?: string;
  qrValue?: string;
  cardSize?: CardSizeOption;
  isSelected?: boolean;
  onClick?: () => void;
  showCheckbox?: boolean;
  className?: string;
}

export const OfficialStudentIDCardFront: React.FC<CardFrontProps> = ({
  nama,
  nisn,
  kelas,
  tahunAjaran = '2026/2027',
  schoolName,
  statusSiswa = 'Siswa Aktif',
  qrValue,
  cardSize = 'CR80',
  isSelected = true,
  onClick,
  showCheckbox = false,
  className = '',
}) => {
  const currentSize = CARD_SIZES[cardSize] || CARD_SIZES.CR80;
  const activeSchoolName = schoolName || store.getSettings().schoolName || 'SMA NEGERI 15 AMBON';
  const schoolNpsn = store.getSettings().schoolNPSN || '69933068';
  const computedQr = qrValue || (nisn ? `${schoolNpsn}.${nisn}.${nama}` : 'SMANEGERI15AMBON_TEMPLATE');

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
        border: '1.5px solid #f59e0b',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className={`official-id-card shadow-md text-slate-900 transition-all select-none shrink-0 ${
        !isSelected ? 'opacity-40 hover:opacity-80 print:hidden' : ''
      } ${className}`}
    >
      {/* Checkbox for selection in Mass Print mode */}
      {showCheckbox && (
        <div className="absolute top-1.5 right-1.5 z-20 print:hidden">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-3.5 h-3.5 text-amber-500 rounded border-slate-700 focus:ring-amber-500 cursor-pointer"
          />
        </div>
      )}

      {/* TOP NAVY HEADER SECTION */}
      <div
        style={{
          backgroundColor: '#071a3d',
          color: '#ffffff',
          paddingTop: '6px',
          paddingBottom: '4px',
          paddingLeft: '8px',
          paddingRight: '8px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Gold corner accent lines */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '10px',
            height: '10px',
            borderTop: '1.5px solid #f59e0b',
            borderLeft: '1.5px solid #f59e0b',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '10px',
            height: '10px',
            borderTop: '1.5px solid #f59e0b',
            borderRight: '1.5px solid #f59e0b',
            pointerEvents: 'none',
          }}
        />

        {/* Dedicated School Logo Slot with Fixed Box */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px' }}>
          <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <SchoolLogo size={32} className="w-full h-full drop-shadow-sm" />
          </div>
        </div>

        {/* Titles */}
        <h2
          style={{
            fontSize: '9.5px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#ffffff',
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          KARTU ABSENSI DIGITAL
        </h2>
        <h3
          style={{
            fontSize: '8.5px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#f59e0b',
            marginTop: '1px',
            marginBottom: 0,
          }}
        >
          {activeSchoolName}
        </h3>
      </div>

      {/* MIDDLE SECTION - QR CODE & STUDENT DETAILS ON CLEAN WHITE */}
      <div
        style={{
          backgroundColor: '#ffffff',
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingTop: '3px',
          paddingBottom: '3px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          flex: 1,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <p
          style={{
            fontSize: '7px',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#071a3d',
            textAlign: 'center',
            margin: '0 0 2px 0',
          }}
        >
          SCAN UNTUK ABSENSI
        </p>

        <div
          style={{
            padding: '3px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1.5px solid #f59e0b',
            display: 'inline-block',
            lineHeight: 0,
          }}
        >
          <QRCodeSVG
            value={computedQr}
            size={68}
            level="M"
            includeMargin={false}
            fgColor="#071a3d"
            bgColor="#ffffff"
            style={{ display: 'block', borderRadius: '4px' }}
          />
        </div>

        {/* LOWER STUDENT INFO FIELDS */}
        <div style={{ width: '100%', marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {/* Row 1: Nama */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '7.5px', width: '100%' }}>
            <div
              style={{
                width: '13px',
                height: '13px',
                borderRadius: '3px',
                backgroundColor: '#071a3d',
                color: '#fde047',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginRight: '4px',
              }}
            >
              <User style={{ width: '8px', height: '8px' }} />
            </div>
            <span style={{ fontWeight: 900, color: '#071a3d', textTransform: 'uppercase', width: '52px', flexShrink: 0 }}>
              NAMA
            </span>
            <span style={{ fontWeight: 900, color: '#071a3d', marginRight: '3px' }}>:</span>
            <span
              style={{
                fontWeight: 900,
                color: '#0f172a',
                textTransform: 'uppercase',
                borderBottom: '1px solid #cbd5e1',
                flex: 1,
                paddingBottom: '1px',
                fontSize: '7.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {nama}
            </span>
          </div>

          {/* Row 2: NISN */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '7.5px', width: '100%' }}>
            <div
              style={{
                width: '13px',
                height: '13px',
                borderRadius: '3px',
                backgroundColor: '#071a3d',
                color: '#fde047',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginRight: '4px',
              }}
            >
              <Hash style={{ width: '8px', height: '8px' }} />
            </div>
            <span style={{ fontWeight: 900, color: '#071a3d', textTransform: 'uppercase', width: '52px', flexShrink: 0 }}>
              NISN
            </span>
            <span style={{ fontWeight: 900, color: '#071a3d', marginRight: '3px' }}>:</span>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '0.03em',
                borderBottom: '1px solid #cbd5e1',
                flex: 1,
                paddingBottom: '1px',
                fontSize: '7.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {nisn}
            </span>
          </div>

          {/* Row 3: KELAS */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '7.5px', width: '100%' }}>
            <div
              style={{
                width: '13px',
                height: '13px',
                borderRadius: '3px',
                backgroundColor: '#071a3d',
                color: '#fde047',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginRight: '4px',
              }}
            >
              <GraduationCap style={{ width: '8px', height: '8px' }} />
            </div>
            <span style={{ fontWeight: 900, color: '#071a3d', textTransform: 'uppercase', width: '52px', flexShrink: 0 }}>
              KELAS
            </span>
            <span style={{ fontWeight: 900, color: '#071a3d', marginRight: '3px' }}>:</span>
            <span
              style={{
                fontWeight: 900,
                color: '#0f172a',
                textTransform: 'uppercase',
                borderBottom: '1px solid #cbd5e1',
                flex: 1,
                paddingBottom: '1px',
                fontSize: '7.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {kelas}
            </span>
          </div>

          {/* Row 4: TAHUN AJARAN */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '7.5px', width: '100%' }}>
            <div
              style={{
                width: '13px',
                height: '13px',
                borderRadius: '3px',
                backgroundColor: '#071a3d',
                color: '#fde047',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginRight: '4px',
              }}
            >
              <Calendar style={{ width: '8px', height: '8px' }} />
            </div>
            <span style={{ fontWeight: 900, color: '#071a3d', textTransform: 'uppercase', width: '52px', flexShrink: 0 }}>
              THN AJAR
            </span>
            <span style={{ fontWeight: 900, color: '#071a3d', marginRight: '3px' }}>:</span>
            <span
              style={{
                fontWeight: 700,
                color: '#1e293b',
                textTransform: 'uppercase',
                borderBottom: '1px solid #cbd5e1',
                flex: 1,
                paddingBottom: '1px',
                fontSize: '7.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tahunAjaran}
            </span>
          </div>

          {/* Row 5: STATUS */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '7.5px', width: '100%' }}>
            <div
              style={{
                width: '13px',
                height: '13px',
                borderRadius: '3px',
                backgroundColor: '#071a3d',
                color: '#fde047',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginRight: '4px',
              }}
            >
              <ShieldCheck style={{ width: '8px', height: '8px' }} />
            </div>
            <span style={{ fontWeight: 900, color: '#071a3d', textTransform: 'uppercase', width: '52px', flexShrink: 0 }}>
              STATUS
            </span>
            <span style={{ fontWeight: 900, color: '#071a3d', marginRight: '3px' }}>:</span>
            <span
              style={{
                fontWeight: 900,
                color: '#047857',
                textTransform: 'uppercase',
                borderBottom: '1px solid #cbd5e1',
                flex: 1,
                paddingBottom: '1px',
                fontSize: '7.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {statusSiswa}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER SECTION WITH ANGULAR CHEVRON NOTCH */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0, pointerEvents: 'none', marginBottom: '-1px' }}>
          <svg
            viewBox="0 0 500 22"
            style={{ width: '100%', height: '10px', fill: '#071a3d' }}
            preserveAspectRatio="none"
          >
            <path d="M0,22 L210,22 L250,2 L290,22 L500,22 L500,0 L0,0 Z" fill="#071a3d" />
            <path d="M0,22 L210,22 L250,2 L290,22 L500,22" fill="none" stroke="#f59e0b" strokeWidth="2" />
          </svg>
        </div>
        <div
          style={{
            backgroundColor: '#071a3d',
            color: '#ffffff',
            paddingTop: '1px',
            paddingBottom: '4px',
            paddingLeft: '8px',
            paddingRight: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1px' }}>
            <Building2 style={{ width: '10px', height: '10px', color: '#f59e0b' }} />
          </div>
          <p
            style={{
              fontSize: '6.5px',
              fontWeight: 900,
              letterSpacing: '0.08em',
              color: '#ffffff',
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            DISIPLIN HARI INI,
          </p>
          <p
            style={{
              fontSize: '7px',
              fontWeight: 900,
              letterSpacing: '0.08em',
              color: '#f59e0b',
              textTransform: 'uppercase',
              margin: '1px 0 0 0',
              lineHeight: 1.1,
            }}
          >
            PRESTASI ESOK HARI
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginTop: '2px' }}>
            <div style={{ height: '1px', width: '14px', backgroundColor: 'rgba(245, 158, 11, 0.5)' }} />
            <Star style={{ width: '6px', height: '6px', color: '#f59e0b', fill: '#f59e0b' }} />
            <Star style={{ width: '6px', height: '6px', color: '#f59e0b', fill: '#f59e0b' }} />
            <Star style={{ width: '6px', height: '6px', color: '#f59e0b', fill: '#f59e0b' }} />
            <div style={{ height: '1px', width: '14px', backgroundColor: 'rgba(245, 158, 11, 0.5)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface CardBackProps {
  cardSize?: CardSizeOption;
  schoolName?: string;
  isSelected?: boolean;
  onClick?: () => void;
  showCheckbox?: boolean;
  className?: string;
}

export const OfficialStudentIDCardBack: React.FC<CardBackProps> = ({
  cardSize = 'CR80',
  schoolName,
  isSelected = true,
  onClick,
  showCheckbox = false,
  className = '',
}) => {
  const currentSize = CARD_SIZES[cardSize] || CARD_SIZES.CR80;
  const activeSchoolName = schoolName || store.getSettings().schoolName || 'SMA NEGERI 15 AMBON';

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
        border: '1.5px solid #f59e0b',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className={`official-id-card shadow-md text-slate-900 transition-all select-none shrink-0 ${
        !isSelected ? 'opacity-40 hover:opacity-80 print:hidden' : ''
      } ${className}`}
    >
      {/* Checkbox for selection in Mass Print mode */}
      {showCheckbox && (
        <div className="absolute top-1.5 right-1.5 z-20 print:hidden">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-3.5 h-3.5 text-amber-500 rounded border-slate-700 focus:ring-amber-500 cursor-pointer"
          />
        </div>
      )}

      {/* TOP NAVY HEADER SECTION */}
      <div
        style={{
          backgroundColor: '#071a3d',
          color: '#ffffff',
          paddingTop: '6px',
          paddingBottom: '4px',
          paddingLeft: '8px',
          paddingRight: '8px',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '10px',
            height: '10px',
            borderTop: '1.5px solid #f59e0b',
            borderLeft: '1.5px solid #f59e0b',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '10px',
            height: '10px',
            borderTop: '1.5px solid #f59e0b',
            borderRight: '1.5px solid #f59e0b',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <SchoolLogo size={28} className="w-full h-full drop-shadow-sm" />
          </div>
          <div style={{ textAlign: 'right', flex: 1, paddingLeft: '6px' }}>
            <h2
              style={{
                fontSize: '9.5px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#ffffff',
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {activeSchoolName}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '1px', marginBottom: '1px' }}>
              <div style={{ height: '1px', backgroundColor: 'rgba(245, 158, 11, 0.6)', flex: 1 }} />
              <div style={{ width: '4px', height: '4px', transform: 'rotate(45deg)', backgroundColor: '#f59e0b', flexShrink: 0 }} />
            </div>
            <p style={{ fontSize: '6.5px', fontWeight: 900, letterSpacing: '0.06em', color: '#f59e0b', textTransform: 'uppercase', margin: 0 }}>
              CERDAS, BERKARAKTER, BERPRESTASI
            </p>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION - RULES & RETURN INFO ON CLEAN WHITE */}
      <div
        style={{
          backgroundColor: '#ffffff',
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingTop: '4px',
          paddingBottom: '4px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          position: 'relative',
          zIndex: 10,
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div
            style={{
              backgroundColor: '#071a3d',
              color: '#ffffff',
              borderRadius: '9999px',
              paddingTop: '1.5px',
              paddingBottom: '1.5px',
              paddingLeft: '6px',
              paddingRight: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              alignSelf: 'flex-start',
            }}
          >
            <div
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ClipboardList style={{ width: '6.5px', height: '6.5px', color: '#ffffff' }} />
            </div>
            <span style={{ fontSize: '7px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              KETENTUAN PENGGUNAAN KARTU
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '1px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '7px', fontWeight: 500, color: '#1e293b', lineHeight: 1.15 }}>
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#071a3d', color: '#ffffff', fontSize: '6.5px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                1
              </span>
              <span>Bukti presensi sah siswa SMAN 15 Ambon.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '7px', fontWeight: 500, color: '#1e293b', lineHeight: 1.15 }}>
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#071a3d', color: '#ffffff', fontSize: '6.5px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                2
              </span>
              <span>Wajib dibawa setiap hari &amp; tdk dipindahtangankan.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '7px', fontWeight: 500, color: '#1e293b', lineHeight: 1.15 }}>
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#071a3d', color: '#ffffff', fontSize: '6.5px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                3
              </span>
              <span>Pelanggaran dikenakan sanksi tata tertib.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '7px', fontWeight: 500, color: '#1e293b', lineHeight: 1.15 }}>
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#071a3d', color: '#ffffff', fontSize: '6.5px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                4
              </span>
              <span>Bila hilang/rusak, lapor ke Bagian TU.</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '2px', marginBottom: '2px' }}>
          <div style={{ height: '1px', backgroundColor: '#e2e8f0', flex: 1 }} />
          <div style={{ width: '4px', height: '4px', transform: 'rotate(45deg)', backgroundColor: '#071a3d' }} />
          <div style={{ height: '1px', backgroundColor: '#e2e8f0', flex: 1 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div
            style={{
              backgroundColor: '#071a3d',
              color: '#ffffff',
              borderRadius: '9999px',
              paddingTop: '1.5px',
              paddingBottom: '1.5px',
              paddingLeft: '6px',
              paddingRight: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              alignSelf: 'flex-start',
            }}
          >
            <div
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin style={{ width: '6.5px', height: '6.5px', color: '#ffffff' }} />
            </div>
            <span style={{ fontSize: '7px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              PENGEMBALIAN KARTU HILANG
            </span>
          </div>

          <p style={{ fontSize: '6.5px', fontWeight: 500, color: '#475569', margin: '1px 0 0 1px' }}>
            Jika menemukan kartu ini, mohon kembalikan ke:
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '1px', paddingTop: '1px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#071a3d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 style={{ width: '10px', height: '10px', color: '#fde047' }} />
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <p style={{ fontSize: '7.5px', fontWeight: 900, color: '#071a3d', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                SMA NEGERI 15 AMBON
              </p>
              <p style={{ fontSize: '6.5px', fontWeight: 700, color: '#334155', margin: '1px 0 0 0' }}>
                Jl. Wara Kembang Buton, Kec. Sirimau, Ambon
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER SECTION WITH ANGULAR CHEVRON NOTCH */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0, pointerEvents: 'none', marginBottom: '-1px' }}>
          <svg
            viewBox="0 0 500 22"
            style={{ width: '100%', height: '10px', fill: '#071a3d' }}
            preserveAspectRatio="none"
          >
            <path d="M0,22 L210,22 L250,2 L290,22 L500,22 L500,0 L0,0 Z" fill="#071a3d" />
            <path d="M0,22 L210,22 L250,2 L290,22 L500,22" fill="none" stroke="#f59e0b" strokeWidth="2" />
          </svg>
        </div>
        <div
          style={{
            backgroundColor: '#071a3d',
            color: '#ffffff',
            paddingTop: '2px',
            paddingBottom: '4px',
            paddingLeft: '8px',
            paddingRight: '8px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '6.5px', fontWeight: 900, letterSpacing: '0.08em', color: '#ffffff', textTransform: 'uppercase', margin: 0 }}>
            BERLAKU SELAMA MENJADI PESERTA DIDIK
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginTop: '2px' }}>
            <div style={{ height: '1px', width: '16px', backgroundColor: 'rgba(245, 158, 11, 0.5)' }} />
            <Star style={{ width: '6px', height: '6px', color: '#f59e0b', fill: '#f59e0b' }} />
            <Star style={{ width: '6px', height: '6px', color: '#f59e0b', fill: '#f59e0b' }} />
            <Star style={{ width: '6px', height: '6px', color: '#f59e0b', fill: '#f59e0b' }} />
            <div style={{ height: '1px', width: '16px', backgroundColor: 'rgba(245, 158, 11, 0.5)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
