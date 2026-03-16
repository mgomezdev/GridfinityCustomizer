import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchShadowboxes, deleteShadowbox } from '../api/shadowboxes.api';

export const SHADOWBOXES_QUERY_KEY = ['shadowboxes'] as const;

export function useShadowboxesQuery() {
  return useQuery({
    queryKey: SHADOWBOXES_QUERY_KEY,
    queryFn: fetchShadowboxes,
  });
}

export function useDeleteShadowboxMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShadowbox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHADOWBOXES_QUERY_KEY });
    },
  });
}
