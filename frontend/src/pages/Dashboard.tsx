import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, User as UserIcon, Plus, Folder, Calendar, Trash2, ExternalLink } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  lastOpenedAt: string;
}

export const Dashboard: React.FC = () => {
  const { user, token, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  const API_URL = 'http://localhost:3000';

  // Fetch all projects from database
  const fetchProjects = async () => {
    if (!token) return;
    try {
      const response = await authFetch(`${API_URL}/projects`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading projects.');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  // Create a new project in the database
  const handleCreateProject = async () => {
    if (!token) return;
    try {
      const nextNum = projects.length + 1;
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `AR Campaign #${nextNum}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      const data = await response.json();
      // Refresh list from database
      handleOpenProject(data.id)
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create new project.');
    }
  };

  // Open a project - updates lastOpenedAt in database
  const handleOpenProject = async (id: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          lastOpenedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to open project');
      }

      navigate(`/project/${id}`);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Delete a project from database
  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open on click

    if (!window.confirm('Are you sure you want to delete this project? All associated assets will be permanently removed.')) {
      return;
    }

    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Refresh list
      await fetchProjects();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to delete project.');
    }
  };

  // Sort projects: recently opened first (descending)
  const sortedProjects = [...projects].sort(
    (a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
  );

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
        {error && (
          <div className="p-4 mb-6 bg-red-500/20 border border-red-500/30 text-red-200 rounded-xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 font-bold ml-4">✕</button>
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text bg-linear-to-r from-white to-gray-400">
              Designer Workspace
            </h1>
            <p className="mt-2 text-gray-400">
              Create, preview, and deploy immersive augmented reality campaigns.
            </p>
          </div>
          <button
            onClick={handleCreateProject}
            className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.03] shadow-lg shadow-blue-500/25 active:scale-[0.98]"
          >
            <Plus size={20} />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Dashboard grid stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1 */}
          <div className="p-6 bg-white/2 backdrop-blur-lg border border-white/6 rounded-xl hover:border-blue-500/30 transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-2">AR Projects</h3>
            <p className="text-gray-400 text-sm mb-4">Manage and configure your campaign's target images and 3D overlays.</p>
            <div className="text-3xl font-black text-blue-400">{projects.length} Active</div>
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

        {/* User Projects Section */}
        <section className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Folder className="text-purple-400" size={24} />
            <h2 className="text-2xl font-bold tracking-tight">Your AR Projects</h2>
          </div>

          {sortedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/1 backdrop-blur-lg border border-white/5 border-dashed rounded-2xl text-center">
              <Folder size={48} className="text-gray-600 mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-300">No projects yet</h3>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                Click the "Create New Project" button above to start crafting your first immersive augmented reality campaign.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleOpenProject(project.id)}
                  className="group relative flex flex-col justify-between p-6 bg-white/2 backdrop-blur-lg border border-white/6 rounded-2xl hover:border-purple-500/40 hover:bg-white/4 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-purple-500/5"
                >
                  <div>
                    {/* Header line with badge and delete */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full capitalize">
                        {project.status}
                      </span>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                        title="Delete project"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors duration-200">
                      {project.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-6 line-clamp-2">
                      {project.description}
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-blue-400" />
                      <span>
                        Opened {new Date(project.lastOpenedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-400 group-hover:translate-x-0.5 transition-transform duration-200">
                      <span className="font-semibold">Open</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
