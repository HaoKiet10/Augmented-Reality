import React from 'react';

/** Logo: một khối 3D nằm trong 4 góc neo — vật thể AR được neo lên trigger image. */
const BrandMark: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`text-accent ${className}`}
    aria-hidden="true"
  >
    <path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
    <path d="M12 6.5l4.5 2.5v5L12 16.5 7.5 14V9z" />
    <path d="M7.5 9L12 11.5 16.5 9M12 11.5v5" />
  </svg>
);

/** Logo + tên sản phẩm, dùng ở header và trang đăng nhập. */
export const BrandWordmark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <BrandMark />
    <span className="font-semibold text-lg tracking-tight text-white">AR Designer</span>
  </span>
);

interface AnchorFrameProps {
  /** true: góc neo màu accent (đã publish / đang được theo dõi); false: góc xám. */
  active?: boolean;
  /** Khoảng cách từ mép khung tới góc neo, px. */
  inset?: number;
  className?: string;
  children: React.ReactNode;
}

/** 4 góc neo quanh một trigger image — giống khung tracker của AR khi bắt được ảnh in. */
export const AnchorFrame: React.FC<AnchorFrameProps> = ({ active = false, inset = 8, className = '', children }) => {
  const color = active ? 'border-accent' : 'border-white/30';
  const corner = `pointer-events-none absolute w-4 h-4 ${color} transition-colors duration-200`;
  return (
    <div className={`relative ${className}`}>
      {children}
      <span className={`${corner} border-t-2 border-l-2`} style={{ top: inset, left: inset }} />
      <span className={`${corner} border-t-2 border-r-2`} style={{ top: inset, right: inset }} />
      <span className={`${corner} border-b-2 border-l-2`} style={{ bottom: inset, left: inset }} />
      <span className={`${corner} border-b-2 border-r-2`} style={{ bottom: inset, right: inset }} />
    </div>
  );
};
