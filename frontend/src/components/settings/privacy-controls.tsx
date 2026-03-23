"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMutation } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { userAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import type { User } from "@/types/user"

interface UpdatePreferencesResponse {
  data?: {
    user?: {
      preferences?: User["preferences"]
    }
  }
}

interface ErrorWithMessage {
  message?: string
}

export function PrivacyControls() {
  const { user, updateUser } = useAuth()
  const [profileVisibility, setProfileVisibility] = useState<"public" | "friends" | "private">("friends")

  useEffect(() => {
    const next = user?.preferences?.privacy?.profileVisibility
    if (next === "public" || next === "friends" || next === "private") {
      setProfileVisibility(next)
    }
  }, [user])

  const mutation = useMutation({
    mutationFn: () => userAPI.updatePreferences({ privacy: { profileVisibility } }),
    onSuccess: (response: UpdatePreferencesResponse) => {
      updateUser({ preferences: response.data?.user?.preferences })
      toast({
        title: "Privacy updated",
        description: "Your privacy settings were saved.",
      })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Failed to update privacy",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Visibility</CardTitle>
          <CardDescription>
            Control who can see your profile information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profileVisibility">Profile Visibility</Label>
            <Select
              value={profileVisibility}
              onValueChange={(value) => setProfileVisibility(value as "public" | "friends" | "private")}
              disabled={mutation.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Privacy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
