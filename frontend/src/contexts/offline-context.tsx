"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { offlineManager } from "@/lib/offline-manager"

interface OfflineContextType {
  isOnline: boolean
  pendingActions: any[]
  syncPendingActions: () => Promise<void>
  addPendingAction: (action: any) => void
  removePendingAction: (id: string) => void
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus()
  const [pendingActions, setPendingActions] = useState<any[]>([])

  useEffect(() => {
    // Load pending actions from storage on mount
    const loadPendingActions = async () => {
      const actions = await offlineManager.getPendingActions()
      setPendingActions(actions)
    }
    loadPendingActions()
  }, [])

  useEffect(() => {
    // Sync pending actions when coming back online
    if (isOnline && pendingActions.length > 0) {
      syncPendingActions()
    }
  }, [isOnline, pendingActions])

  const syncPendingActions = async () => {
    try {
      await offlineManager.syncPendingActions()
      setPendingActions([])
    } catch (error) {
      
    }
  }

  const addPendingAction = (action: any) => {
    const newAction = { ...action, id: Date.now().toString() }
    setPendingActions((prev) => [...prev, newAction])
    offlineManager.addPendingAction(newAction)
  }

  const removePendingAction = (id: string) => {
    setPendingActions((prev) => prev.filter((action) => action.id !== id))
    offlineManager.removePendingAction(id)
  }

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingActions,
        syncPendingActions,
        addPendingAction,
        removePendingAction,
      }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  const context = useContext(OfflineContext)
  if (context === undefined) {
    throw new Error("useOffline must be used within an OfflineProvider")
  }
  return context
}
