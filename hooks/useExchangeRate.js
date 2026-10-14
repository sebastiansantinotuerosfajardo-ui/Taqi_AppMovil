import { useCallback, useEffect, useState } from "react";

// Hook personalizado para consumir el tipo de cambio gestionando ciclo de vida, carga y errores
export default function useExchangeRate(fetcher, base) {
  const [state, setState] = useState({
    rate: null,
    updated: null,
    loading: true,
    error: null,
    isMock: false,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Retardo simulado temporal de 4 segundos para capturar el ActivityIndicator
    new Promise((resolve) => setTimeout(resolve, 4000))
      .then(() => fetcher(base, "PEN"))
      .then((result) => {
        if (active) {
          setState({
            rate: result.rate,
            updated: result.updated,
            loading: false,
            error: null,
            isMock: !!result.isMock,
          });
        }
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error && error.name === "AbortError"
            ? "Tiempo de espera agotado (Timeout)"
            : "No se pudo obtener el tipo de cambio";
        setState({
          rate: null,
          updated: null,
          loading: false,
          error: message,
          isMock: false,
        });
      });

    return () => {
      active = false;
    };
  }, [fetcher, base, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, reload };
}
