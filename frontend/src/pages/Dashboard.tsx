import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Plus, Folder, Calendar, Trash2, ExternalLink } from 'lucide-react';
import type { Project } from '../pages/ProjectEditor/types';
import { API_URL } from '../config';
import { AnchorFrame, BrandWordmark } from '../components/Brand';
import { StatusPill } from '../components/ui';


export const Dashboard: React.FC = () => {
  const { user, token, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    <div className="bp-grid relative min-h-screen bg-ground overflow-hidden text-white">
      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/8 bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandWordmark />

          <div className="flex items-center gap-6">
            <Link to="/profile" title="Edit profile" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
              <UserIcon size={16} className="text-gray-400" />
              <span>{user?.name || user?.email}</span>
              {user?.role && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-white/5 text-gray-300 border border-white/10 rounded-full">
                  {user.role}
                </span>
              )}
            </Link>
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
            <h1 className="text-4xl font-extrabold tracking-tight">
              Designer Workspace
            </h1>
            <p className="mt-2 text-gray-400">
              Create, preview, and deploy immersive augmented reality campaigns.
            </p>
          </div>
          <button
            onClick={handleCreateProject}
            className="btn-primary px-6 py-3 rounded-xl"
          >
            <Plus size={20} />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Dashboard grid stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1 */}
          <div className="p-6 bg-surface border border-white/6 rounded-xl hover:border-white/15 transition-colors">
            <h3 className="text-lg font-bold text-white mb-2">AR Projects</h3>
            <p className="text-gray-400 text-sm mb-4">Manage and configure your campaign's target images and 3D overlays.</p>
            <div className="text-3xl font-bold text-white">{projects.length} Active</div>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-surface border border-white/6 rounded-xl hover:border-white/15 transition-colors">
            <h3 className="text-lg font-bold text-white mb-2">Asset Bank</h3>
            <p className="text-gray-400 text-sm mb-4">View files uploaded to your Supabase cloud storage (Limit 5MB).</p>
            <div className="text-3xl font-bold text-white">0 Uploads</div>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-surface border border-white/6 rounded-xl hover:border-white/15 transition-colors">
            <h3 className="text-lg font-bold text-white mb-2">Analytics</h3>
            <p className="text-gray-400 text-sm mb-4">View end user scan statistics, transform click rates, and shares.</p>
            <div className="text-3xl font-bold text-white">0 Scans</div>
          </div>
        </div>

        {/* User Projects Section */}
        <section className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Folder className="text-gray-400" size={24} />
            <h2 className="text-2xl font-bold tracking-tight">Your AR Projects</h2>
          </div>

          {sortedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-surface border border-white/10 border-dashed rounded-2xl text-center">
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
                  className="group relative flex flex-col justify-between bg-surface border border-white/6 rounded-2xl hover:border-accent/50 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  {/* Trigger image thumbnail */}
                  <AnchorFrame active={project.status === 'published'} inset={10} className="h-44 bg-raised border-b border-white/6 flex items-center justify-center overflow-hidden">
                    {project.triggerImageUrl ? (
                      <img
                        src={project.triggerImageUrl}
                        alt="Trigger"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-600">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span className="text-xs">No trigger image</span>
                      </div>
                    )}
                    {/* Status badge overlay */}
                    <StatusPill status={project.status} className="absolute top-3.5 left-8" />
                  </AnchorFrame>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-bold text-white group-hover:text-accent-ink transition-colors duration-200 leading-snug">
                        {project.name}
                      </h3>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="ml-2 shrink-0 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                        title="Delete project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{project.description}</p>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-500" />
                        <span>
                          {new Date(project.lastOpenedAt).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-accent-ink group-hover:translate-x-0.5 transition-transform duration-200">
                        <span className="font-semibold">Open</span>
                        <ExternalLink size={12} />
                      </div>
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
