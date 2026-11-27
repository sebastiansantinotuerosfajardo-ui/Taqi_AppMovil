// Lógica pura (sin pantallas ni librerías nativas) de la renovación automática de la sesión.
// Se prueba con Node: npm run test:sesion

// Una sola renovación a la vez ("single-flight").
// Si 5 peticiones reciben "401" al mismo tiempo, todas esperan LA MISMA renovación. Es obligatorio
// porque el refresh token ROTA: si cada petición enviara el mismo token, la segunda llegaría con un
// token ya usado y el servidor lo tomaría por un robo y cerraría la sesión.
export function crearRenovadorUnico(renovar) {
  let enCurso = null;
  return () => {
    if (!enCurso) {
      enCurso = Promise.resolve()
        .then(renovar)
        .finally(() => {
          enCurso = null;
        });
    }
    return enCurso;
  };
}

// ¿Hay que renovar la sesión y repetir la petición? Solo si el servidor respondió "401" a una petición
// CON sesión (nunca a un login con contraseña incorrecta), todavía no se reintentó y existe refresh token.
export function debeRenovar({ estado, conSesion, yaReintentado, hayRefresh }) {
  return estado === 401 && Boolean(conSesion) && !yaReintentado && Boolean(hayRefresh);
}

// Qué significa la respuesta del servidor a "/auth/refresh":
//  - "renovada":     llegaron tokens nuevos
//  - "caducada":     el servidor dijo que esa sesión ya no vale (vencida, cerrada o token reutilizado) -> hay que iniciar sesión
//  - "sin-conexion": no hubo respuesta, o fue un error temporal (500, 429...) -> NO se cierra la sesión; se reintenta después
export function clasificarRenovacion(respuesta) {
  if (!respuesta) return "sin-conexion";
  if (respuesta.ok && respuesta.token && respuesta.refreshToken) return "renovada";
  if (respuesta.sinConexion) return "sin-conexion";
  if (respuesta.estado === 400 || respuesta.estado === 401 || respuesta.estado === 403) return "caducada";
  return "sin-conexion";
}

// Emisor mínimo de eventos (patrón Observer): quien quiera enterarse de algo se suscribe y recibe un
// aviso; el que avisa no necesita saber quién escucha.
export function crearEmisor() {
  const oyentes = new Set();
  return {
    suscribir(fn) {
      oyentes.add(fn);
      return () => oyentes.delete(fn); // devuelve la función para cancelar la suscripción
    },
    emitir(dato) {
      for (const fn of [...oyentes]) {
        try {
          fn(dato);
        } catch {
          // un oyente con error no debe impedir que los demás se enteren
        }
      }
    },
    cantidad: () => oyentes.size,
  };
}
