import React, { createContext, useCallback, useContext, useMemo } from "react";
import usePersistentState from "../hooks/usePersistentState";
import { useAuth } from "./AuthContext";

const AppDataContext = createContext(null);

const DEFAULT_METAS = [
  {
    id: "meta-1",
    title: "Viaje a Cusco",
    target: 1500,
    aportes: [
      { id: "ap-1", amount: 150, date: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: "ap-2", amount: 42, date: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: "ap-3", amount: 300, date: new Date(Date.now() - 86400000 * 10).toISOString() },
      { id: "ap-4", amount: 358, date: new Date(Date.now() - 86400000 * 15).toISOString() },
    ],
  },
  {
    id: "meta-2",
    title: "Laptop nueva",
    target: 3500,
    aportes: [
      { id: "ap-5", amount: 700, date: new Date(Date.now() - 86400000 * 12).toISOString() },
      { id: "ap-6", amount: 350, date: new Date(Date.now() - 86400000 * 20).toISOString() },
    ],
  },
  {
    id: "meta-3",
    title: "Fondo de emergencia",
    target: 2000,
    aportes: [
      { id: "ap-7", amount: 500, date: new Date(Date.now() - 86400000 * 8).toISOString() },
      { id: "ap-8", amount: 300, date: new Date(Date.now() - 86400000 * 18).toISOString() },
    ],
  },
];

const DEFAULT_GASTOS_FIJOS = [
  { id: "gf-1", title: "Alquiler", amount: 600, icon: "home-outline", category: "Vivienda" },
  { id: "gf-2", title: "Luz", amount: 65, icon: "flash-outline", category: "Servicios" },
  { id: "gf-3", title: "Agua", amount: 45, icon: "water-outline", category: "Servicios" },
  { id: "gf-4", title: "Internet", amount: 89, icon: "wifi-outline", category: "Servicios" },
  { id: "gf-5", title: "Gas", amount: 35, icon: "flame-outline", category: "Servicios" },
];

const DEFAULT_PRESUPUESTO = {
  ingresoMensual: 3428.5,
  gastoVariableEstimado: 1200,
};

