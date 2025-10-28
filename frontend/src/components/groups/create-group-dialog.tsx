"use client"

import React from "react"

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
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { groupAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { CurrencySelector } from "@/components/currency/currency-selector"
import { useAuth } from "@/contexts/auth-context"

const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
})

type CreateGroupFormData = z.infer<typeof createGroupSchema>

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),

  })



  const createGroupMutation = useMutation({
    mutationFn: groupAPI.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] })
      toast({
        title: "Group created",
        description: "Your group has been created successfully.",
      })
      onOpenChange(false)
      reset()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create group",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: CreateGroupFormData) => {
    createGroupMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">Create New Group</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Create a group to start splitting expenses with friends and family.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g., Roommates, Trip to Paris"
              {...register("name")}
              disabled={createGroupMutation.isPending}
              className="h-8 text-sm"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this group for?"
              {...register("description")}
              disabled={createGroupMutation.isPending}
              className="min-h-[50px] text-sm"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createGroupMutation.isPending}
              size="sm"
              className="h-8 px-3"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createGroupMutation.isPending} size="sm" className="h-8 px-3">
              {createGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
