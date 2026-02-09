import { useState, useEffect, useCallback } from 'react';
import { Project, ProjectFilters, Client, Division } from '@/lib/types/project-types';
import { ProjectService } from '@/lib/services/project-service';

import { getErrorMessage } from '@/lib/errors';
export function useProjectData(initialFilters?: ProjectFilters) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters state
    const [filters, setFilters] = useState<ProjectFilters>(initialFilters || { showCompleted: false, divisionId: null });

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [pData, cData, dData] = await Promise.all([
                ProjectService.fetchProjects(filters),
                ProjectService.fetchClients(),
                ProjectService.fetchDivisions()
            ]);
            setProjects(pData);
            setClients(cData as unknown as Client[]); // Basic type match
            setDivisions(dData as unknown as Division[]);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to load data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // Actions
    const createProject = async (data: Partial<Project>, newClientName?: string) => {
        setLoading(true);
        setError(null);
        try {
            if (newClientName) {
                const clientId = await ProjectService.ensureClient(newClientName);
                data.klient_id = clientId;
            }
            await ProjectService.createProject(data);
            // Refresh list
            await loadAll();
            return true;
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to create project');
            console.error(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateProject = async (id: number, data: Partial<Project>, newClientName?: string) => {
        setLoading(true);
        setError(null);
        try {
            if (newClientName) {
                const clientId = await ProjectService.ensureClient(newClientName);
                data.klient_id = clientId;
            }
            await ProjectService.updateProject(id, data);
            await loadAll();
            return true;
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to update project');
            console.error(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteProject = async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            await ProjectService.deleteProject(id);
            await loadAll();
            return true;
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to delete project');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const toggleProjectStatus = async (id: number, currentStatus: boolean) => {
        setLoading(true);
        try {
            await ProjectService.toggleProjectStatus(id, currentStatus);
            // Optimistic update or refresh? Refresh is safer.
            await loadAll();
            return true;
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to toggle status');
            setLoading(false);
            return false;
        }
    };

    return {
        projects,
        clients,
        divisions,
        loading,
        error,
        filters,
        setFilters,
        refresh: loadAll,
        createProject,
        updateProject,
        deleteProject,
        toggleProjectStatus
    };
}
