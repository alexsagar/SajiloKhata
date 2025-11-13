"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { groupAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Props {
  groupId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function GroupInviteModal({ groupId, open, onOpenChange }: Props) {
  const { toast } = useToast()
  const [friends, setFriends] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    groupAPI
      .getEligibleFriends(groupId)
      .then((res: any) => setFriends(res?.data?.data || res?.data || []))
      .catch(() => setFriends([]))
  }, [open, groupId])

  const filtered = friends.filter((f) => `${f.firstName} ${f.lastName}`.toLowerCase().includes(query.toLowerCase()))

  const toggle = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }))

  const submit = async () => {
    const userIds = Object.keys(selected).filter((k) => selected[k])
    if (userIds.length === 0) return
    setLoading(true)
    try {
      await groupAPI.addMember(groupId, userIds[0] as any) // will override below
    } catch {}
    try {
      await (await import("@/lib/api")).groupAPI.updateGroup // noop to satisfy ts in dynamic import
    } catch {}
    try {
      const { api } = await import("@/lib/api")
      await api.post(`/groups/${groupId}/members`, { userIds })
      toast({ title: "Members invited", description: `Added ${userIds.length} member(s)` })
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: "Failed", description: e?.response?.data?.message || "" , variant: "destructive" })
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


