import { useQuery, useMutation } from '@tanstack/react-query';
import { getEndpoint, createEndpoint } from './endpoint.api';
import * as tokenStorage from '../../../shared/lib/tokenStorage';

export const useEndpointQuery = (endpointId: string | undefined) => {
  return useQuery({
    queryKey: ['endpoint', endpointId],
    queryFn: async () => {
      if (!endpointId) throw new Error('No endpoint ID');
      
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        tokenStorage.set(endpointId, token);
        window.history.replaceState({}, '', window.location.pathname);
      }
      
      return getEndpoint(endpointId);
    },
    enabled: !!endpointId,
  });
};

export const useCreateEndpointMutation = () => {
  return useMutation({
    mutationFn: (label?: string) => createEndpoint(label),
    onSuccess: (data) => {
      tokenStorage.set(data.endpointId, data.accessToken);
    },
  });
};

export function useDeleteEndpointMutation() {
  return useMutation({
    mutationFn: (id: string) => deleteEndpoint(id),
  });
}

export function useUpdateMockConfigMutation(endpointId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mockConfig: Parameters<typeof import('./endpoint.api').updateMockConfig>[1]) => 
      import('./endpoint.api').then(m => m.updateMockConfig(endpointId, mockConfig)),
    onSuccess: (data) => {
      queryClient.setQueryData(['endpoint', endpointId], data);
    },
  });
}
