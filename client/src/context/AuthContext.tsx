import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STUDENT' | 'DEMO' | string;
  accountType: 'REGULAR' | 'GOOGLE' | 'DEMO' | string;
  status: 'ACTIVE' | 'DISABLED' | string;
  avatarUrl?: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isDemo: boolean;
  loginGoogle: (idToken: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  /** `requireRole` rejects (and signs back out) before any state changes when the account has another role. */
  loginPassword: (password: string, email?: string, requireRole?: string) => Promise<{ role?: string } | undefined>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.getCurrentUser();
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if redirected from Google OAuth with ?token=...
    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('scholarflow_token', urlToken);
      // Clean up url
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    refreshUser();
  }, [refreshUser]);

  const loginDemo = async () => {
    setIsLoading(true);
    try {
      const response = await api.loginDemo();
      if (response?.token) {
        localStorage.setItem('scholarflow_token', response.token);
      }
      setUser(response?.user || response);
    } finally {
      setIsLoading(false);
    }
  };

  const loginGoogle = async (idToken: string) => {
    setIsLoading(true);
    try {
      const response = await api.loginGoogle(idToken);
      if (response?.token) {
        localStorage.setItem('scholarflow_token', response.token);
      }
      setUser(response?.user || response);
    } finally {
      setIsLoading(false);
    }
  };

  const loginPassword = async (password: string, email = 'owner@scholarflow.local', requireRole?: string) => {
    setIsLoading(true);
    try {
      const response = await api.login(password, email);
      if (response?.token) {
        localStorage.setItem('scholarflow_token', response.token);
      }
      const signedIn = response?.user || response;
      if (requireRole && signedIn?.role !== requireRole) {
        // The server also set a session cookie, so clear it as well as the token.
        localStorage.removeItem('scholarflow_token');
        await api.logout().catch(() => {});
        throw new Error('ROLE_MISMATCH');
      }
      setUser(signedIn);
      return signedIn;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('scholarflow_token');
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isDemo = user?.role === 'DEMO';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isDemo,
        loginGoogle,
        loginDemo,
        loginPassword,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
