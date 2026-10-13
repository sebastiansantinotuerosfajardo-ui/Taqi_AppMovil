import { createNavigationContainerRef } from "@react-navigation/native";

// Referencia al navegador principal: permite navegar desde fuera de una pantalla
export const navigationRef = createNavigationContainerRef();

export function resetTo(name) {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name }] });
  }
}