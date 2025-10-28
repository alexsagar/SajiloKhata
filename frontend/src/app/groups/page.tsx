"use client"

import { useState } from "react"
import { AppLayout } from "@/components/common/app-layout"
import { Header } from "@/components/common/header"
import { GroupsListWithDelete } from "@/components/groups/groups-list-with-delete"
import { CreateGroupDialog } from "@/components/groups/create-group-dialog"
import { JoinGroupDialog } from "@/components/groups/join-group-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"

export default function GroupsPage() {
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  return (
    <AppLayout>
      <Header
        title="Groups"
        description="Manage your expense groups"
        actions={
          <div className="flex gap-2">
            <JoinGroupDialog>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Join Group
              </Button>
            </JoinGroupDialog>
            <Button size="sm" onClick={() => setShowCreateGroup(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <GroupsListWithDelete />
      </div>

      <CreateGroupDialog 
        open={showCreateGroup} 
        onOpenChange={setShowCreateGroup}
      />
    </AppLayout>
  )
}