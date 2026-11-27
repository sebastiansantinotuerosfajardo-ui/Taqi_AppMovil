import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import * as authService from "../services/authService";
import { alCaducarSesion } from "../services/sesionEventos";
import { resetTo } from "../navigation/rootNavigation";

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

  // Si el servidor dice que la sesión ya no se puede renovar (pasaron 30 días sin abrir la app, se cambió
  // la contraseña o se detectó un token robado), se cierra aquí y se vuelve al inicio de sesión.
  useEffect(
    () =>
      alCaducarSesion(async () => {
        await authService.clearSession();
        setUser(null);
        resetTo("Login");
        Alert.alert("Sesión vencida", "Por seguridad, inicia sesión de nuevo.");
      }),
    []
  );

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
