import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ 
  size = "default", 
  showText = true, 
  className = "",
  onClick = null 
}) => {
  const sizeClasses = {
    small: "h-8 w-8",
    default: "h-10 w-10", 
    large: "h-12 w-12",
    xlarge: "h-16 w-16"
  };

  const textSizes = {
    small: "text-lg",
    default: "text-xl",
    large: "text-2xl", 
    xlarge: "text-3xl"
  };

  const LogoIcon = () => (
    <svg 
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main circle representing sound waves */}
      <circle cx="24" cy="24" r="20" fill="url(#gradient1)" stroke="url(#gradient2)" strokeWidth="2"/>
      
      {/* Sound wave lines */}
      <path d="M12 24C12 24 16 20 24 20C32 20 36 24 36 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 24C12 24 16 28 24 28C32 28 36 24 36 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Musical note */}
      <path d="M20 16L20 28C20 30 22 32 24 32C26 32 28 30 28 28L28 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="28" cy="28" r="2" fill="currentColor"/>
      
      {/* Art brush stroke */}
      <path d="M32 12C32 12 36 16 36 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
      <path d="M34 10C34 10 38 14 38 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      
      {/* Decorative dots */}
      <circle cx="16" cy="16" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="32" cy="32" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="16" cy="32" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="32" cy="16" r="1" fill="currentColor" opacity="0.6"/>
      
      {/* Gradients */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6"/>
          <stop offset="50%" stopColor="#8B5CF6"/>
          <stop offset="100%" stopColor="#EC4899"/>
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E40AF"/>
          <stop offset="50%" stopColor="#7C3AED"/>
          <stop offset="100%" stopColor="#BE185D"/>
        </linearGradient>
      </defs>
    </svg>
  );

  const LogoText = () => (
    <span className={`font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent ${textSizes[size]}`}>
      SonicArt
    </span>
  );

  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
      >
        <LogoIcon />
        {showText && <LogoText />}
      </button>
    );
  }

  return (
    <Link 
      to="/"
      className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
    >
      <LogoIcon />
      {showText && <LogoText />}
    </Link>
  );
};

export default Logo; 