import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, User as UserIcon } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen bg-[#0d0e12] overflow-hidden text-white font-sans">
      {/* Background neon blur */}
      <div className="absolute top-0 right-0 w-125 h-125 bg-blue-500/10 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-125 h-125 bg-purple-500/10 rounded-full filter blur-[120px] pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/8 bg-white/1 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-400" size={24} />
            <span className="font-bold text-lg tracking-wider bg-clip-text bg-linear-to-r from-blue-400 to-purple-400">
              AR DESIGNER
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <UserIcon size={16} className="text-purple-400" />
              <span>{user?.name || user?.email}</span>
              {user?.role && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                  {user.role}
                </span>
              )}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-white/8 hover:border-red-500/30 hover:bg-red-500/10 text-gray-300 hover:text-red-400 rounded-lg transition-all duration-200"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text bg-linear-to-r from-white to-gray-400">
            Designer Workspace
          </h1>
          <p className="mt-2 text-gray-400">
            Create, preview, and deploy immersive augmented reality campaigns.
          </p>
        </div>

        {/* Dashboard grid mockup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 bg-white/2 backdrop-blur-lg border border-white/6 rounded-xl hover:border-blue-500/30 transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-2">AR Projects</h3>
            <p className="text-gray-400 text-sm mb-4">Manage and configure your campaign's target images and 3D overlays.</p>
            <div className="text-3xl font-black text-blue-400">0 Active</div>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-white/2 backdrop-blur-lg border border-white/6 rounded-xl hover:border-purple-500/30 transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-2">Asset Bank</h3>
            <p className="text-gray-400 text-sm mb-4">View files uploaded to your Supabase cloud storage (Limit 5MB).</p>
            <div className="text-3xl font-black text-purple-400">0 Uploads</div>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-white/2 backdrop-blur-lg border border-white/6 rounded-xl hover:border-teal-500/30 transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-2">Analytics</h3>
            <p className="text-gray-400 text-sm mb-4">View end user scan statistics, transform click rates, and shares.</p>
            <div className="text-3xl font-black text-teal-400">0 Scans</div>
          </div>
        </div>
      </main>
    </div>
  );
};
