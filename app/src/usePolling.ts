import { useEffect } from "react";
import { AppState } from "react-native";

export function usePolling(refresh: () => unknown, intervalMs: number) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      timer ??= setInterval(refresh, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState !== "background") start();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
        start();
      } else if (state === "background") {
        stop();
      }
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [refresh, intervalMs]);
}
