import { useEffect, useRef } from 'react'
import { WS_URL } from '../config'

export function useSocket(onMessage: (data: unknown) => void) {
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>

    const connect = () => {
      const socket = new WebSocket(WS_URL)
      socketRef.current = socket

      socket.onmessage = (event) => {
        try {
          onMessage(JSON.parse(event.data))
        } catch {
          onMessage(event.data)
        }
      }

      socket.onclose = () => {
        retryTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      clearTimeout(retryTimer)
      socketRef.current?.close()
    }
  }, [onMessage])

  return socketRef
}
