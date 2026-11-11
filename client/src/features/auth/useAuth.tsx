import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  authApi,
  getToken,
  setToken,
  removeToken,
  type User,
  type LoginInput,
  type RegisterInput,
} from '../../api/client';
import { queryClient, persister } from '../../lib/queryClient';

export interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getToken()));

  useEffect(() => {
    const existingToken = getToken();
    if (!existingToken) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    authApi
      .getMe()
      .then((res) => {
        if (!isMounted) return;
        setUser(res.user);
        setTokenState(existingToken);
      })
      .catch(() => {
        if (!isMounted) return;
        removeToken();
        setTokenState(null);
        setUser(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (data: LoginInput) => {
    const res = await authApi.login(data);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const register = async (data: RegisterInput) => {
    const res = await authApi.register(data);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network failure on logout
    } finally {
      removeToken();
      setTokenState(null);
      setUser(null);
      queryClient.clear();
      persister.removeClient();
    }
  };

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
