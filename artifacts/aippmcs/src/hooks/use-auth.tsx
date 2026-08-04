import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetCurrentUser, useLogin, useLogout, LoginInput } from "@workspace/api-client-react";
import { User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  
  const { data: currentUser, isLoading, error } = useGetCurrentUser({
    query: {
      retry: false,
    }
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
    await loginMutation.mutateAsync({ data });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const logoutAction = async () => {
    await logoutMutation.mutateAsync();
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout: logoutAction }}>
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
