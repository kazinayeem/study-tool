import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSelectedSemesterId } from '../store/academicSlice';
import { api } from '../lib/api';
import { Semester } from '../types';

export function useActiveSemester() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const reduxSemesterId = useAppSelector((state) => state.academic.selectedSemesterId);

  // Fetch all semesters
  const { data: semesters = [], isLoading: semestersLoading } = useQuery<Semester[]>({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
  });

  // Fetch app settings for fallback currentSemesterId
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  // 1. Detect if current route is /semesters/:id/...
  const routeSemesterMatch = location.pathname.match(/^\/semesters\/([^/]+)/);
  const routeSemesterId = routeSemesterMatch ? routeSemesterMatch[1] : undefined;

  // 2. Query param ?semesterId=...
  const querySemesterId = searchParams.get('semesterId') || undefined;

  // Resolve active semester ID:
  // Priority: URL route id > URL query param > Redux selectedSemesterId > settings.currentSemesterId > first ACTIVE semester > first semester
  const resolvedSemesterId = useMemo(() => {
    if (routeSemesterId && routeSemesterId !== 'new') {
      const match = semesters.find((s) => s.id === routeSemesterId);
      if (match) return match.id;
    }
    if (querySemesterId) {
      const match = semesters.find((s) => s.id === querySemesterId);
      if (match) return match.id;
    }
    if (reduxSemesterId) {
      const match = semesters.find((s) => s.id === reduxSemesterId);
      if (match) return match.id;
    }
    if (settings?.currentSemesterId) {
      const match = semesters.find((s) => s.id === settings.currentSemesterId);
      if (match) return match.id;
    }
    const activeOne = semesters.find((s) => s.status === 'ACTIVE' && !s.isArchived);
    if (activeOne) return activeOne.id;
    return semesters[0]?.id || null;
  }, [routeSemesterId, querySemesterId, reduxSemesterId, settings?.currentSemesterId, semesters]);

  const activeSemester = useMemo(() => {
    if (!resolvedSemesterId) return null;
    return semesters.find((s) => s.id === resolvedSemesterId) || null;
  }, [semesters, resolvedSemesterId]);

  const selectSemester = useCallback(
    async (id: string, updateServer = true) => {
      dispatch(setSelectedSemesterId(id));
      if (updateServer) {
        try {
          await api.updateSettings({ currentSemesterId: id });
        } catch {
          // ignore if guest or offline
        }
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    [dispatch, queryClient]
  );

  return {
    semesters,
    activeSemester,
    activeSemesterId: resolvedSemesterId,
    isLoading: semestersLoading,
    selectSemester,
  };
}
