"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type AuthUser = {
  _id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  onboardingCompleted: boolean;
  role?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("rdg_user");
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
};

const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rdg_token");
};

const setAuthCookies = (token: string, onboardingCompleted: boolean) => {
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `rdg_token=${token}; path=/; max-age=${maxAge}`;
  document.cookie = `rdg_onboarding=${onboardingCompleted ? "1" : "0"}; path=/; max-age=${maxAge}`;
};

const clearAuthCookies = () => {
  document.cookie = "rdg_token=; path=/; max-age=0";
  document.cookie = "rdg_onboarding=; path=/; max-age=0";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
    setToken(getStoredToken());
  }, []);

  const login = useCallback((user: AuthUser, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem("rdg_user", JSON.stringify(user));
    localStorage.setItem("rdg_token", token);
    setAuthCookies(token, user.onboardingCompleted);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("rdg_user");
    localStorage.removeItem("rdg_token");
    clearAuthCookies();
  }, []);

  const updateUser = useCallback((user: AuthUser) => {
    setUser(user);
    localStorage.setItem("rdg_user", JSON.stringify(user));
    const token = localStorage.getItem("rdg_token") ?? "";
    setAuthCookies(token, user.onboardingCompleted);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
