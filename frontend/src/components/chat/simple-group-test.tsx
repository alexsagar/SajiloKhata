"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2, Plus, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Group {
  id: string
  name: string
  memberCount: number
}

// Test groups
const testGroups: Group[] = [
  { id: '1', name: 'Test Group 1', memberCount: 3 },
  { id: '2', name: 'Test Group 2', memberCount: 2 },
]

export function SimpleGroupTest() {
  const [groups, setGroups] = useState<Group[]>(testGroups)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)
  const { toast } = useToast()

  const handleDeleteGroup = (group: Group) => {
    setGroupToDelete(group)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      setGroups(prev => prev.filter(g => g.id !== groupToDelete.id))
      
      toast({
        title: "Group deleted",
        description: `"${groupToDelete.name}" has been deleted successfully.`,
      })
      
      setGroupToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const addTestGroup = () => {
    const newGroup = {
      id: Date.now().toString(),
      name: `Test Group ${groups.length + 1}`,
      memberCount: Math.floor(Math.random() * 5) + 1
    }
    setGroups(prev => [...prev, newGroup])
    
    toast({
      title: "Group added",
      description: `Created "${newGroup.name}" for testing.`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Group Delete Test</h2>
          <p className="text-muted-foreground">
            Test the group deletion functionality
          </p>
        </div>
        <Button onClick={addTestGroup}>
          <Plus className="h-4 w-4 mr-2" />
          Add Test Group
        </Button>
      </div>

      <div className="grid gap-4">
        {groups.length > 0 ? (
          groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {group.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.memberCount} members
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Chat opened",
                          description: `Opening chat for ${group.name}`,
                        })
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No groups</h3>
              <p className="text-muted-foreground mb-4">
                All test groups have been deleted
              </p>
              <Button onClick={addTestGroup}>
                <Plus className="h-4 w-4 mr-2" />
                Add Test Group
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Group Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{groupToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </div>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-red-800 mb-1">This action cannot be undone</p>
                  <ul className="text-red-700 space-y-1">
                    <li>• All chat messages will be permanently deleted</li>
                    <li>• Group members will be removed from the group</li>
                    <li>• Shared expense history will be preserved</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteGroup}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}