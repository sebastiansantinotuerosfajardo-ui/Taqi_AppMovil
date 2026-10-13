import React, { createContext, useCallback, useContext, useMemo } from "react";
import usePersistentState from "../hooks/usePersistentState";
import { useAuth } from "./AuthContext";

const AppDataContext = createContext(null);

// Guarda las metas y las actividades activadas de CADA usuario en AsyncStorage
export function AppDataProvider({ children }) {
  const { user } = useAuth();
  const uid = user ? user.id : "guest";

  const [metas, setMetas, metasLoaded] = usePersistentState(`@taqi:metas:${uid}`, []);
  const [activas, setActivas, activasLoaded] = usePersistentState(`@taqi:actividades:${uid}`, {});

  const addMeta = useCallback(
    ({ title, target }) => {
      const meta = { id: String(Date.now()), title, target: Number(target), aportes: [] };
      setMetas((prev) => [...prev, meta]);
      return meta;
    },
    [setMetas]
  );

  const updateMeta = useCallback(
    (id, changes) => {
      setMetas((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)));
    },
    [setMetas]
  );

  const deleteMeta = useCallback(
    (id) => {
      setMetas((prev) => prev.filter((m) => m.id !== id));
    },
    [setMetas]
  );

  const addAporte = useCallback(
    (id, amount) => {
      const aporte = { id: String(Date.now()), amount: Number(amount), date: new Date().toISOString() };
      setMetas((prev) =>
        prev.map((m) => (m.id === id ? { ...m, aportes: [aporte, ...(m.aportes || [])] } : m))
      );
    },
    [setMetas]
  );

  const toggleActividad = useCallback(
    (id) => {
      setActivas((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [setActivas]
  );

  const value = useMemo(
    () => ({
      metas,
      activas,
      loaded: metasLoaded && activasLoaded,
      addMeta,
      updateMeta,
      deleteMeta,
      addAporte,
      toggleActividad,
    }),
    [metas, activas, metasLoaded, activasLoaded, addMeta, updateMeta, deleteMeta, addAporte, toggleActividad]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData debe usarse dentro de AppDataProvider");
  return context;
}
