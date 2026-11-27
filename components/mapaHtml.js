// Página del mapa (Leaflet + mapa base de OpenStreetMap) que MapaWeb.js muestra dentro de un WebView.
// Está en su propio archivo, sin nada de React Native, para poder revisarla con `npm run test:mapa`.
//
// Por qué OpenStreetMap y no CARTO: desde 2026 CARTO exige una clave para sus mapas base y, sin ella,
// dibuja encima la marca de agua "API KEY REQUIRED". Los mapas de OpenStreetMap no piden clave, pero su
// política de uso (https://operations.osmfoundation.org/policies/tiles/) exige tres cosas que cumple este archivo:
//   1. Mostrar la atribución "© OpenStreetMap contributors" (con enlace a /copyright).
//   2. Que cada petición diga de qué página viene (cabecera Referer): por eso MapaWeb.js carga esta página
//      con una dirección https real (URL_PROYECTO) y cada imagen del mapa lleva referrerPolicy.
//   3. Uso ligero: solo se piden las imágenes que se ven en pantalla (no se descargan zonas completas).
// Si algún día hace falta otro proveedor (MapTiler, Stadia…), solo se cambia la lista FUENTES_MAPA_BASE.

import { URL_PROYECTO, AGENTE_USUARIO } from "../constants/app.js";

// URL_PROYECTO: dirección con la que se carga la página (OpenStreetMap la recibe como Referer).
// AGENTE_USUARIO: se agrega al "User-Agent" del WebView para que quien administra el servidor de mapas sepa qué app es.
// Los dos viven en constants/app.js porque también los usa la consulta de lugares (utils/overpass.js).
export { URL_PROYECTO, AGENTE_USUARIO };

// Valor aceptado por OpenStreetMap: manda la dirección completa de la página como Referer.
export const POLITICA_REFERER = "no-referrer-when-downgrade";

const ATRIBUCION_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Se usa la primera; si no carga ninguna imagen se prueba la siguiente (otro servidor de la comunidad).
export const FUENTES_MAPA_BASE = [
  {
    nombre: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    atribucion: ATRIBUCION_OSM,
  },
  {
    nombre: "OpenStreetMap Francia",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    subdominios: "abc",
    maxZoom: 20,
    atribucion: `${ATRIBUCION_OSM}, tiles by <a href="https://www.openstreetmap.fr/">OpenStreetMap France</a>`,
  },
];

// Imágenes fallidas (sin ninguna cargada) antes de pasar a la siguiente fuente.
export const FALLOS_PARA_CAMBIAR = 4;

// Solo estos sitios pueden abrirse desde el mapa (los enlaces de atribución). Todo lo demás se ignora.
const ENLACES_PERMITIDOS = /^https:\/\/(www\.openstreetmap\.org|www\.openstreetmap\.fr|leafletjs\.com)(\/|$)/;
export const enlacePermitido = (url) => typeof url === "string" && ENLACES_PERMITIDOS.test(url);

