import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export function useApiData<T>(path: string, initialData: T, fallbackData?: T) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setIsLoading(false);
      setError(null);
      setData(initialData);
      return;
    }

    let active = true;

    async function load() {
      try {
        setIsLoading(true);
        const nextData = await apiGet<T>(path);

        if (!active) {
          return;
        }

        setData(nextData);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }

        if (fallbackData !== undefined) {
          setData(fallbackData);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : "Unable to load data");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [path]);

  return { data, isLoading, error };
}
