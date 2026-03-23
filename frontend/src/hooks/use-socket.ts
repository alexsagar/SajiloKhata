import { useEffect, useRef } from "react"
import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client"

type SocketConnectOptions = Partial<ManagerOptions & SocketOptions>

export function useSocket(url: string, options?: SocketConnectOptions) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = io(url, options)
    return () => {
      socketRef.current?.disconnect()
    }
  }, [url, options])

  return socketRef.current
}
