"use client"

import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { queryKeys } from "./query-keys"

type GroupSyncScope = {
  groupId?: string | null
  expenseId?: string | null
  includeNotifications?: boolean
}

type SyncMessage =
  | { type: "invalidate-group"; payload: GroupSyncScope }
  | { type: "invalidate-dashboard"; payload?: { includeNotifications?: boolean } }

const BROADCAST_CHANNEL_NAME = "sajilo-khata-server-state"

function supportsBroadcastChannel() {
  return typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined"
}

function getGroupScopedKeys(groupId: string): QueryKey[] {
  return [
    queryKeys.groups.detail(groupId),
    queryKeys.groups.balance(groupId),
    queryKeys.groups.settlements(groupId),
    queryKeys.groups.activity(groupId),
    queryKeys.groups.expensesForBalance(groupId),
    queryKeys.groups.expenses(groupId),
    queryKeys.groups.eligibleFriends(groupId),
  ]
}

export function invalidateDashboardQueries(queryClient: QueryClient, options?: { includeNotifications?: boolean }) {
  queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.expenses.recent() })
  queryClient.invalidateQueries({ queryKey: queryKeys.expenses.summary() })
  queryClient.invalidateQueries({ queryKey: queryKeys.groups.userGroups() })
  queryClient.invalidateQueries({ queryKey: queryKeys.groups.myBalance() })
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.balanceSummary() })
  if (options?.includeNotifications) {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() })
  }
}

export function invalidateGroupQueries(queryClient: QueryClient, scope: GroupSyncScope = {}) {
  const groupId = scope.groupId ? String(scope.groupId) : ""

  invalidateDashboardQueries(queryClient, { includeNotifications: scope.includeNotifications ?? true })

  if (groupId) {
    for (const queryKey of getGroupScopedKeys(groupId)) {
      queryClient.invalidateQueries({ queryKey })
    }
  }

  if (scope.expenseId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(String(scope.expenseId)) })
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.comments(String(scope.expenseId)) })
  }

  queryClient.invalidateQueries({
    predicate: (query) => {
      const [firstKey] = query.queryKey
      return typeof firstKey === "string" && firstKey.startsWith("analytics-")
    },
  })
}

export function broadcastServerState(message: SyncMessage) {
  if (!supportsBroadcastChannel()) return
  const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  channel.postMessage(message)
  channel.close()
}

export function installServerStateBroadcast(queryClient: QueryClient) {
  if (!supportsBroadcastChannel()) return () => {}

  const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    const message = event.data
    if (!message) return

    if (message.type === "invalidate-group") {
      invalidateGroupQueries(queryClient, message.payload)
      return
    }

    if (message.type === "invalidate-dashboard") {
      invalidateDashboardQueries(queryClient, message.payload)
    }
  }

  return () => channel.close()
}

export function syncGroupState(queryClient: QueryClient, scope: GroupSyncScope = {}) {
  invalidateGroupQueries(queryClient, scope)
  broadcastServerState({ type: "invalidate-group", payload: scope })
}

export function syncDashboardState(queryClient: QueryClient, options?: { includeNotifications?: boolean }) {
  invalidateDashboardQueries(queryClient, options)
  broadcastServerState({ type: "invalidate-dashboard", payload: options })
}
