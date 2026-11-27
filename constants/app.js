// Datos con los que TAQI se identifica ante los servicios públicos y gratuitos que usa (mapas de OpenStreetMap,
// consultas Overpass). Todos piden lo mismo: que cada app diga quién es y dónde se puede consultar.
// Sin esto, los servidores responden con errores como "HTTP 406" o muestran un cartel de "Access blocked".
export const NOMBRE_APP = "TAQI";
export const VERSION_APP = "1.0";
export const URL_PROYECTO = "https://github.com/sebastiansantinotuerosfajardo-ui/Taqi_AppMovil";

// Va en la cabecera User-Agent. Solo caracteres ASCII imprimibles: Android rechaza cualquier otro.
export const AGENTE_USUARIO = `${NOMBRE_APP}/${VERSION_APP} (+${URL_PROYECTO})`;
