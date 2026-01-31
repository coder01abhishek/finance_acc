import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "hr" | "manager" | "data_entry";
  isActive: boolean;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error("Failed to check auth");
      }
      const data = await res.json();
      return data.user as User;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    user: data ?? null,
    isLoading,
    isAuthenticated: !!data,
    error,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.invalidateQueries();
    },
  });
}
