import React from 'react';
import { AnchorFrame, BrandWordmark } from './Brand';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** Khung card dùng chung cho mọi trang auth (đăng nhập, đăng ký, quên/đặt lại mật khẩu, OAuth),
 * gồm nền lưới blueprint, logo phía trên và 4 góc neo quanh card. */
export const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, children }) => (
  <div className="bp-grid relative min-h-screen flex flex-col items-center justify-center gap-8 bg-ground overflow-hidden">
    <BrandWordmark className="relative" />
    <AnchorFrame active inset={-12} className="w-full max-w-md mx-4">
      <div className="p-8 bg-surface border border-white/8 rounded-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-gray-400">{subtitle}</p>}
        </div>
        {children}
      </div>
    </AnchorFrame>
  </div>
);
