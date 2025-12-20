"use client"

import React, { useState } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { groupAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { CurrencySelector } from "@/components/currency/currency-selector"

interface GroupSettingsProps {
  groupId: string
}

export function GroupSettings({ groupId }: GroupSettingsProps) {
  const queryClient = useQueryClient()

  // Fetch group data
  const { data: group, isLoading, error } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupAPI.getGroup(groupId),
    enabled: !!groupId,
  })

  const [settings, setSettings] = useState({
    name: "",
    description: "",
    allowMemberInvites: true,
    requireApprovalForExpenses: false,
    defaultSplitType: "equal" as const,
  })

  // Update settings when group data is loaded
  React.useEffect(() => {
    if (group?.data || group) {
      const groupData = group.data || group
      setSettings({
        name: groupData.name || "",
        description: groupData.description || "",
        allowMemberInvites: groupData.settings?.allowMemberInvites ?? true,
        requireApprovalForExpenses: groupData.settings?.requireApprovalForExpenses ?? false,
        defaultSplitType: groupData.settings?.defaultSplitType || "equal",
      })
    }
  }, [group])

  const updateGroupMutation = useMutation({
    mutationFn: (data: any) => {
      
      return groupAPI.updateGroup(groupId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] })
      queryClient.invalidateQueries({ queryKey: ["group", groupId] })
      toast({
        title: "Settings updated",
        description: "Group settings have been updated successfully.",
      })
    },
    onError: (error: any) => {
      
      
      
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          "Failed to update group settings"
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    },
  })

  const handleSave = () => {
    try {
      // Validate required fields
      if (!settings.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Group name is required",
          variant: "destructive",
        })
        return
      }

      const updateData = {
        name: settings.name.trim(),
        description: settings.description.trim(),
        settings: {
          allowMemberInvites: settings.allowMemberInvites,
          requireApprovalForExpenses: settings.requireApprovalForExpenses,
          defaultSplitType: settings.defaultSplitType,
        },
      }

      
      updateGroupMutation.mutate(updateData)
    } catch (error) {
      
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving",
        variant: "destructive",
      })
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {isLoading && (
        <KanbanCard>
          <KanbanCardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading group settings...</span>
          </KanbanCardContent>
        </KanbanCard>
      )}

      {error && (
        <KanbanCard>
          <KanbanCardContent className="p-6">
            <div className="text-center text-destructive">
              <p>Failed to load group settings</p>
              <p className="text-sm text-muted-foreground">
                {error.message || "Please try refreshing the page"}
              </p>
            </div>
          </KanbanCardContent>
        </KanbanCard>
      )}

      {!isLoading && !error && group && (
        <>
          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Basic Information</KanbanCardTitle>
              <KanbanCardDescription>Update your group's basic details.</KanbanCardDescription>
            </KanbanCardHeader>
            <KanbanCardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => updateSetting("name", e.target.value)}
                  disabled={updateGroupMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => updateSetting("description", e.target.value)}
                  disabled={updateGroupMutation.isPending}
                />
              </div>


            </KanbanCardContent>
          </KanbanCard>

          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Group Permissions</KanbanCardTitle>
              <KanbanCardDescription>Control how members can interact with the group.</KanbanCardDescription>
            </KanbanCardHeader>
            <KanbanCardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowMemberInvites">Allow member invites</Label>
                  <p className="text-sm text-muted-foreground">
                    Let group members invite new people to the group
                  </p>
                </div>
                <Switch
                  id="allowMemberInvites"
                  checked={settings.allowMemberInvites}
                  onCheckedChange={(checked) => updateSetting("allowMemberInvites", checked)}
                  disabled={updateGroupMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireApproval">Require expense approval</Label>
                  <p className="text-sm text-muted-foreground">
                    All expenses must be approved by group admins
                  </p>
                </div>
                <Switch
                  id="requireApproval"
                  checked={settings.requireApprovalForExpenses}
                  onCheckedChange={(checked) => updateSetting("requireApprovalForExpenses", checked)}
                  disabled={updateGroupMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultSplitType">Default Split Type</Label>
                <Select
                  value={settings.defaultSplitType}
                  onValueChange={(value) => updateSetting("defaultSplitType", value)}
                  disabled={updateGroupMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Equal Split</SelectItem>
                    <SelectItem value="percentage">Percentage Split</SelectItem>
                    <SelectItem value="exact">Exact Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </KanbanCardContent>
          </KanbanCard>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateGroupMutation.isPending}
            >
              {updateGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </>
      )}
    </div>
  )
}