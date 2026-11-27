// Cálculos de geografía sencillos (sin librerías externas).

const RADIO_TIERRA_M = 6371000;
const aRadianes = (grados) => (grados * Math.PI) / 180;

// Distancia en metros entre dos coordenadas (fórmula de Haversine).
export function distanciaMetros(a, b) {
  const dLat = aRadianes(b.latitude - a.latitude);
  const dLng = aRadianes(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.latitude)) * Math.cos(aRadianes(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(x));
}

// Texto corto: "350 m" o "1.2 km".
export function textoDistancia(metros) {
  if (!Number.isFinite(metros)) return "";
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  return `${(metros / 1000).toFixed(1)} km`;
}
