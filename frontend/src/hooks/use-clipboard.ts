import { useCallback } from "react";

export function useClipboard() {
  const copy = useCallback((text: string) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    }
  }, []);
  return { copy };
}