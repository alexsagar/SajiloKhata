import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client"

type SocketConnectOptions = Partial<ManagerOptions & SocketOptions>

export function createSocket(url: string, options?: SocketConnectOptions): Socket {
  return io(url, options)
}
