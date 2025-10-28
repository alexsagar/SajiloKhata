"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Plus, 
  Settings, 
  Eye,
  EyeOff,
  Flag,
  Users,
  Percent,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2
} from "lucide-react"

interface FeatureFlag {
  id: string
  name: string
  key: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  environment: 'development' | 'staging' | 'production'
  targetAudience: 'all' | 'premium' | 'beta' | 'internal'
  createdDate: string
  lastModified: string
  createdBy: string
  status: 'active' | 'inactive' | 'scheduled'
  scheduledDate?: string
  dependencies: string[]
  metrics: {
    impressions: number
    conversions: number
    conversionRate: number
  }
}

// Empty initial data - will be populated from API
const mockFeatureFlags: FeatureFlag[] = []

export function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>(mockFeatureFlags)
  const [searchTerm, setSearchTerm] = useState('')
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const filteredFlags = flags.filter(flag => {
    const matchesSearch = 
      flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesEnvironment = environmentFilter === 'all' || flag.environment === environmentFilter
    const matchesStatus = statusFilter === 'all' || flag.status === statusFilter

    return matchesSearch && matchesEnvironment && matchesStatus
  })

  const toggleFlag = (flagId: string) => {
    setFlags(prev => prev.map(flag => 
      flag.id === flagId 
        ? { ...flag, enabled: !flag.enabled, lastModified: new Date().toISOString().split('T')[0] }
        : flag
    ))
  }

  const updateRollout = (flagId: string, percentage: number) => {
    setFlags(prev => prev.map(flag => 
      flag.id === flagId 
        ? { ...flag, rolloutPercentage: percentage, lastModified: new Date().toISOString().split('T')[0] }
        : flag
    ))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800"><EyeOff className="h-3 w-3 mr-1" />Inactive</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEnvironmentBadge = (environment: string) => {
    switch (environment) {
      case 'production':
        return <Badge className="bg-red-100 text-red-800">Production</Badge>
      case 'staging':
        return <Badge className="bg-yellow-100 text-yellow-800">Staging</Badge>
      case 'development':
        return <Badge className="bg-blue-100 text-blue-800">Development</Badge>
      default:
        return <Badge variant="outline">{environment}</Badge>
    }
  }

  const getAudienceBadge = (audience: string) => {
    switch (audience) {
      case 'all':
        return <Badge className="bg-purple-100 text-purple-800">All Users</Badge>
      case 'premium':
        return <Badge className="bg-gold-100 text-gold-800">Premium</Badge>
      case 'beta':
        return <Badge className="bg-orange-100 text-orange-800">Beta</Badge>
      case 'internal':
        return <Badge className="bg-gray-100 text-gray-800">Internal</Badge>
      default:
        return <Badge variant="outline">{audience}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feature Flags</h2>
          <p className="text-muted-foreground">Manage feature rollouts and A/B testing</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Flag
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flags.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {flags.filter(f => f.enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Production Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {flags.filter(f => f.environment === 'production').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(flags.reduce((sum, f) => sum + f.metrics.conversionRate, 0) / flags.length).toFixed(1)}%
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
              <Label htmlFor="search">Search Flags</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, key, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="environment">Environment</Label>
              <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags List */}
      <div className="space-y-4">
        {filteredFlags.map((flag) => (
          <Card key={flag.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flag className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{flag.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">{flag.key}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(flag.status)}
                  {getEnvironmentBadge(flag.environment)}
                  {getAudienceBadge(flag.targetAudience)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{flag.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${flag.id}`} className="text-sm">Enabled</Label>
                      <Switch
                        id={`toggle-${flag.id}`}
                        checked={flag.enabled}
                        onCheckedChange={() => toggleFlag(flag.id)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Rollout:</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={flag.rolloutPercentage}
                          onChange={(e) => updateRollout(flag.id, parseInt(e.target.value) || 0)}
                          className="w-20 h-8"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFlag(flag)
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {flag.metrics.impressions.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Impressions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {flag.metrics.conversions.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Conversions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {flag.metrics.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Conversion Rate</div>
                  </div>
                </div>

                {/* Dependencies */}
                {flag.dependencies.length > 0 && (
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Dependencies:</Label>
                    <div className="flex gap-1 mt-1">
                      {flag.dependencies.map((dep, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>Created by {flag.createdBy} on {new Date(flag.createdDate).toLocaleDateString()}</span>
                  <span>Last modified: {new Date(flag.lastModified).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Flag Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
            <DialogDescription>
              Add a new feature flag to control application features
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="flagName">Flag Name</Label>
                <Input id="flagName" placeholder="Advanced Analytics Dashboard" />
              </div>
              <div>
                <Label htmlFor="flagKey">Flag Key</Label>
                <Input id="flagKey" placeholder="advanced_analytics_v2" />
              </div>
            </div>
            <div>
              <Label htmlFor="flagDescription">Description</Label>
              <Textarea id="flagDescription" placeholder="Describe what this feature flag controls..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="environment">Environment</Label>
                <Select defaultValue="development">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Select defaultValue="internal">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="premium">Premium Users</SelectItem>
                    <SelectItem value="beta">Beta Users</SelectItem>
                    <SelectItem value="internal">Internal Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rollout">Initial Rollout %</Label>
                <Input id="rollout" type="number" min="0" max="100" defaultValue="0" />
              </div>
            </div>
            <div>
              <Label htmlFor="dependencies">Dependencies (comma-separated)</Label>
              <Input id="dependencies" placeholder="analytics_api_v2, user_service" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(false)}>
              Create Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Flag Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
          <DialogHeader>
            <DialogTitle>Edit Feature Flag</DialogTitle>
            <DialogDescription>
              Update feature flag configuration
            </DialogDescription>
          </DialogHeader>
          {selectedFlag && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFlagName">Flag Name</Label>
                  <Input id="editFlagName" defaultValue={selectedFlag.name} />
                </div>
                <div>
                  <Label htmlFor="editFlagKey">Flag Key</Label>
                  <Input id="editFlagKey" defaultValue={selectedFlag.key} disabled />
                </div>
              </div>
              <div>
                <Label htmlFor="editFlagDescription">Description</Label>
                <Textarea id="editFlagDescription" defaultValue={selectedFlag.description} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editEnvironment">Environment</Label>
                  <Select defaultValue={selectedFlag.environment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editAudience">Target Audience</Label>
                  <Select defaultValue={selectedFlag.targetAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="premium">Premium Users</SelectItem>
                      <SelectItem value="beta">Beta Users</SelectItem>
                      <SelectItem value="internal">Internal Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editStatus">Status</Label>
                  <Select defaultValue={selectedFlag.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsEditDialogOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}