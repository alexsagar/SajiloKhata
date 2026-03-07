"use client"

import { useState } from "react"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { GroupsListWithDelete } from "@/components/groups/groups-list-with-delete"
import { CreateGroupDialog } from "@/components/groups/create-group-dialog"
import { JoinGroupDialog } from "@/components/groups/join-group-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"

export default function MobileGroupsPage() {
    const [showCreateGroup, setShowCreateGroup] = useState(false)

    return (
        <>
            <MobileHeader
                title="Groups"
                actions={
                    <div className="flex gap-1">
                        <JoinGroupDialog>
                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                                <Users className="h-5 w-5" />
                            </Button>
                        </JoinGroupDialog>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 text-[hsl(var(--primary))]"
                            onClick={() => setShowCreateGroup(true)}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                }
            />
            <div className="flex flex-1 flex-col gap-3 px-3 py-3">
                <GroupsListWithDelete />
            </div>

            <CreateGroupDialog
                open={showCreateGroup}
                onOpenChange={setShowCreateGroup}
            />
        </>
    )
}
