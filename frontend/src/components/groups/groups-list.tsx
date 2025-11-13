"use client"

import { KanbanCard, KanbanCardContent } from "@/components/ui/kanban-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, Calendar, MoreHorizontal } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { groupAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function GroupsList() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ["user-groups"],
    queryFn: () => groupAPI.getGroups(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const userGroups = (groups as any)?.data?.data || (groups as any)?.data || []

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {userGroups.map((group: any) => (
        <KanbanCard key={group.id ?? group._id} className="hover:-translate-y-0.5 hover:bg-white/[0.06] cursor-pointer">
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
                    <Link href={`/groups/${group._id}/settings`}>Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/groups/${group._id}/members`}>Members</Link>
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
  )
}
