// Utility function to check if we're in a browser environment
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

// Utility function to check if localStorage is available
export function isLocalStorageAvailable(): boolean {
  return isBrowser() && !!window.localStorage
}

export function setItem(key: string, value: any) {
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      ;
    }
  }
}

export function getItem<T>(key: string): T | null {
  if (isLocalStorageAvailable()) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      ;
      return null;
    }
  }
  return null;
}

export function removeItem(key: string): void {
  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      ;
    }
  }
}

export function clear(): void {
  if (isLocalStorageAvailable()) {
    try {
      localStorage.clear();
    } catch (error) {
      ;
    }
  }
}