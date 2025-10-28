"use client"

import { useState, useEffect } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  Server,
  Database,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

// Empty initial data - will be populated from API
const systemMetrics = {
  totalUsers: 0,
  activeUsers: 0,
  totalGroups: 0,
  totalTransactions: 0,
  monthlyRevenue: 0,
  systemUptime: 0,
  serverLoad: 0,
  databaseSize: 0,
  apiCalls: 0
}

const userGrowthData = []
const subscriptionData = []
const recentAlerts = []

const systemHealth = [
  { service: 'API Gateway', status: 'healthy', uptime: 99.98, responseTime: 45 },
  { service: 'Database', status: 'healthy', uptime: 99.95, responseTime: 12 },
  { service: 'Payment Service', status: 'warning', uptime: 98.5, responseTime: 156 },
  { service: 'Notification Service', status: 'healthy', uptime: 99.99, responseTime: 23 },
  { service: 'File Storage', status: 'healthy', uptime: 99.97, responseTime: 67 }
]

export function AdminDashboard() {
  const [refreshTime, setRefreshTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTime(new Date())
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Overview</h1>
          <p className="text-muted-foreground">
            Last updated: {refreshTime.toLocaleTimeString()}
          </p>
        </div>
        <Button variant="outline" onClick={() => setRefreshTime(new Date())}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics KanbanCards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KanbanCard>
          <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <KanbanCardTitle className="text-sm font-medium">Total Users</KanbanCardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-2xl font-bold">{systemMetrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last month
            </p>
          </KanbanCardContent>
        </KanbanCard>

        <KanbanCard>
          <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <KanbanCardTitle className="text-sm font-medium">Monthly Revenue</KanbanCardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-2xl font-bold">${systemMetrics.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.2%</span> from last month
            </p>
          </KanbanCardContent>
        </KanbanCard>

        <KanbanCard>
          <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <KanbanCardTitle className="text-sm font-medium">System Uptime</KanbanCardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-2xl font-bold">{systemMetrics.systemUptime}%</div>
            <Progress value={systemMetrics.systemUptime} className="mt-2" />
          </KanbanCardContent>
        </KanbanCard>

        <KanbanCard>
          <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <KanbanCardTitle className="text-sm font-medium">API Calls Today</KanbanCardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-2xl font-bold">{systemMetrics.apiCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">+5.1%</span> from yesterday
            </p>
          </KanbanCardContent>
        </KanbanCard>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* User Growth Chart */}
            <KanbanCard>
              <KanbanCardHeader>
                <KanbanCardTitle>User Growth & Revenue</KanbanCardTitle>
                <KanbanCardDescription>Monthly user acquisition and revenue trends</KanbanCardDescription>
              </KanbanCardHeader>
              <KanbanCardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </KanbanCardContent>
            </KanbanCard>

            {/* Subscription Distribution */}
            <KanbanCard>
              <KanbanCardHeader>
                <KanbanCardTitle>Subscription Distribution</KanbanCardTitle>
                <KanbanCardDescription>Current user subscription breakdown</KanbanCardDescription>
              </KanbanCardHeader>
              <KanbanCardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subscriptionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {subscriptionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </KanbanCardContent>
            </KanbanCard>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <KanbanCard>
              <KanbanCardHeader>
                <KanbanCardTitle className="text-lg">Active Groups</KanbanCardTitle>
              </KanbanCardHeader>
              <KanbanCardContent>
                <div className="text-3xl font-bold text-blue-600">{systemMetrics.totalGroups.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {systemMetrics.activeUsers.toLocaleString()} active users
                </p>
              </KanbanCardContent>
            </KanbanCard>

            <KanbanCard>
              <KanbanCardHeader>
                <KanbanCardTitle className="text-lg">Total Transactions</KanbanCardTitle>
              </KanbanCardHeader>
              <KanbanCardContent>
                <div className="text-3xl font-bold text-green-600">{systemMetrics.totalTransactions.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Processed this month
                </p>
              </KanbanCardContent>
            </KanbanCard>

            <KanbanCard>
              <KanbanCardHeader>
                <KanbanCardTitle className="text-lg">Server Load</KanbanCardTitle>
              </KanbanCardHeader>
              <KanbanCardContent>
                <div className="text-3xl font-bold text-orange-600">{systemMetrics.serverLoad}%</div>
                <Progress value={systemMetrics.serverLoad} className="mt-2" />
              </KanbanCardContent>
            </KanbanCard>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>System Health Status</KanbanCardTitle>
              <KanbanCardDescription>Real-time monitoring of all system services</KanbanCardDescription>
            </KanbanCardHeader>
            <KanbanCardContent>
              <div className="space-y-4">
                {systemHealth.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <h4 className="font-medium">{service.service}</h4>
                        <p className="text-sm text-muted-foreground">
                          Uptime: {service.uptime}% | Response: {service.responseTime}ms
                        </p>
                      </div>
                    </div>
                    <Badge variant={service.status === 'healthy' ? 'default' : service.status === 'warning' ? 'secondary' : 'destructive'}>
                      {service.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </KanbanCardContent>
          </KanbanCard>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Recent System Alerts</KanbanCardTitle>
              <KanbanCardDescription>Latest system notifications and alerts</KanbanCardDescription>
            </KanbanCardHeader>
            <KanbanCardContent>
              <div className="space-y-4">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-4 border rounded-lg">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                        <Badge 
                          variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </KanbanCardContent>
          </KanbanCard>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <KanbanCard>
              <KanbanCardHeader>
                <KanbanCardTitle>Database Metrics</KanbanCardTitle>
              </KanbanCardHeader>
              <KanbanCardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Database Size</span>
                  <span className="font-medium">{systemMetrics.databaseSize} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Query Performance</span>
                  <span className="font-medium text-green-600">Optimal</span>
                </div>
                <div className="flex justify-between">
                  <span>Backup Status</span>
                  <span className="font-medium text-green-600">Up to date</span>
                </div>
              </KanbanCardContent>
            </KanbanCard>

            <KanbanCard>
              <KanbanCardHeader>
                <KanbanCardTitle>Security Metrics</KanbanCardTitle>
              </KanbanCardHeader>
              <KanbanCardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Failed Login Attempts</span>
                  <span className="font-medium">23 (24h)</span>
                </div>
                <div className="flex justify-between">
                  <span>Security Scan</span>
                  <span className="font-medium text-green-600">Clean</span>
                </div>
                <div className="flex justify-between">
                  <span>SSL Certificate</span>
                  <span className="font-medium text-green-600">Valid</span>
                </div>
              </KanbanCardContent>
            </KanbanCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}