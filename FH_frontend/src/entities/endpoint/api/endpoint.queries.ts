import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEndpoint,
  createEndpoint,
  deleteEndpoint,
  updateMockConfig,
  type MockUpdateRequest,
} from "./endpoint.api";
import * as tokenStorage from "@/shared/lib/tokenStorage";

export const useEndpointQuery = (endpointId: string | undefined) => {
  return useQuery({
    queryKey: ["endpoint", endpointId],
    queryFn: async () => {
      if (!endpointId) throw new Error("No endpoint ID");

      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
        tokenStorage.set(endpointId, token);
        window.history.replaceState({}, "", window.location.pathname);
      }

      return getEndpoint(endpointId);
    },
    meta: { suppressErrorToast: true },
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEndpoint(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["endpoint", id] });
    },
  });
}

export function useUpdateMockConfigMutation(endpointId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mockConfig: MockUpdateRequest) =>
      updateMockConfig(endpointId, mockConfig),
    onSuccess: (data) => {
      queryClient.setQueryData(["endpoint", endpointId], data);
    },
  });
}
