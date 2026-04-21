"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
  employee?: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authCheckInProgress, setAuthCheckInProgress] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (authCheckInProgress) {
      return;
    }

    try {
      setAuthCheckInProgress(true);
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!mountedRef.current) return;

      if (response.ok) {
        const data = await response.json();
        if (mountedRef.current) {
          setUser(data.user);
        }
      } else if (mountedRef.current) {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (mountedRef.current) {
        setUser(null);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setAuthCheckInProgress(false);
      }
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    checkAuth,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
