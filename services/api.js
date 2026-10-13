import axios from "axios";

// API pública de tipo de cambio (sin clave)
const BASE_URL = "https://open.er-api.com/v6/latest";

function readRate(data, target) {
  if (!data || data.result !== "success" || !data.rates || typeof data.rates[target] !== "number") {
    throw new Error("Respuesta inesperada de la API");
  }
  return { rate: data.rates[target], updated: data.time_last_update_utc };
}

// Consumo de la API con fetch (con tiempo máximo de espera)
export async function getRateWithFetch(base = "USD", target = "PEN") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${BASE_URL}/${base}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return readRate(data, target);
  } finally {
    clearTimeout(timer);
  }
}

// Consumo de la misma API con axios
export async function getRateWithAxios(base = "EUR", target = "PEN") {
  const { data } = await axios.get(`${BASE_URL}/${base}`, { timeout: 8000 });
  return readRate(data, target);
}
