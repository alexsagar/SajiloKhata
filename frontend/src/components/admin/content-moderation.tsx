"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Flag, 
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Image,
  FileText,
  Clock,
  User,
  Calendar,
  Filter
} from "lucide-react"
import DataTable from "@/components/common/data-table"

interface ModerationItem {
  id: string
  type: 'expense' | 'comment' | 'group_name' | 'user_profile' | 'receipt'
  content: string
  reportedBy: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  reportedUser: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  reason: string
  category: 'spam' | 'inappropriate' | 'harassment' | 'fraud' | 'other'
  status: 'pending' | 'approved' | 'rejected' | 'escalated'
  priority: 'low' | 'medium' | 'high' | 'critical'
  reportDate: string
  reviewDate?: string
  reviewedBy?: string
  notes?: string
  evidence?: {
    screenshots: string[]
    additionalInfo: string
  }
}

// Empty initial data - will be populated from API
const mockModerationItems: ModerationItem[] = []

export function ContentModeration() {
  const [items, setItems] = useState<ModerationItem[]>(mockModerationItems)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reportedUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reportedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory
  })

  const handleModerationAction = (itemId: string, action: 'approve' | 'reject' | 'escalate') => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const now = new Date().toISOString().split('T')[0]
        switch (action) {
          case 'approve':
            return { ...item, status: 'approved' as const, reviewDate: now, reviewedBy: 'current_admin' }
          case 'reject':
            return { ...item, status: 'rejected' as const, reviewDate: now, reviewedBy: 'current_admin' }
          case 'escalate':
            return { ...item, status: 'escalated' as const, priority: 'critical' as const, reviewDate: now }
          default:
            return item
        }
      }
      return item
    }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      case 'escalated':
        return <Badge className="bg-orange-100 text-orange-800"><AlertTriangle className="h-3 w-3 mr-1" />Escalated</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-500 text-white">Critical</Badge>
      case 'high':
        return <Badge className="bg-orange-500 text-white">High</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Medium</Badge>
      case 'low':
        return <Badge className="bg-green-500 text-white">Low</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'spam':
        return <Badge className="bg-blue-100 text-blue-800">Spam</Badge>
      case 'inappropriate':
        return <Badge className="bg-purple-100 text-purple-800">Inappropriate</Badge>
      case 'harassment':
        return <Badge className="bg-red-100 text-red-800">Harassment</Badge>
      case 'fraud':
        return <Badge className="bg-orange-100 text-orange-800">Fraud</Badge>
      case 'other':
        return <Badge className="bg-gray-100 text-gray-800">Other</Badge>
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return <FileText className="h-4 w-4" />
      case 'comment':
        return <MessageSquare className="h-4 w-4" />
      case 'group_name':
        return <User className="h-4 w-4" />
      case 'user_profile':
        return <User className="h-4 w-4" />
      case 'receipt':
        return <Image className="h-4 w-4" />
      default:
        return <Flag className="h-4 w-4" />
    }
  }

  const moderationColumns = [
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }: any) => {
        const item = row.original
        return (
          <div className="flex items-center gap-2">
            {getTypeIcon(item.type)}
            <span className="capitalize">{item.type.replace('_', ' ')}</span>
          </div>
        )
      }
    },
    {
      header: 'Content',
      accessorKey: 'content',
      cell: ({ row }: any) => (
        <div className="max-w-[300px] truncate">{row.original.content}</div>
      )
    },
    {
      header: 'Reported User',
      accessorKey: 'reportedUser',
      cell: ({ row }: any) => {
        const user = row.original.reportedUser
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-xs">
                {user.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
        )
      }
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: ({ row }: any) => getCategoryBadge(row.original.category)
    },
    {
      header: 'Priority',
      accessorKey: 'priority',
      cell: ({ row }: any) => getPriorityBadge(row.original.priority)
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => getStatusBadge(row.original.status)
    },
    {
      header: 'Report Date',
      accessorKey: 'reportDate',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {new Date(row.original.reportDate).toLocaleDateString()}
        </div>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      cell: ({ row }: any) => {
        const item = row.original
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedItem(item)
                setIsDetailDialogOpen(true)
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {item.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModerationAction(item.id, 'approve')}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModerationAction(item.id, 'reject')}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Moderation</h2>
          <p className="text-muted-foreground">Review and moderate reported content</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {items.filter(i => i.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {items.filter(i => i.priority === 'high' || i.priority === 'critical').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {items.filter(i => i.reviewDate === new Date().toISOString().split('T')[0]).length}
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
              <Label htmlFor="search">Search Reports</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by content, user, or reason..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
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
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="fraud">Fraud</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue ({filteredItems.length})</CardTitle>
          <CardDescription>
            Showing {filteredItems.length} of {items.length} reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={moderationColumns}
            data={filteredItems}
            emptyMessage="No moderation items found matching your criteria."
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
          <DialogHeader>
            <DialogTitle>Moderation Review</DialogTitle>
            <DialogDescription>
              Review reported content and take appropriate action
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Content Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getTypeIcon(selectedItem.type)}
                    <span className="capitalize">{selectedItem.type.replace('_', ' ')}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Report Date</Label>
                  <p className="text-sm mt-1">{new Date(selectedItem.reportDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <div className="mt-1">{getCategoryBadge(selectedItem.category)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <div className="mt-1">{getPriorityBadge(selectedItem.priority)}</div>
                </div>
              </div>

              {/* Content */}
              <div>
                <Label className="text-sm font-medium">Reported Content</Label>
                <div className="mt-2 p-3 border rounded-lg bg-muted/50">
                  <p className="text-sm">{selectedItem.content}</p>
                </div>
              </div>

              {/* Users */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Reported By</Label>
                  <div className="flex items-center gap-3 mt-2 p-3 border rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedItem.reportedBy.avatar} />
                      <AvatarFallback>
                        {selectedItem.reportedBy.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{selectedItem.reportedBy.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedItem.reportedBy.email}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reported User</Label>
                  <div className="flex items-center gap-3 mt-2 p-3 border rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedItem.reportedUser.avatar} />
                      <AvatarFallback>
                        {selectedItem.reportedUser.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{selectedItem.reportedUser.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedItem.reportedUser.email}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <Label className="text-sm font-medium">Report Reason</Label>
                <p className="text-sm mt-1 p-3 border rounded-lg">{selectedItem.reason}</p>
              </div>

              {/* Evidence */}
              {selectedItem.evidence && (
                <div>
                  <Label className="text-sm font-medium">Additional Evidence</Label>
                  <p className="text-sm mt-1 p-3 border rounded-lg">{selectedItem.evidence.additionalInfo}</p>
                </div>
              )}

              {/* Review Info */}
              {selectedItem.reviewDate && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Review Information</Label>
                    {getStatusBadge(selectedItem.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Reviewed by:</span>
                      <span className="ml-2">{selectedItem.reviewedBy}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Review date:</span>
                      <span className="ml-2">{new Date(selectedItem.reviewDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {selectedItem.notes && (
                    <div className="mt-2">
                      <span className="text-muted-foreground text-sm">Notes:</span>
                      <p className="text-sm mt-1">{selectedItem.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Notes */}
              {selectedItem.status === 'pending' && (
                <div>
                  <Label htmlFor="actionNotes">Review Notes</Label>
                  <Textarea 
                    id="actionNotes" 
                    placeholder="Add notes about your decision..."
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
            {selectedItem && selectedItem.status === 'pending' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    handleModerationAction(selectedItem.id, 'reject')
                    setIsDetailDialogOpen(false)
                  }}
                >
                  Reject
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    handleModerationAction(selectedItem.id, 'escalate')
                    setIsDetailDialogOpen(false)
                  }}
                >
                  Escalate
                </Button>
                <Button 
                  onClick={() => {
                    handleModerationAction(selectedItem.id, 'approve')
                    setIsDetailDialogOpen(false)
                  }}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}