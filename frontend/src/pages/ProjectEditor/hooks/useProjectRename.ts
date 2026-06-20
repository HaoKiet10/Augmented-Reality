import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../constants';
import type { Project } from '../types';

interface UseProjectRenameParams {
    id: string | undefined;
    project: Project | null;
    onProjectUpdated: (updated: Project) => void;
}

export function useProjectRename({ id, project, onProjectUpdated }: UseProjectRenameParams) {
    const { token, authFetch } = useAuth();
    const [name, setName] = useState(project?.name);
    const [isEditing, setIsEditing] = useState(false);

    // Đồng bộ `name` mỗi khi project được (re)load từ server
    useEffect(() => {
        if (project?.name) {
            setName(project.name);
        }
    }, [project]);

    const handleSave = async () => {
        if (!id || !token) return;

        try {
            setIsEditing(false);

            const res = await authFetch(`${API_URL}/projects/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });

            if (!res.ok) throw new Error('Failed to update name');

            const updated: Project = await res.json();
            onProjectUpdated(updated);
            setName(updated.name);
        } catch (err) {
            console.error(err);
            setName(project?.name || ''); // rollback nếu lỗi
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setName(project?.name);
            setIsEditing(false);
        }
    };

    return {
        name,
        setName,
        isEditing,
        setIsEditing,
        handleSave,
        handleKeyDown,
    };
}