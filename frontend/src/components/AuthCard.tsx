import React from 'react';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** Khung glass-card dùng chung cho các trang auth mới (quên/đặt lại mật khẩu, OAuth callback),
 * cùng style với Login/Signup. */
export const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, children }) => (
  <div className="relative min-h-screen flex items-center justify-center bg-[#0d0e12] overflow-hidden font-sans">
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full filter blur-[100px] animate-pulse"></div>
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full filter blur-[100px] animate-pulse delay-700"></div>

    <div className="relative w-full max-w-md p-8 mx-4 bg-white/3 backdrop-blur-xl border border-white/8 rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);
