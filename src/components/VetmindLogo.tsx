import React from 'react';

interface VetmindLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  textColor?: string;
}

export default function VetmindLogo({ 
  className = '', 
  showText = true, 
  size = 'md',
  textColor = 'text-slate-900'
}: VetmindLogoProps) {
  // Determine pixel size based on preset or explicit number
  const pixelSize = typeof size === 'number' 
    ? size 
    : size === 'sm' ? 32 
    : size === 'md' ? 48 
    : size === 'lg' ? 80 
    : size === 'xl' ? 140 
    : size === '2xl' ? 240
    : 48;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img 
        src="https://i.ibb.co/QhckmxV/logo-vetmind.png" 
        alt="Vetmind Logo"
        width={pixelSize}
        height={pixelSize}
        className="shrink-0 transition-all hover:scale-105 duration-300 select-none object-contain"
        referrerPolicy="no-referrer"
        style={{ width: pixelSize, height: pixelSize }}
      />
      
      {showText && (
        <span 
          className={`font-sans font-extrabold tracking-tight select-none transition-all duration-300 ${textColor}`}
          style={{
            fontSize: pixelSize >= 140 ? '2.5rem' : pixelSize >= 80 ? '1.8rem' : pixelSize >= 48 ? '1.35rem' : '0.95rem',
            letterSpacing: '-0.03em'
          }}
        >
          Vetmind
        </span>
      )}
    </div>
  );
}
