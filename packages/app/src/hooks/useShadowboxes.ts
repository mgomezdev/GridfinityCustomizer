import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchShadowboxes, deleteShadowbox } from '../api/shadowboxes.api';
import { useAuth } from '../contexts/AuthContext';

export const SHADOWBOXES_QUERY_KEY = ['shadowboxes'] as const;

export function useShadowboxesQuery() {
  const { getAccessToken, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: SHADOWBOXES_QUERY_KEY,
    queryFn: () => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return fetchShadowboxes(token);
    },
    enabled: isAuthenticated,
  });
}

export function useDeleteShadowboxMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return deleteShadowbox(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHADOWBOXES_QUERY_KEY });
    },
  });
}
