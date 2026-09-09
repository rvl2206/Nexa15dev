import React, { useState, useEffect } from 'react';
import { School } from 'lucide-react';
import { store } from '../lib/store';

interface SchoolLogoProps {
  src?: string;
  className?: string;
  size?: number;
  alt?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  src,
  className = 'w-10 h-10',
  size,
  alt,
  containerClassName = '',
  fallbackIcon,
}) => {
  const [currentLogo, setCurrentLogo] = useState<string>(() => src || store.getSettings().schoolLogo || '');
  const [schoolName, setSchoolName] = useState<string>(() => store.getSettings().schoolName || 'Sekolah');
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (src !== undefined) {
      setCurrentLogo(src);
      setHasError(false);
      return;
    }

    const updateLogo = () => {
      const settings = store.getSettings();
      setCurrentLogo(settings.schoolLogo || '');
      setSchoolName(settings.schoolName || 'Sekolah');
      setHasError(false);
    };

    updateLogo();
    const unsubscribe = store.subscribe(updateLogo);
    return () => unsubscribe();
  }, [src]);

  const pixelStyle: React.CSSProperties = size
    ? {
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
      }
    : {};

  // If a valid logo is available and hasn't errored
  if (currentLogo && currentLogo.trim().length > 0 && !hasError) {
    return (
      <div
        style={pixelStyle}
        className={`relative inline-flex items-center justify-center overflow-hidden shrink-0 ${className} ${containerClassName}`}
      >
        <img
          src={currentLogo}
          alt={alt || `Logo ${schoolName}`}
          className="w-full h-full object-contain select-none pointer-events-none"
          loading="eager"
          decoding="async"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // Fallback placeholder when no logo is uploaded
  return (
    <div
      style={pixelStyle}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300/80 dark:border-slate-700/80 text-sky-600 dark:text-sky-400 p-1 shadow-2xs overflow-hidden select-none ${className} ${containerClassName}`}
      title={alt || `Logo ${schoolName} (Belum diunggah)`}
    >
      {fallbackIcon ? (
        fallbackIcon
      ) : (
        <School className="w-full h-full p-0.5 object-contain" />
      )}
    </div>
  );
};

