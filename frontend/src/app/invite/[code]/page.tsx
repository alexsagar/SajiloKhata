"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { friendsAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

export default function InviteAcceptPage({ params }: { params: { code: string } }) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [invite, setInvite] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const code = params.code

  useEffect(() => {
    friendsAPI
      .getInvite(code)
      .then((res) => setInvite(res.data))
      .catch(() => setInvite(null))
      .finally(() => setLoading(false))
  }, [code])

  const accept = async () => {
    try {
      await friendsAPI.acceptInvite(code)
      toast({ title: "You're now friends!" })
      router.push("/friends")
    } catch (e: any) {
      toast({ title: "Failed to accept", description: e?.response?.data?.message || "" , variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
            <CardDescription>This invite is invalid or expired.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You're invited</CardTitle>
          <CardDescription>
            {invite.inviter.firstName} {invite.inviter.lastName} invited you to connect on Khutrukey.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Expires: {new Date(invite.expiresAt).toLocaleString()}</p>
          {!isAuthenticated ? (
            <Button onClick={() => router.push("/login?redirect=/invite/" + code)}>Login to accept</Button>
          ) : (
            <Button onClick={accept}>Accept invite</Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


