"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Users, 
  DollarSign, 
  Calendar,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  Download,
  TrendingUp,
  Activity
} from "lucide-react"
import DataTable from "@/components/common/data-table"

interface Group {
  id: string
  name: string
  description: string
  memberCount: number
  totalExpenses: number
  createdDate: string
  lastActivity: string
  status: 'active' | 'inactive' | 'suspended'
  category: 'personal' | 'business' | 'travel' | 'other'
  creator: {
    name: string
    email: string
    avatar?: string
  }
  recentActivity: {
    type: 'expense' | 'payment' | 'member_join' | 'member_leave'
    description: string
    timestamp: string
  }[]
}

// Empty initial data - will be populated from API
const mockGroups: Group[] = []

export function GroupManagement() {
  const [groups, setGroups] = useState<Group[]>(mockGroups)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const filteredGroups = groups.filter(group => {
    const matchesSearch = 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.creator.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || group.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'personal':
        return <Badge className="bg-blue-100 text-blue-800">Personal</Badge>
      case 'business':
        return <Badge className="bg-purple-100 text-purple-800">Business</Badge>
      case 'travel':
        return <Badge className="bg-green-100 text-green-800">Travel</Badge>
      case 'other':
        return <Badge className="bg-gray-100 text-gray-800">Other</Badge>
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  const handleGroupAction = (groupId: string, action: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        switch (action) {
          case 'suspend':
            return { ...group, status: 'suspended' as const }
          case 'activate':
            return { ...group, status: 'active' as const }
          case 'deactivate':
            return { ...group, status: 'inactive' as const }
          default:
            return group
        }
      }
      return group
    }))
  }

  const groupColumns = [
    {
      header: 'Group',
      accessorKey: 'group',
      cell: ({ row }: any) => {
        const group = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {group.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{group.name}</div>
              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                {group.description}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      header: 'Creator',
      accessorKey: 'creator',
      cell: ({ row }: any) => {
        const creator = row.original.creator
        return (
          <div>
            <div className="font-medium text-sm">{creator.name}</div>
            <div className="text-xs text-muted-foreground">{creator.email}</div>
          </div>
        )
      }
    },
    {
      header: 'Members',
      accessorKey: 'memberCount',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.memberCount}</span>
        </div>
      )
    },
    {
      header: 'Total Expenses',
      accessorKey: 'totalExpenses',
      cell: ({ row }: any) => (
        <div className="text-right font-medium">
          ${row.original.totalExpenses.toLocaleString()}
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => getStatusBadge(row.original.status)
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: ({ row }: any) => getCategoryBadge(row.original.category)
    },
    {
      header: 'Last Activity',
      accessorKey: 'lastActivity',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {new Date(row.original.lastActivity).toLocaleDateString()}
        </div>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      cell: ({ row }: any) => {
        const group = row.original
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedGroup(group)
                setIsDetailDialogOpen(true)
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {group.status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGroupAction(group.id, 'suspend')}
              >
                <Ban className="h-4 w-4" />
              </Button>
            ) : group.status === 'suspended' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGroupAction(group.id, 'activate')}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGroupAction(group.id, 'activate')}
              >
                <Activity className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      }
    }
  ]

  const totalExpenses = groups.reduce((sum, group) => sum + group.totalExpenses, 0)
  const totalMembers = groups.reduce((sum, group) => sum + group.memberCount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Group Management</h2>
          <p className="text-muted-foreground">Monitor and manage expense groups</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Groups
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {groups.filter(g => g.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalMembers}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${totalExpenses.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Groups</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, description, or creator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Groups ({filteredGroups.length})</CardTitle>
          <CardDescription>
            Showing {filteredGroups.length} of {groups.length} groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={groupColumns}
            data={filteredGroups}
            emptyMessage="No groups found matching your criteria."
          />
        </CardContent>
      </Card>

      {/* Group Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
          <DialogHeader>
            <DialogTitle>Group Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected group
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Group Name</Label>
                  <p className="text-sm">{selectedGroup.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedGroup.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <div className="mt-1">{getCategoryBadge(selectedGroup.category)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created Date</Label>
                  <p className="text-sm">{new Date(selectedGroup.createdDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm mt-1">{selectedGroup.description}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedGroup.memberCount}</div>
                  <div className="text-sm text-muted-foreground">Members</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${selectedGroup.totalExpenses.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedGroup.recentActivity.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Recent Activities</div>
                </div>
              </div>

              {/* Creator Info */}
              <div>
                <Label className="text-sm font-medium">Created By</Label>
                <div className="flex items-center gap-3 mt-2 p-3 border rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedGroup.creator.avatar} />
                    <AvatarFallback>
                      {selectedGroup.creator.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{selectedGroup.creator.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedGroup.creator.email}</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <Label className="text-sm font-medium">Recent Activity</Label>
                <div className="space-y-2 mt-2">
                  {selectedGroup.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
            {selectedGroup && selectedGroup.status === 'active' && (
              <Button 
                variant="destructive"
                onClick={() => {
                  handleGroupAction(selectedGroup.id, 'suspend')
                  setIsDetailDialogOpen(false)
                }}
              >
                Suspend Group
              </Button>
            )}
            {selectedGroup && selectedGroup.status === 'suspended' && (
              <Button 
                onClick={() => {
                  handleGroupAction(selectedGroup.id, 'activate')
                  setIsDetailDialogOpen(false)
                }}
              >
                Activate Group
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}