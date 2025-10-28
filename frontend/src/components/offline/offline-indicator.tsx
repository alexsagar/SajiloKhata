"use client"

import { useOnlineStatus } from "@/hooks/use-online-status"
import { useOffline } from "@/contexts/offline-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { WifiOff, RefreshCw } from "lucide-react"

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const { pendingActions, syncPendingActions } = useOffline()

  if (isOnline && pendingActions.length === 0) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert className="max-w-md mx-auto">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            {!isOnline
              ? "You're offline. Changes will sync when reconnected."
              : `${pendingActions.length} changes pending sync`}
          </span>
          {isOnline && pendingActions.length > 0 && (
            <Button size="sm" variant="outline" onClick={syncPendingActions} className="ml-2 bg-transparent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