// Mensajes mapa → app: { tipo: "listo" | "seleccion" | "sin-mapa" | "mapa-base" | "enlace" }
// Mensajes app → mapa: window.actualizar({ usuario, lugares, seleccionado, centrarEn, recentrar })
export const HTML_MAPA = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#mapa{height:100%;margin:0;background:#F5EEE3}
  .pin{width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;
       box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}
  .pin span{transform:rotate(45deg);font-size:13px}
  .pin.sel{width:34px;height:34px;box-shadow:0 0 0 4px rgba(183,134,62,.45),0 1px 6px rgba(0,0,0,.5)}
  .yo{width:18px;height:18px;border-radius:50%;background:#2B6FDE;border:3px solid #fff;box-shadow:0 0 0 2px rgba(43,111,222,.35)}
  .leaflet-control-attribution{font-size:10px}
</style></head>
<body><div id="mapa"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  function enviar(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  if (typeof L === "undefined") { enviar({ tipo: "sin-mapa" }); }
  else {
    var FUENTES = ${JSON.stringify(FUENTES_MAPA_BASE)};
    var POLITICA = ${JSON.stringify(POLITICA_REFERER)};
    var FALLOS = ${FALLOS_PARA_CAMBIAR};

    var mapa = L.map("mapa", { zoomControl: true }).setView([-12.0464, -77.0428], 14);

    // Los enlaces de atribución se abren en el navegador del celular, no dentro del mapa.
    document.addEventListener("click", function(e){
      var a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;
      e.preventDefault();
      enviar({ tipo: "enlace", url: a.href });
    }, true);

    // Mapa base: si la primera fuente no carga ninguna imagen, se prueba la siguiente.
    var capaBase = null, aviso = false;
    function usarFuente(i){
      if (capaBase) mapa.removeLayer(capaBase);
      var f = FUENTES[i], cargadas = 0, fallidas = 0;
      var opciones = { maxZoom: f.maxZoom, attribution: f.atribucion, referrerPolicy: POLITICA };
      if (f.subdominios) opciones.subdomains = f.subdominios;
      var capa = L.tileLayer(f.url, opciones);
      capaBase = capa;
      capa.on("tileload", function(){
        if (capaBase !== capa) return;
        cargadas++;
        if (aviso) { aviso = false; enviar({ tipo: "mapa-base", ok: true }); }
      });
      capa.on("tileerror", function(){
        if (capaBase !== capa || cargadas > 0) return;
        fallidas++;
        if (fallidas < FALLOS) return;
        if (i + 1 < FUENTES.length) usarFuente(i + 1);
        else if (!aviso) { aviso = true; enviar({ tipo: "mapa-base", ok: false }); }
      });
      capa.addTo(mapa);
    }
    usarFuente(0);

    var capaLugares = L.layerGroup().addTo(mapa);
    var marcaUsuario = null, circulo = null, primera = true, ultRec = 0, ultCentro = 0;
    function icono(tipo, sel){
      var color = tipo === "cajero" ? "#3E8E5A" : "#B7863E";
      var emoji = tipo === "cajero" ? "💵" : "🏦";
      return L.divIcon({ className: "", iconSize: sel ? [34,34] : [26,26], iconAnchor: sel ? [8,34] : [4,26],
        html: '<div class="pin' + (sel ? ' sel' : '') + '" style="background:' + color + '"><span>' + emoji + '</span></div>' });
    }
    window.actualizar = function(d){
      if (d.usuario) {
        var p = [d.usuario.latitude, d.usuario.longitude];
        if (!marcaUsuario) {
          marcaUsuario = L.marker(p, { icon: L.divIcon({ className: "", html: '<div class="yo"></div>', iconSize: [18,18], iconAnchor: [9,9] }) }).addTo(mapa);
          circulo = L.circle(p, { radius: d.usuario.accuracy || 30, color: "#2B6FDE", weight: 1, fillOpacity: 0.08 }).addTo(mapa);
        } else { marcaUsuario.setLatLng(p); circulo.setLatLng(p); circulo.setRadius(d.usuario.accuracy || 30); }
        if (primera) { mapa.setView(p, 15); primera = false; }
      }
      capaLugares.clearLayers();
      (d.lugares || []).forEach(function(l){
        var sel = l.id === d.seleccionado;
        L.marker([l.latitude, l.longitude], { icon: icono(l.tipo, sel), zIndexOffset: sel ? 1000 : 0 })
          .on("click", function(){ enviar({ tipo: "seleccion", id: l.id }); })
          .addTo(capaLugares);
      });
      if (d.centrarEn && d.centrarEn.t !== ultCentro) { ultCentro = d.centrarEn.t; mapa.setView([d.centrarEn.latitude, d.centrarEn.longitude], 17); }
      if (d.recentrar && d.recentrar !== ultRec && d.usuario) { ultRec = d.recentrar; mapa.setView([d.usuario.latitude, d.usuario.longitude], 15); }
    };
    enviar({ tipo: "listo" });
  }
</script></body></html>`;
