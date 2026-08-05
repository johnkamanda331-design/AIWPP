import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLogin, useLogout, useGetCurrentUser, getGetCurrentUserQueryKey, User } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: ReturnType<typeof useLogin>['mutateAsync'];
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const { data: user, isLoading: isUserLoading } = useGetCurrentUser({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetCurrentUserQueryKey()
    },
  });

  useEffect(() => {
    async function loadToken() {
      try {
        const storedToken = await AsyncStorage.getItem('mtiririko_auth');
        setToken(storedToken);
      } catch (err) {
        console.error('Failed to load token', err);
      } finally {
        setIsInitializing(false);
      }
    }
    loadToken();
  }, []);

  const login = async (data: any, options?: any) => {
    const res = await loginMutation.mutateAsync(data, options);
    if (res.token) {
      await AsyncStorage.setItem('mtiririko_auth', res.token);
      setToken(res.token);
    }
    return res;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('mtiririko_auth');
    setToken(null);
    try {
      await logoutMutation.mutateAsync();
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const isLoading = isInitializing || (!!token && isUserLoading);

  return (
    <AuthContext.Provider value={{ user: user || null, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
