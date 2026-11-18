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

  const updateAvatar = useCallback(
    async (avatarUri) => {
      if (!user) return { ok: false, error: "No hay sesión activa" };
      const result = await authService.updateUserAvatar(user.id, avatarUri);
      if (result.ok) setUser(result.user);
      return result;
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
