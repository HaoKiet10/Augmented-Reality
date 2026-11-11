import React from 'react';
import type { ProjectStatus } from '../pages/ProjectEditor/types';

interface SpinnerProps {
  /** sm: trong nút (20px); lg: chờ cả trang/khung (32px). */
  size?: 'sm' | 'lg';
  /** accent: trên nền tối; on-accent: bên trong nút màu accent. */
  tone?: 'accent' | 'on-accent';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'lg', tone = 'accent', className = '' }) => {
  const sizeClass = size === 'sm' ? 'w-5 h-5 border-2' : 'w-8 h-8 border-4';
  const toneClass = tone === 'on-accent' ? 'border-on-accent/20 border-t-on-accent' : 'border-accent/20 border-t-accent';
  return <div className={`${sizeClass} ${toneClass} rounded-full animate-spin ${className}`} role="status" aria-label="Loading" />;
};

/** Spinner căn giữa toàn màn hình, dùng khi chờ route/phiên đăng nhập/dữ liệu. */
export const FullPageSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="min-h-screen bg-ground flex flex-col items-center justify-center gap-4">
    <Spinner />
    {label && <p className="text-gray-400 font-medium">{label}</p>}
  </div>
);

const STATUS_PILL_CLASS: Record<ProjectStatus, string> = {
  published: 'bg-positive-bg text-positive border-positive/30',
  draft: 'bg-ground/80 text-gray-300 border-white/10',
  archived: 'bg-ground/80 text-gray-500 border-white/10',
};

export const StatusPill: React.FC<{ status: ProjectStatus; className?: string }> = ({ status, className = '' }) => (
  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize border ${STATUS_PILL_CLASS[status]} ${className}`}>
    {status}
  </span>
);

const AVATAR_SIZE: Record<'sm' | 'lg', string> = {
  sm: 'w-7 h-7 text-xs',
  lg: 'w-24 h-24 text-3xl',
};

/** Chữ cái đầu từ tên (tối đa 2), rơi về email nếu chưa đặt tên. */
const initialsOf = (name?: string | null, email?: string) => {
  const source = (name || '').trim() || (email || '').split('@')[0];
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2);
  return letters.toUpperCase() || '?';
};

/** Ảnh đại diện tròn; không có ảnh (hoặc ảnh lỗi, vd link Google hết hạn) thì hiện initials. */
export const Avatar: React.FC<{ url?: string | null; name?: string | null; email?: string; size?: 'sm' | 'lg'; className?: string }> = ({
  url,
  name,
  email,
  size = 'sm',
  className = '',
}) => {
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => setBroken(false), [url]);
  const base = `${AVATAR_SIZE[size]} rounded-full shrink-0 overflow-hidden border border-white/10 ${className}`;

  if (url && !broken) {
    return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={`${base} object-cover bg-surface`} />;
  }
  return (
    <div className={`${base} flex items-center justify-center bg-accent/15 text-accent-ink font-bold select-none`} aria-hidden>
      {initialsOf(name, email)}
    </div>
  );
};
