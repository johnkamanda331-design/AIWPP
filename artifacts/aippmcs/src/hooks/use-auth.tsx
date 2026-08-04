import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  useGetCurrentUser,
  useLogin,
  useLogout,
  setAuthTokenGetter,
  type AuthResponse,
} from "@workspace/api-client-react";
import type { User, LoginInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const TOKEN_KEY = "mtiririko_auth";

// Wire up the bearer-token getter once at module load so every API call
// automatically includes the stored JWT in its Authorization header.
setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Register the very first administrator account (only works when no users exist). */
  registerFirst: (data: { username: string; email: string; password: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  const { data: currentUser, isLoading, error } = useGetCurrentUser({
    query: {
      queryKey: ["/api/auth/me"],
      retry: false,
    },
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else if (error) {
      setUser(null);
    }
  }, [currentUser, error]);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (data: LoginInput) => {
    const result: AuthResponse = await loginMutation.mutateAsync({ data });
    localStorage.setItem(TOKEN_KEY, result.token);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const logoutAction = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      queryClient.clear();
    }
  };

  const registerFirst = async (data: { username: string; email: string; password: string }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Registration failed");
    }
    const result: AuthResponse = await res.json();
    localStorage.setItem(TOKEN_KEY, result.token);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout: logoutAction, registerFirst }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
