"use client"

import { useState } from "react"
import { friendsAPI } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface InviteResponse {
  data?: {
    inviteUrl?: string
  }
}

interface ErrorWithMessage {
  response?: {
    data?: {
      message?: string
    }
  }
}

export function InviteFriendDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [link, setLink] = useState<string | null>(null)

  const create = async () => {
    try {
      const res = await friendsAPI.createInvite({ inviteeEmail: email || undefined, message: message || undefined }) as InviteResponse
      setLink(res.data?.inviteUrl || null)
      toast({ title: "Invite created", description: "Share the link with your friend" })
    } catch (error: unknown) {
      const err = error as ErrorWithMessage
      toast({ title: "Failed", description: err?.response?.data?.message || "", variant: "destructive" })
    }
  }

  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    toast({ title: "Link copied" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a friend</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email (optional)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" />
          </div>
          <div>
            <Label>Message (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Join me on SajiloKhata!" />
          </div>
          <div className="flex gap-2 justify-end">
            {link && (
              <Button variant="outline" onClick={copy}>
                Copy Link
              </Button>
            )}
            <Button onClick={create}>Generate Link</Button>
          </div>
          {link && <Input readOnly value={link} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}


