import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Al abrir la app se busca si ya había una sesión guardada
  useEffect(() => {
    let active = true;
    authService.getSessionUser().then((sessionUser) => {
      if (active) {
        setUser(sessionUser);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (identifier, password) => {
    const result = await authService.loginUser({ identifier, password });
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const register = useCallback(async (data) => {
    const result = await authService.registerUser(data);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
