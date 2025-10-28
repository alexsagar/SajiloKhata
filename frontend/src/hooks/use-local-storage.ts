import { useState, useEffect } from "react";
import { isLocalStorageAvailable } from "@/lib/storage";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    if (isLocalStorageAvailable()) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          setValue(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Failed to get localStorage item:', error);
      }
    }
  }, [key]);

  const setStoredValue = (val: T) => {
    setValue(val);
    if (isLocalStorageAvailable()) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (error) {
        console.warn('Failed to set localStorage item:', error);
      }
    }
  };

  return [value, setStoredValue] as const;
}