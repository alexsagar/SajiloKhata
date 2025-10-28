import { io, Socket } from "socket.io-client";

export function createSocket(url: string, options?: any): Socket {
  return io(url, options);
}