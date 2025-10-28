import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(url: string, options?: any) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(url, options);
    return () => {
      socketRef.current?.disconnect();
    };
  }, [url, options]);

  return socketRef.current;
}