import { useEffect, useState } from "react";
import { getItem, setItem } from "../services/storage";

// Igual que useState, pero el valor se carga y se guarda en AsyncStorage.
// Devuelve [valor, setValor, cargado].
export default function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loadedKey, setLoadedKey] = useState(null);

  // Al montar (o si cambia la clave) se lee lo guardado
  useEffect(() => {
    let active = true;
    getItem(key, initialValue).then((stored) => {
      if (active) {
        setValue(stored);
        setLoadedKey(key);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Cada vez que el valor cambia (y ya se cargó) se guarda
  useEffect(() => {
    if (loadedKey === key) setItem(key, value);
  }, [key, value, loadedKey]);

  return [value, setValue, loadedKey === key];
}
