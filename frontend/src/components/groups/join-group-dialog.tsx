"use client"

import type React from "react"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { groupAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required").toUpperCase(),
})

type JoinGroupFormData = z.infer<typeof joinGroupSchema>

interface JoinGroupDialogProps {
  children: React.ReactNode
}

export function JoinGroupDialog({ children }: JoinGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JoinGroupFormData>({
    resolver: zodResolver(joinGroupSchema),
  })

  const joinGroupMutation = useMutation({
    mutationFn: (data: JoinGroupFormData) => groupAPI.joinGroup(data.inviteCode),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] })
      toast({
        title: "Joined group",
        description: `You've successfully joined "${response.data.name}".`,
      })
      setOpen(false)
      reset()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to join group",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: JoinGroupFormData) => {
    joinGroupMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm w-auto max-h-[85vh] mx-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">Join Group</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter the invite code shared by a group member to join their group.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="inviteCode" className="text-xs">Invite Code</Label>
            <Input
              id="inviteCode"
              placeholder="e.g., ABC123"
              {...register("inviteCode")}
              disabled={joinGroupMutation.isPending}
              className="uppercase h-8 text-sm"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase()
              }}
            />
            {errors.inviteCode && <p className="text-xs text-destructive">{errors.inviteCode.message}</p>}
            <p className="text-xs text-muted-foreground">
              The invite code is usually 6 characters long and case-insensitive.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={joinGroupMutation.isPending}
              size="sm"
              className="h-8 px-3"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={joinGroupMutation.isPending} size="sm" className="h-8 px-3">
              {joinGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}