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
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg 
        width={pixelSize} 
        height={pixelSize} 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105 duration-300 select-none"
      >
        <defs>
          {/* Left feline-ear gradient (deep royal blue to vibrant lavender purple) */}
          <linearGradient id="vetmind-grad-left" x1="15%" y1="90%" x2="55%" y2="10%">
            <stop offset="0%" stopColor="#2535d9" />
            <stop offset="45%" stopColor="#5544ff" />
            <stop offset="100%" stopColor="#8c44ff" />
          </linearGradient>
          {/* Right wing/feathers/leaf gradient (vibrant blue-violet to bright cyan & emerald) */}
          <linearGradient id="vetmind-grad-right" x1="30%" y1="95%" x2="90%" y2="5%">
            <stop offset="0%" stopColor="#2535d9" />
            <stop offset="50%" stopColor="#00b4e2" />
            <stop offset="100%" stopColor="#00dcb5" />
          </linearGradient>
        </defs>
        
        {/* Left Side: Feline/Canine silhouette shaping the V's left arm */}
        <path 
          d="M 239.5 321
             C 219.0 274.5, 175.5 174.5, 150.0 119.5
             C 147.0 125.0, 149.0 152.0, 144.5 163.5
             C 139.5 176.5, 126.0 185.0, 122.5 198.5
             C 119.0 211.5, 131.0 219.5, 135.5 225.0
             C 142.5 233.5, 149.0 241.5, 161.0 248.5
             C 173.0 255.5, 203.0 307.5, 239.5 321
             Z" 
          fill="url(#vetmind-grad-left)" 
        />
        
        {/* Outer Left ear & head profile */}
        <path
          d="M 148 118
             C 143 145, 136 168, 128 178
             C 123 184, 118 188, 110 193
             C 100 199, 93 205, 96 214
             C 99 223, 113 228, 125 229
             C 144 230.5, 158 214, 176 226
             C 192 237, 232.5 311, 239.5 321
             L 256.5 321
             C 256.5 321, 225.5 188.5, 196.5 142.5
             C 191.5 134.5, 184.5 125.5, 185 118.5
             Z"
          fill="url(#vetmind-grad-left)"
        />

        {/* Right Side: Elegant wings / leaf-like layers shaping the V's right arm */}
        {/* Upper Wing Section */}
        <path 
          d="M 239.5 321
             C 264.5 264.5, 335.5 145.0, 404.5 102.5
             C 406.5 100.5, 408.0 99.0, 410.0 102.0
             C 411.0 104.0, 409.0 110.0, 403.0 115.0
             C 385.0 131.0, 360.5 162.5, 335.5 200.5
             C 356.5 182.5, 375.5 168.0, 385.5 168.0
             C 388.5 168.0, 390.0 171.5, 387.0 175.5
             C 355.0 220.5, 311.5 278.0, 239.5 321
             Z"
          fill="url(#vetmind-grad-right)"
        />
        
        {/* Inner swoosh/wing detail creating depth */}
        <path 
          d="M 239.5 321
             C 265.5 285.5, 325.5 221.5, 378.0 181.5
             C 381.0 178.5, 382.0 180.0, 379.0 183.5
             C 345.0 231.5, 285.5 295.5, 239.5 321
             Z"
          fill="url(#vetmind-grad-right)"
          opacity="0.85"
        />
      </svg>
      
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
