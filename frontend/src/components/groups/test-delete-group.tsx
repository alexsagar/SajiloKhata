"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { groupAPI } from "@/lib/api"

export function TestDeleteGroup() {
  const [groupName, setGroupName] = useState("")
  const [testGroups, setTestGroups] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const createTestGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for the test group.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await groupAPI.createGroup({
        name: groupName.trim(),
        description: "Test group for deletion",
        category: "other"
      })

      setTestGroups(prev => [...prev, response.data])
      setGroupName("")
      
      toast({
        title: "Test group created",
        description: `Created "${response.data.name}" successfully.`,
      })
    } catch (error: any) {
      toast({
        title: "Failed to create group",
        description: error.response?.data?.message || "An error occurred.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTestGroup = async (groupId: string, groupName: string) => {
    setIsLoading(true)
    try {
      await groupAPI.deleteGroup(groupId)
      
      setTestGroups(prev => prev.filter(g => g._id !== groupId))
      
      toast({
        title: "Group deleted",
        description: `"${groupName}" has been deleted successfully.`,
      })
    } catch (error: any) {
      toast({
        title: "Failed to delete group",
        description: error.response?.data?.message || "An error occurred.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Group Deletion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="groupName">Test Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter test group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createTestGroup()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={createTestGroup}
                disabled={isLoading || !groupName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test Group
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {testGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Groups ({testGroups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testGroups.map((group) => (
                <div
                  key={group._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {group._id}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTestGroup(group._id, group.name)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {testGroups.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No test groups created yet. Create a test group above to test the deletion functionality.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}