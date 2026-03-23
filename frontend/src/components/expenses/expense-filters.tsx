"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Search, Filter, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { groupAPI } from "@/lib/api"

interface ExpenseFiltersProps {
  onFiltersChange: (filters: {
    search?: string
    category?: string
    groupId?: string
    startDate?: string
    endDate?: string
  }) => void
}

interface GroupOption {
  _id: string
  name: string
}



export function ExpenseFilters({ onFiltersChange }: ExpenseFiltersProps) {
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    groupId: "all",
    startDate: "",
    endDate: "",
  })

  const { data: groups } = useQuery({
    queryKey: ["user-groups"],
    queryFn: () => groupAPI.getGroups(),
  })

  const groupOptions =
    (Array.isArray(groups?.data?.data)
      ? groups.data.data
      : Array.isArray(groups?.data)
        ? groups.data
        : []) as GroupOption[]

  const emitNormalizedFilters = (source: typeof filters) => {
    onFiltersChange({
      search: source.search.trim(),
      category: source.category === "all" ? "" : source.category,
      groupId: source.groupId === "all" ? "" : source.groupId,
      startDate: source.startDate,
      endDate: source.endDate,
    })
  }

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    emitNormalizedFilters(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      category: "all",
      groupId: "all",
      startDate: "",
      endDate: "",
    }
    setFilters(clearedFilters)
    emitNormalizedFilters(clearedFilters)
  }

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.category !== "all" ||
    filters.groupId !== "all" ||
    filters.startDate !== "" ||
    filters.endDate !== ""

  return (
    <KanbanCard>
      <KanbanCardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2">
          <KanbanCardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </KanbanCardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </KanbanCardHeader>
      <KanbanCardContent className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search expenses..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={filters.category} onValueChange={(value) => updateFilter("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="food">Food & Dining</SelectItem>
                <SelectItem value="transportation">Transportation</SelectItem>
                <SelectItem value="accommodation">Accommodation</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="group">Group</Label>
            <Select value={filters.groupId} onValueChange={(value) => updateFilter("groupId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {groupOptions.map((group) => (
                  <SelectItem key={group._id} value={group._id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">From Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter("startDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">To Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
            />
          </div>
        </div>
      </KanbanCardContent>
    </KanbanCard>
  )
}
