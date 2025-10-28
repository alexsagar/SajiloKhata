"use client"

import React from "react"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, UserPlus, Crown, Shield, User as UserIcon } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { groupAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { getInitials } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { GroupInviteModal } from "./group-invite-modal"

interface GroupMembersProps {
  groupId: string
}

export function GroupMembers({ groupId }: GroupMembersProps) {
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const queryClient = useQueryClient()

  const { data: group, isLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupAPI.getGroup(groupId),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => groupAPI.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] })
      toast({
        title: "Member removed",
        description: "The member has been removed from the group.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove member",
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <LoadingSpinner />
      </div>
    )
  }

  const groupData = group?.data
  const members = groupData?.members || []

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      owner: "default",
      admin: "secondary",
      member: "outline"
    } as const

    return (
      <Badge variant={variants[role as keyof typeof variants] || "outline"}>
        {role}
      </Badge>
    )
  }

  const handleRemoveMember = (userId: string) => {
    if (confirm("Are you sure you want to remove this member from the group?")) {
      removeMemberMutation.mutate(userId)
    }
  }

  return (
    <div className="space-y-6">
      <KanbanCard>
        <KanbanCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <KanbanCardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Group Members
              </KanbanCardTitle>
              <KanbanCardDescription>
                Manage who has access to this group
              </KanbanCardDescription>
            </div>
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Members
            </Button>
          </div>
        </KanbanCardHeader>
        <KanbanCardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No members in this group yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member: any) => (
                <div key={member.user._id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {getInitials(member.user.firstName, member.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getRoleBadge(member.role)}
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member.user._id)}
                          disabled={removeMemberMutation.isPending}
                        >
                          Remove from Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </KanbanCardContent>
      </KanbanCard>

      <GroupInviteModal groupId={groupId} open={inviteOpen} onOpenChange={setInviteOpen} />

      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle>Member Statistics</KanbanCardTitle>
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {members.filter((m: any) => m.role === 'admin').length}
              </p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {members.filter((m: any) => 
                  new Date(m.joinedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
              <p className="text-sm text-muted-foreground">New (30 days)</p>
            </div>
          </div>
        </KanbanCardContent>
      </KanbanCard>
    </div>
  )
}