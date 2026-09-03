import React from 'react';

interface ItamLogoProps {
  className?: string;
  height?: number | string;
}

export const ItamLogo: React.FC<ItamLogoProps> = ({ className = '', height = 44 }) => {
  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* Imagem do Logo Oficial ITAM Transformadores */}
      <img
        src="/assets/logo-itam.png"
        alt="ITAM Transformadores - Logo Oficial"
        className="h-10 sm:h-12 w-auto object-contain rounded"
        style={{ maxHeight: height }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
