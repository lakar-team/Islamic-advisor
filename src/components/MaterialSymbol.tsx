import React from 'react';

interface MaterialSymbolProps {
  icon: string;
  className?: string;
}

export const MaterialSymbol: React.FC<MaterialSymbolProps> = ({ icon, className = '' }) => {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
      {icon}
    </span>
  );
};
