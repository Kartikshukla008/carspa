"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserProfile } from "@/types";
import { api } from "@/lib/api";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { identifier: string; password: string; remember_me?: boolean }) => Promise<UserProfile>;
  register: (data: any) => Promise<UserProfile>;
  setSession: (token: string, user: UserProfile) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    async function initAuth() {
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      const storedToken = localStorage.getItem("carspa_auth_token");
      const storedUser = localStorage.getItem("carspa_user_data");

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // ignore JSON parse error
          }
        }

        // Verify token with backend
        try {
          const profile = await api.getProfile();
          setUser(profile);
          localStorage.setItem("carspa_user_data", JSON.stringify(profile));
        } catch (err: any) {
          console.warn("Session expired or invalid token:", err.message);
          // Only clear if 401 or token was invalid
          if (err.message?.includes("401") || err.message?.includes("Invalid token")) {
            localStorage.removeItem("carspa_auth_token");
            localStorage.removeItem("carspa_user_data");
            setToken(null);
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = useCallback(async (credentials: { identifier: string; password: string; remember_me?: boolean }) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem("carspa_auth_token", res.token);
      localStorage.setItem("carspa_user_data", JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem("carspa_auth_token", res.token);
      localStorage.setItem("carspa_user_data", JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSession = useCallback((newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("carspa_auth_token", newToken);
    localStorage.setItem("carspa_user_data", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("carspa_auth_token");
      localStorage.removeItem("carspa_user_data");
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
      localStorage.setItem("carspa_user_data", JSON.stringify(profile));
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        setSession,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
