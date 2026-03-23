"use client"

import { useQuery } from "@tanstack/react-query"
import { groupAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getInitials } from "@/lib/utils"

interface GroupActivityFeedProps {
  groupId: string
}

interface GroupActivityActor {
  firstName?: string
  lastName?: string
  avatar?: string
}

interface GroupActivityItem {
  id: string
  message: string
  createdAt: string
  actor?: GroupActivityActor
}

interface GroupActivityPayload {
  activities?: GroupActivityItem[]
}

function unwrapGroupActivityPayload(
  value: { data?: GroupActivityPayload } | GroupActivityPayload | undefined,
): GroupActivityPayload | undefined {
  if (!value) return undefined
  if ("data" in value) return value.data
  return value as GroupActivityPayload
}

export function GroupActivityFeed({ groupId }: GroupActivityFeedProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["group-activity", groupId],
    queryFn: () => groupAPI.getActivity(groupId, { page: 1, limit: 15 }),
  })

  const rawPayload = data?.data as { data?: GroupActivityPayload } | GroupActivityPayload | undefined
  const payload = unwrapGroupActivityPayload(rawPayload)
  const activities = Array.isArray(payload?.activities) ? payload.activities : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ScrollArea className="h-96 pr-3">
            <div className="space-y-3">
              {activities.map((activity) => {
                const actor = activity?.actor
                return (
                  <div key={activity.id} className="flex items-start gap-3 rounded-md border p-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={actor?.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(actor?.firstName || "", actor?.lastName || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
