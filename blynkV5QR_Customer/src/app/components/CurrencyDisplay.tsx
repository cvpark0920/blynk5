import React from 'react';

interface CurrencyDisplayProps {
  amountVND: number;
  showKRW?: boolean;
  className?: string;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ amountVND, showKRW = false, className = '' }) => {
  // const amountKRW = Math.round(amountVND * 0.055); // Approx rate - Disabled

  return (
    <div className={`flex flex-col ${className}`}>
      <span className="font-bold text-current">
        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountVND)}
      </span>
      {/* KRW display removed as requested */}
    </div>
  );
};
