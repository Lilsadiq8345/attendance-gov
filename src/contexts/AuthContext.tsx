import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface AuthContextType {
  user: any;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const DEV_ADMIN_TOKEN = "dev-admin-token";
const DEV_ADMIN_USER = {
  id: "admin-local",
  full_name: "Administrator",
  email: "admin@local",
  role: "admin",
};
const ENABLE_DEV_ADMIN = (import.meta as any)?.env?.VITE_ENABLE_DEV_ADMIN === 'true';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Always set axios default Authorization header if token is present (only for real tokens)
  useEffect(() => {
    if (token && token !== DEV_ADMIN_TOKEN) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else if (!token) {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        if (ENABLE_DEV_ADMIN && token === DEV_ADMIN_TOKEN) {
          setUser(DEV_ADMIN_USER);
        } else {
          try {
            const res = await axios.get("/api/user/");
            setUser(res.data);
          } catch {
            setUser(null);
            setToken(null);
            localStorage.removeItem("token");
          }
        }
      }
      setLoading(false);
    };
    checkAuth();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!loading && token) {
      if (ENABLE_DEV_ADMIN && token === DEV_ADMIN_TOKEN) {
        setUser(DEV_ADMIN_USER);
      } else {
        axios.get("/api/user/")
          .then(res => setUser(res.data))
          .catch(() => {
            setUser(null);
            setToken(null);
            localStorage.removeItem("token");
          });
      }
    }
    // eslint-disable-next-line
  }, [token, loading]);

  const login = async (username: string, password: string) => {
    // Optional dev bypass (opt-in via env)
    if (ENABLE_DEV_ADMIN && username === "admin" && password === "admin") {
      setToken(DEV_ADMIN_TOKEN);
      localStorage.setItem("token", DEV_ADMIN_TOKEN);
      setUser(DEV_ADMIN_USER);
      return;
    }
    const res = await axios.post("/api/auth/login/", { username, password });
    setToken(res.data.access);
    localStorage.setItem("token", res.data.access);
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.access}`;
    await refreshProfile();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
  };

  const register = async (data: any) => {
    await axios.post("/api/auth/register/", data);
  };

  const refreshProfile = async () => {
    if (token) {
      if (ENABLE_DEV_ADMIN && token === DEV_ADMIN_TOKEN) {
        setUser(DEV_ADMIN_USER);
        return;
      }
      const res = await axios.get("/api/user/");
      setUser(res.data);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
