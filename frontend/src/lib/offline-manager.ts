"use client"

import { isLocalStorageAvailable } from "./storage"

interface PendingAction {
  id: string
  type: string
  data: any
  timestamp: number
  retries: number
}

class OfflineManager {
  private storageKey = "khutrukey-pending-actions"
  private maxRetries = 3

  async getPendingActions(): Promise<PendingAction[]> {
    try {
      if (isLocalStorageAvailable()) {
        const stored = localStorage.getItem(this.storageKey)
        return stored ? JSON.parse(stored) : []
      }
      return []
    } catch (error) {
      console.error("Failed to get pending actions:", error)
      return []
    }
  }

  async addPendingAction(action: Omit<PendingAction, "timestamp" | "retries">): Promise<void> {
    try {
      const actions = await this.getPendingActions()
      const newAction: PendingAction = {
        ...action,
        timestamp: Date.now(),
        retries: 0,
      }
      actions.push(newAction)
      if (isLocalStorageAvailable()) {
        localStorage.setItem(this.storageKey, JSON.stringify(actions))
      }
    } catch (error) {
      console.error("Failed to add pending action:", error)
    }
  }

  async removePendingAction(id: string): Promise<void> {
    try {
      const actions = await this.getPendingActions()
      const filtered = actions.filter((action) => action.id !== id)
      if (isLocalStorageAvailable()) {
        localStorage.setItem(this.storageKey, JSON.stringify(filtered))
      }
    } catch (error) {
      console.error("Failed to remove pending action:", error)
    }
  }

  async syncPendingActions(): Promise<void> {
    const actions = await this.getPendingActions()

    for (const action of actions) {
      try {
        await this.executeAction(action)
        await this.removePendingAction(action.id)
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error)

        if (action.retries < this.maxRetries) {
          action.retries++
          const actions = await this.getPendingActions()
          const index = actions.findIndex((a) => a.id === action.id)
          if (index !== -1) {
            actions[index] = action
            if (isLocalStorageAvailable()) {
              localStorage.setItem(this.storageKey, JSON.stringify(actions))
            }
          }
        } else {
          // Remove action after max retries
          await this.removePendingAction(action.id)
        }
      }
    }
  }

  private async executeAction(action: PendingAction): Promise<void> {
    // Import API functions dynamically to avoid circular dependencies
    const { expenseAPI, groupAPI } = await import("./api")

    switch (action.type) {
      case "CREATE_EXPENSE":
        await expenseAPI.createExpense(action.data)
        break
      case "UPDATE_EXPENSE":
        await expenseAPI.updateExpense(action.data.id, action.data)
        break
      case "DELETE_EXPENSE":
        await expenseAPI.deleteExpense(action.data.id)
        break
      case "CREATE_GROUP":
        await groupAPI.createGroup(action.data)
        break
      case "UPDATE_GROUP":
        await groupAPI.updateGroup(action.data.id, action.data)
        break
      default:
        console.warn(`Unknown action type: ${action.type}`)
    }
  }

  async clearAllPendingActions(): Promise<void> {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(this.storageKey)
    }
  }
}

export const offlineManager = new OfflineManager()
