"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UserProfile, getMyProfile, logout, hasToken } from "../lib/api";

interface AuthContextType {
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  setProfile: (p: UserProfile | null) => void;
  setAuth: (p: UserProfile, t: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  token: null,
  loading: true,
  setProfile: () => {},
  setAuth: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("ac_token") : null;
    setToken(t);

    if (t) {
      getMyProfile()
        .then((p) => setProfile(p))
        .catch(() => {
          logout();
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signOut = () => {
    logout();
    setProfile(null);
    setToken(null);
  };

  const setAuth = (user: UserProfile, t: string) => {
    setProfile(user);
    setToken(t);
  };

  return (
    <AuthContext.Provider value={{ profile, token, loading, setProfile, setAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
