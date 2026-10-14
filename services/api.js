import axios from "axios";
import mockRates from "../constants/exchangeRatesMock.json";

// API pública de tipo de cambio en tiempo real (ExchangeRate-API - open.er-api.com)
const BASE_URL = "https://open.er-api.com/v6/latest";

function readRate(data, target, isMock = false) {
  if (!data || data.result !== "success" || !data.rates || typeof data.rates[target] !== "number") {
    throw new Error("Respuesta inesperada de la API");
  }
  return {
    rate: data.rates[target],
    updated: data.time_last_update_utc,
    isMock,
  };
}

// Consumo de la API con fetch nativo de JavaScript con AbortController y timeout
export async function getRateWithFetch(base = "USD", target = "PEN") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${BASE_URL}/${base}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return readRate(data, target, false);
  } catch (error) {
    // Si falla la red o el servidor externo, fallback a mock local para resiliencia offline
    console.warn("[api.js] Error al consultar con fetch, usando mock local:", error?.message);
    if (mockRates && mockRates.rates && mockRates.rates[target]) {
      return readRate(mockRates, target, true);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Consumo de la API utilizando la librería cliente Axios con interceptor de timeout
export async function getRateWithAxios(base = "EUR", target = "PEN") {
  try {
    const { data } = await axios.get(`${BASE_URL}/${base}`, { timeout: 8000 });
    return readRate(data, target, false);
  } catch (error) {
    // Fallback a mock local en caso de error de red
    console.warn("[api.js] Error al consultar con axios, usando mock local:", error?.message);
    if (mockRates && mockRates.rates && mockRates.rates[target]) {
      // Ajuste proporcional para EUR desde mock USD si aplica
      const eurRate = base === "EUR" ? (mockRates.rates[target] / (mockRates.rates.EUR || 1)) : mockRates.rates[target];
      return {
        rate: Number(eurRate.toFixed(4)),
        updated: mockRates.time_last_update_utc,
        isMock: true,
      };
    }
    throw error;
  }
}

// Función explícita para cargar datos desde mock local (.json) según rúbrica
export function getLocalMockRate(base = "USD", target = "PEN") {
  return readRate(mockRates, target, true);
}
