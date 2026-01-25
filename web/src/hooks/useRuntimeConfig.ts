import { useQuery } from '@tanstack/react-query';

interface RuntimeConfig {
  deploymentEnv: string;
  isDevelopment: boolean;
  apiUrl: string;
  _debug?: {
    DEPLOYMENT_ENV?: string;
    DEPLOYMENT_ENV_raw?: string;
    DEPLOYMENT_ENV_undefined?: boolean;
    DEPLOYMENT_ENV_null?: boolean;
    NODE_ENV?: string;
    API_URL?: string;
    NEXT_PUBLIC_API_URL?: string;
  };
}

/**
 * Hook to fetch runtime configuration from the server
 * This allows detecting deployment environment (dev vs prod) at runtime
 * without requiring separate builds.
 */
export function useRuntimeConfig() {
  const { data, isLoading, error } = useQuery<RuntimeConfig>({
    queryKey: ['runtime-config'],
    queryFn: async () => {
      const response = await fetch('/runtime-config');
      if (!response.ok) {
        throw new Error('Failed to fetch runtime config');
      }
      return response.json();
    },
    staleTime: Infinity, // Config doesn't change during runtime
    gcTime: Infinity, // Keep in cache forever
    retry: 1,
  });

  return {
    config: data,
    isLoading,
    error,
    isDevelopment: data?.isDevelopment ?? false,
    deploymentEnv: data?.deploymentEnv ?? 'production',
    apiUrl: data?.apiUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api',
  };
}
