import { crearEmisor } from "../utils/renovacion";

// Aviso de "la sesión ya no se puede renovar" (Observer). La capa de red lo emite sin saber nada de
// pantallas; AuthContext se suscribe y devuelve a la persona al inicio de sesión.
const emisor = crearEmisor();

export const alCaducarSesion = (fn) => emisor.suscribir(fn);
export const avisarSesionCaducada = () => emisor.emitir({ motivo: "caducada" });
