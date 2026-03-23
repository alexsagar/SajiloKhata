"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { api, groupAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { syncGroupState } from "@/lib/server-state"

interface Props {
  groupId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

interface FriendOption {
  _id: string
  firstName?: string
  lastName?: string
}

interface ErrorWithMessage {
  response?: {
    data?: {
      message?: string
    }
  }
}

export function GroupInviteModal({ groupId, open, onOpenChange }: Props) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [friends, setFriends] = useState<FriendOption[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    groupAPI
      .getEligibleFriends(groupId)
      .then((res: { data?: { data?: FriendOption[] } | FriendOption[] }) => {
        const payload = res?.data
        const nextFriends = Array.isArray(payload) ? payload : payload?.data || []
        setFriends(nextFriends)
      })
      .catch(() => setFriends([]))
  }, [open, groupId])

  const filtered = friends.filter((f) => `${f.firstName} ${f.lastName}`.toLowerCase().includes(query.toLowerCase()))

  const toggle = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }))

  const submit = async () => {
    const userIds = Object.keys(selected).filter((k) => selected[k])
    if (userIds.length === 0) return
    setLoading(true)
    try {
      await api.post(`/groups/${groupId}/members`, { userIds })
      syncGroupState(queryClient, { groupId, includeNotifications: true })
      toast({ title: "Members invited", description: `Added ${userIds.length} member(s)` })
      onOpenChange(false)
    } catch (error: unknown) {
      const err = error as ErrorWithMessage
      toast({ title: "Failed", description: err?.response?.data?.message || "", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-auto max-h-[85vh] mx-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">Invite Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Search friends..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 text-sm" />
          <div className="max-h-40 overflow-auto space-y-2">
            {filtered.map((f) => (
              <label key={f._id} className="flex items-center gap-2 p-2 border rounded">
                <Checkbox checked={!!selected[f._id]} onCheckedChange={() => toggle(f._id)} />
                <span className="text-xs">{f.firstName} {f.lastName}</span>
              </label>
            ))}
            {filtered.length === 0 && <div className="text-sm text-muted-foreground">No eligible friends</div>}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm" className="h-8 px-3">Cancel</Button>
            <Button onClick={submit} disabled={loading} size="sm" className="h-8 px-3">Add to group</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


