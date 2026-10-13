import { useCallback, useEffect, useState } from "react";

// Pide el tipo de cambio con la función "fetcher" y controla carga y error.
export default function useExchangeRate(fetcher, base) {
  const [state, setState] = useState({ rate: null, updated: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcher(base, "PEN")
      .then((result) => {
        if (active) setState({ rate: result.rate, updated: result.updated, loading: false, error: null });
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error && error.name === "AbortError"
            ? "Tiempo de espera agotado"
            : "No se pudo obtener el tipo de cambio";
        setState({ rate: null, updated: null, loading: false, error: message });
      });

    return () => {
      active = false;
    };
  }, [fetcher, base, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, reload };
}
