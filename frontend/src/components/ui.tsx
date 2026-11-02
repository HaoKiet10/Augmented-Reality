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
