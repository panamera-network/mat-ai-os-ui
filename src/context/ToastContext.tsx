import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: Toast[]
  showToast: (message: string, kind?: ToastKind) => void
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastState>({
  toasts: [],
  showToast: () => {},
  dismissToast: () => {},
})

const TOAST_TTL_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, kind, message }])
      setTimeout(() => dismissToast(id), TOAST_TTL_MS)
    },
    [dismissToast],
  )

  return <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>{children}</ToastContext.Provider>
}

export function useToast() {
  return useContext(ToastContext)
}
