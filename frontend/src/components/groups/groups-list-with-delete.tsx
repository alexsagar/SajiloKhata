"use client"

import { useState } from "react"
import { KanbanCard, KanbanCardContent } from "@/components/ui/kanban-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, Calendar, MoreHorizontal, Trash2, Settings, UserPlus } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { groupAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export function GroupsListWithDelete() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<any>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: groups, isLoading } = useQuery({
    queryKey: ["user-groups"],
    queryFn: groupAPI.getGroups,
  })

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => groupAPI.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] })
      toast({
        title: "Group deleted",
        description: `"${groupToDelete?.name}" has been deleted successfully.`,
      })
      setGroupToDelete(null)
      setIsDeleteDialogOpen(false)
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete group",
        description: error.response?.data?.message || "An error occurred while deleting the group.",
        variant: "destructive"
      })
    }
  })

  const handleDeleteGroup = (group: any) => {
    setGroupToDelete(group)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      deleteGroupMutation.mutate(groupToDelete._id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const userGroups = groups?.data?.data || groups?.data || []

  if (userGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
        <p className="text-muted-foreground mb-4">Create your first group to start splitting expenses with friends</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {userGroups.map((group: any) => (
          <KanbanCard key={group.id ?? group._id} className="hover:shadow-md transition-shadow">
            <KanbanCardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{group?.name ?? "Untitled"}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{group.description || "No description"}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/groups/${group._id}`}>
                        <Users className="h-4 w-4 mr-2" />
                        View Group
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/groups/${group._id}/settings`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/groups/${group._id}/members`}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Members
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteGroup(group)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{group.members?.length || 0} members</span>
                  </div>
                  <Badge variant={group.isActive ? "default" : "secondary"}>
                    {group.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{formatCurrency(group.totalExpenses || 0)}</span>
                  <span className="text-muted-foreground ml-1">total expenses</span>
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Created {formatDate(group?.createdAt)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button asChild className="w-full">
                  <Link href={`/groups/${group._id}`}>View Group</Link>
                </Button>
              </div>
            </KanbanCardContent>
          </KanbanCard>
        ))}
      </div>

      {/* Delete Group Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm w-auto max-h-[85vh] mx-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-semibold">Delete Group</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete "{groupToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="h-2 w-2 text-red-600" />
                  </div>
                </div>
                <div className="text-xs">
                  <p className="font-medium text-red-800 mb-1">This action cannot be undone</p>
                  <ul className="text-red-700 space-y-1">
                    <li>• All group data will be permanently deleted</li>
                    <li>• All shared expenses will be removed</li>
                    <li>• Group members will lose access to this group</li>
                    <li>• Chat history will be deleted</li>
                    <li>• Outstanding balances should be settled first</li>
                  </ul>
                </div>
              </div>
            </div>

            {groupToDelete && (groupToDelete.totalExpenses > 0 || (groupToDelete.members?.length || 0) > 1) && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-medium text-sm">Warning</span>
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  {groupToDelete.totalExpenses > 0 && (
                    <p>This group has {formatCurrency(groupToDelete.totalExpenses)} in total expenses.</p>
                  )}
                  {(groupToDelete.members?.length || 0) > 1 && (
                    <p>This group has {groupToDelete.members?.length || 0} members who will lose access.</p>
                  )}
                  <p className="mt-1">Make sure all balances are settled before deleting.</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-end gap-2 pt-1">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteGroupMutation.isPending}
              size="sm"
              className="h-8 px-3"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteGroup}
              disabled={deleteGroupMutation.isPending}
              size="sm"
              className="h-8 px-3"
            >
              {deleteGroupMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}