// Proveedor global de datos de la aplicación con persistencia offline en AsyncStorage por usuario
export function AppDataProvider({ children }) {
  const { user } = useAuth();
  const uid = user ? user.id : "guest";

  const [metas, setMetas, metasLoaded] = usePersistentState(`@taqi:metas:${uid}`, DEFAULT_METAS);
  const [activas, setActivas, activasLoaded] = usePersistentState(`@taqi:actividades:${uid}`, {
    redondeo: true,
  });
  const [gastosFijos, setGastosFijos, gastosLoaded] = usePersistentState(
    `@taqi:gastos_fijos:${uid}`,
    DEFAULT_GASTOS_FIJOS
  );
  const [presupuesto, setPresupuesto, presupuestoLoaded] = usePersistentState(
    `@taqi:presupuesto:${uid}`,
    DEFAULT_PRESUPUESTO
  );
  const [perfilVivienda, setPerfilVivienda, perfilLoaded] = usePersistentState(
    `@taqi:perfil_vivienda:${uid}`,
    "fija"
  );

  // --- CRUD de Metas de Ahorro ---
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
      const aporte = {
        id: String(Date.now()),
        amount: Number(amount),
        date: new Date().toISOString(),
      };
      setMetas((prev) =>
        prev.map((m) => (m.id === id ? { ...m, aportes: [aporte, ...(m.aportes || [])] } : m))
      );
    },
    [setMetas]
  );

  // --- Actividades de sugerencias ---
  const toggleActividad = useCallback(
    (id) => {
      setActivas((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [setActivas]
  );

  // --- CRUD de Gastos Fijos ---
  const addGastoFijo = useCallback(
    ({ title, amount, icon = "receipt-outline", category = "Fijo" }) => {
      const nuevoGasto = {
        id: String(Date.now()),
        title: title.trim(),
        amount: Number(amount),
        icon,
        category,
      };
      setGastosFijos((prev) => [...prev, nuevoGasto]);
      return nuevoGasto;
    },
    [setGastosFijos]
  );

  const updateGastoFijo = useCallback(
    (id, changes) => {
      setGastosFijos((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, ...changes, amount: changes.amount ? Number(changes.amount) : g.amount }
            : g
        )
      );
    },
    [setGastosFijos]
  );

  const deleteGastoFijo = useCallback(
    (id) => {
      setGastosFijos((prev) => prev.filter((g) => g.id !== id));
    },
    [setGastosFijos]
  );

  // --- Presupuesto y Gastos Variables ---
  const updatePresupuesto = useCallback(
    (changes) => {
      setPresupuesto((prev) => ({
        ...prev,
        ...changes,
        ingresoMensual:
          changes.ingresoMensual !== undefined
            ? Number(changes.ingresoMensual)
            : prev.ingresoMensual,
        gastoVariableEstimado:
          changes.gastoVariableEstimado !== undefined
            ? Number(changes.gastoVariableEstimado)
            : prev.gastoVariableEstimado,
      }));
    },
    [setPresupuesto]
  );

  // --- Métricas Calculadas en Tiempo Real (Estado Derivado) ---
  const totalAhorrado = useMemo(() => {
    return metas.reduce((total, m) => {
      const aportesSum = (m.aportes || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      return total + aportesSum;
    }, 0);
  }, [metas]);

  const totalGastosFijos = useMemo(() => {
    return gastosFijos.reduce((sum, g) => sum + (Number(g.amount) || 0), 0);
  }, [gastosFijos]);

  // En modelo 'Vivienda fija': la liquidez libre es el sueldo menos las cuentas fijas desglosadas
  const montoLibreFijo = useMemo(() => {
    const libre = (presupuesto.ingresoMensual || 0) - totalGastosFijos;
    return Math.max(libre, 0);
  }, [presupuesto.ingresoMensual, totalGastosFijos]);

  // En modelo 'Vivienda variable': el gasto variable estimado reemplaza el desglose de cuentas fijas
  const montoLibreVariable = useMemo(() => {
    const libre = (presupuesto.ingresoMensual || 0) - (presupuesto.gastoVariableEstimado || 0);
    return Math.max(libre, 0);
  }, [presupuesto.ingresoMensual, presupuesto.gastoVariableEstimado]);

  // Monto libre activo según el perfil de vivienda seleccionado
  const montoLibre = useMemo(() => {
    return perfilVivienda === "variable" ? montoLibreVariable : montoLibreFijo;
  }, [perfilVivienda, montoLibreVariable, montoLibreFijo]);

  const value = useMemo(
    () => ({
      metas,
      activas,
      gastosFijos,
      presupuesto,
      perfilVivienda,
      setPerfilVivienda,
      totalAhorrado,
      totalGastosFijos,
      montoLibreFijo,
      montoLibreVariable,
      montoLibre,
      loaded: metasLoaded && activasLoaded && gastosLoaded && presupuestoLoaded && perfilLoaded,
      addMeta,
      updateMeta,
      deleteMeta,
      addAporte,
      toggleActividad,
      addGastoFijo,
      updateGastoFijo,
      deleteGastoFijo,
      updatePresupuesto,
    }),
    [
      metas,
      activas,
      gastosFijos,
      presupuesto,
      perfilVivienda,
      setPerfilVivienda,
      totalAhorrado,
      totalGastosFijos,
      montoLibreFijo,
      montoLibreVariable,
      montoLibre,
      metasLoaded,
      activasLoaded,
      gastosLoaded,
      presupuestoLoaded,
      perfilLoaded,
      addMeta,
      updateMeta,
      deleteMeta,
      addAporte,
      toggleActividad,
      addGastoFijo,
      updateGastoFijo,
      deleteGastoFijo,
      updatePresupuesto,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData debe usarse dentro de AppDataProvider");
  return context;
}
