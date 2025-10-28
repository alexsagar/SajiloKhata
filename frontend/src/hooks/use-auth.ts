import { useState, useEffect, useCallback } from "react";
import { getItem, setItem } from "../lib/storage";
import { login as apiLogin, logout as apiLogout } from "../lib/auth";
import { AuthState } from "../types/auth";

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => getItem<AuthState>("auth") || { isAuthenticated: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const result = await apiLogin(email, password);
    if (result.success) {
      setState({ isAuthenticated: true, user: result.user });
      setItem("auth", { isAuthenticated: true, user: result.user });
    }
    setLoading(false);
    return result;
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    await apiLogout();
    setState({ isAuthenticated: false });
    setItem("auth", { isAuthenticated: false });
    setLoading(false);
  }, []);

  return {
    ...state,
    loading,
    login,
    logout,
    setState,
  };
}