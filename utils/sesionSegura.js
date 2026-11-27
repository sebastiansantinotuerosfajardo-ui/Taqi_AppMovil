// Lógica pura (sin pantallas ni librerías nativas) del almacenamiento seguro de la sesión.
// Se prueba con Node: npm run test:seguridad

// expo-secure-store solo acepta claves con letras, números, ".", "-" y "_".
// Por eso la clave antigua "@taqi:token" (con "@" y ":") no sirve y se renombró.
export const esClaveValida = (clave) => typeof clave === "string" && /^[\w.-]+$/.test(clave);

export const CLAVE_TOKEN = "taqi.token";

// Preferencias de seguridad de cada usuario (bloqueo biométrico). Se limpian caracteres no permitidos.
export const claveBloqueo = (userId) => `taqi.bloqueo.${String(userId).replace(/[^\w.-]/g, "_")}`;

// Lee un valor del almacén seguro y, si todavía está en el almacén antiguo (AsyncStorage, sin cifrar),
// lo MUEVE al seguro. Reglas:
//  - la copia antigua solo se borra cuando la segura quedó guardada (nunca se pierde la sesión);
//  - si ya existe la segura, cualquier copia antigua sobrante se borra (no se deja texto plano).
export async function leerConMigracion({ leerSeguro, guardarSeguro, leerAntiguo, borrarAntiguo }) {
  const seguro = await leerSeguro();
  const antiguo = await leerAntiguo();
  const hayAntiguo = antiguo !== null && antiguo !== undefined && antiguo !== "";
  if (seguro) {
    if (hayAntiguo) await borrarAntiguo();
    return seguro;
  }
  if (hayAntiguo) {
    const guardado = await guardarSeguro(antiguo);
    if (guardado) await borrarAntiguo();
    return antiguo;
  }
  return null;
}
