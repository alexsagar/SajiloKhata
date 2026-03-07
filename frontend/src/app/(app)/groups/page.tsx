"use client"

import { useState } from "react"
import { Header } from "@/components/common/header"
import { GroupsListWithDelete } from "@/components/groups/groups-list-with-delete"
import { CreateGroupDialog } from "@/components/groups/create-group-dialog"
import { JoinGroupDialog } from "@/components/groups/join-group-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"

export default function GroupsPage() {
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  return (
    <>
      <Header
        title="Groups"
        description="Manage your expense groups"
        actions={
          <div className="flex gap-2">
            <JoinGroupDialog>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 sm:w-auto sm:px-3">
                <Users className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Join Group</span>
              </Button>
            </JoinGroupDialog>
            <Button size="sm" className="h-9 w-9 p-0 sm:w-auto sm:px-3" onClick={() => setShowCreateGroup(true)}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Group</span>
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
    </>
  )
}