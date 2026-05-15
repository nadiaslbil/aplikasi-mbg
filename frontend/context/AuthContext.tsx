"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  nama: string;
  email: string;
  role: string;
  avatar?: string | null;
  no_telp?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  updateUser: (newUser: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
    }
    setToken(newToken);
    setUser(newUser);
  };

  const updateUser = (newUser: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(newUser));
    }
    setUser(newUser);
  };

  const logout = async () => {
    try {
      // Call backend logout to blacklist the token
      if (token) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          console.warn('Backend logout failed, but clearing local session anyway');
        }
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always clear local session
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      setToken(null);
      setUser(null);
    }
  };

  return <AuthContext.Provider value={{ user, token, login, updateUser, logout, isAuthenticated: !!token, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
