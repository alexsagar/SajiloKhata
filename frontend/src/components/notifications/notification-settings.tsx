"use client"

import { useState } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Bell, 
  Mail, 
  Smartphone, 
  DollarSign, 
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Settings,
  Volume2,
  VolumeX
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface NotificationPreference {
  id: string
  title: string
  description: string
  category: 'expenses' | 'payments' | 'groups' | 'security' | 'marketing'
  channels: {
    email: boolean
    push: boolean
    sms: boolean
    inApp: boolean
  }
  frequency: 'instant' | 'daily' | 'weekly' | 'never'
  enabled: boolean
}

// Mock notification preferences
const defaultPreferences: NotificationPreference[] = [
  {
    id: 'expense_added',
    title: 'New Expense Added',
    description: 'When someone adds a new expense to your groups',
    category: 'expenses',
    channels: { email: true, push: true, sms: false, inApp: true },
    frequency: 'instant',
    enabled: true
  },
  {
    id: 'expense_updated',
    title: 'Expense Updated',
    description: 'When an expense you\'re involved in is modified',
    category: 'expenses',
    channels: { email: false, push: true, sms: false, inApp: true },
    frequency: 'instant',
    enabled: true
  },
  {
    id: 'payment_request',
    title: 'Payment Requests',
    description: 'When someone requests payment from you',
    category: 'payments',
    channels: { email: true, push: true, sms: true, inApp: true },
    frequency: 'instant',
    enabled: true
  },
  {
    id: 'payment_received',
    title: 'Payment Received',
    description: 'When you receive a payment',
    category: 'payments',
    channels: { email: true, push: true, sms: false, inApp: true },
    frequency: 'instant',
    enabled: true
  },
  {
    id: 'payment_reminder',
    title: 'Payment Reminders',
    description: 'Reminders for outstanding payments',
    category: 'payments',
    channels: { email: true, push: true, sms: false, inApp: true },
    frequency: 'daily',
    enabled: true
  },
  {
    id: 'group_invite',
    title: 'Group Invitations',
    description: 'When you\'re invited to join a group',
    category: 'groups',
    channels: { email: true, push: true, sms: false, inApp: true },
    frequency: 'instant',
    enabled: true
  },
  {
    id: 'group_member_added',
    title: 'New Group Members',
    description: 'When someone joins your groups',
    category: 'groups',
    channels: { email: false, push: true, sms: false, inApp: true },
    frequency: 'instant',
    enabled: true
  },
  {
    id: 'weekly_summary',
    title: 'Weekly Summary',
    description: 'Weekly summary of your expenses and balances',
    category: 'expenses',
    channels: { email: true, push: false, sms: false, inApp: false },
    frequency: 'weekly',
    enabled: true
  },
  {
    id: 'monthly_report',
    title: 'Monthly Report',
    description: 'Monthly spending report and analytics',
    category: 'expenses',
    channels: { email: true, push: false, sms: false, inApp: false },
    frequency: 'weekly',
    enabled: false
  },
  {
    id: 'security_alerts',
    title: 'Security Alerts',
    description: 'Login attempts and security-related notifications',
    category: 'security',
    channels: { email: true, push: true, sms: true, inApp: true },
    frequency: 'instant',
    enabled: true
  },
  {
    id: 'account_changes',
    title: 'Account Changes',
    description: 'When your account settings are modified',
    category: 'security',
    channels: { email: true, push: true, sms: false, inApp: true },
    frequency: 'instant',
    enabled: true
  },
  {
    id: 'product_updates',
    title: 'Product Updates',
    description: 'New features and product announcements',
    category: 'marketing',
    channels: { email: true, push: false, sms: false, inApp: true },
    frequency: 'weekly',
    enabled: false
  },
  {
    id: 'tips_tricks',
    title: 'Tips & Tricks',
    description: 'Helpful tips to get the most out of SplitWise',
    category: 'marketing',
    channels: { email: true, push: false, sms: false, inApp: false },
    frequency: 'weekly',
    enabled: false
  }
]

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>(defaultPreferences)
  const [globalSettings, setGlobalSettings] = useState({
    doNotDisturb: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    soundEnabled: true,
    vibrationEnabled: true
  })
  const { toast } = useToast()

  const updatePreference = (id: string, updates: Partial<NotificationPreference>) => {
    setPreferences(prev => prev.map(pref => 
      pref.id === id ? { ...pref, ...updates } : pref
    ))
  }

  const updateChannel = (id: string, channel: keyof NotificationPreference['channels'], enabled: boolean) => {
    setPreferences(prev => prev.map(pref => 
      pref.id === id 
        ? { ...pref, channels: { ...pref.channels, [channel]: enabled } }
        : pref
    ))
  }

  const saveSettings = async () => {
    try {
      // In a real app, this would make an API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'expenses':
        return <DollarSign className="h-4 w-4" />
      case 'payments':
        return <CheckCircle className="h-4 w-4" />
      case 'groups':
        return <Users className="h-4 w-4" />
      case 'security':
        return <AlertTriangle className="h-4 w-4" />
      case 'marketing':
        return <Bell className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'expenses':
        return <Badge className="bg-green-100 text-green-800">Expenses</Badge>
      case 'payments':
        return <Badge className="bg-blue-100 text-blue-800">Payments</Badge>
      case 'groups':
        return <Badge className="bg-purple-100 text-purple-800">Groups</Badge>
      case 'security':
        return <Badge className="bg-red-100 text-red-800">Security</Badge>
      case 'marketing':
        return <Badge className="bg-gray-100 text-gray-800">Marketing</Badge>
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  const groupedPreferences = preferences.reduce((acc, pref) => {
    if (!acc[pref.category]) {
      acc[pref.category] = []
    }
    acc[pref.category].push(pref)
    return acc
  }, {} as Record<string, NotificationPreference[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Settings</h2>
          <p className="text-muted-foreground">
            Manage how and when you receive notifications
          </p>
        </div>
        <Button onClick={saveSettings}>
          Save Changes
        </Button>
      </div>

      {/* Global Settings */}
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Global Settings
          </KanbanCardTitle>
          <KanbanCardDescription>
            General notification preferences that apply to all notifications
          </KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Do Not Disturb</Label>
              <div className="text-sm text-muted-foreground">
                Temporarily disable all notifications
              </div>
            </div>
            <Switch
              checked={globalSettings.doNotDisturb}
              onCheckedChange={(checked) => 
                setGlobalSettings(prev => ({ ...prev, doNotDisturb: checked }))
              }
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Quiet Hours</Label>
                <div className="text-sm text-muted-foreground">
                  Disable notifications during specific hours
                </div>
              </div>
              <Switch
                checked={globalSettings.quietHours.enabled}
                onCheckedChange={(checked) => 
                  setGlobalSettings(prev => ({ 
                    ...prev, 
                    quietHours: { ...prev.quietHours, enabled: checked }
                  }))
                }
              />
            </div>

            {globalSettings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <Label htmlFor="quietStart">Start Time</Label>
                  <Select 
                    value={globalSettings.quietHours.start}
                    onValueChange={(value) => 
                      setGlobalSettings(prev => ({ 
                        ...prev, 
                        quietHours: { ...prev.quietHours, start: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quietEnd">End Time</Label>
                  <Select 
                    value={globalSettings.quietHours.end}
                    onValueChange={(value) => 
                      setGlobalSettings(prev => ({ 
                        ...prev, 
                        quietHours: { ...prev.quietHours, end: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  {globalSettings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  Sound
                </Label>
                <div className="text-sm text-muted-foreground">
                  Play sound for notifications
                </div>
              </div>
              <Switch
                checked={globalSettings.soundEnabled}
                onCheckedChange={(checked) => 
                  setGlobalSettings(prev => ({ ...prev, soundEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Vibration
                </Label>
                <div className="text-sm text-muted-foreground">
                  Vibrate for mobile notifications
                </div>
              </div>
              <Switch
                checked={globalSettings.vibrationEnabled}
                onCheckedChange={(checked) => 
                  setGlobalSettings(prev => ({ ...prev, vibrationEnabled: checked }))
                }
              />
            </div>
          </div>
        </KanbanCardContent>
      </KanbanCard>

      {/* Notification Categories */}
      {Object.entries(groupedPreferences).map(([category, categoryPrefs]) => (
        <KanbanCard key={category}>
          <KanbanCardHeader>
            <KanbanCardTitle className="flex items-center gap-2">
              {getCategoryIcon(category)}
              <span className="capitalize">{category} Notifications</span>
              {getCategoryBadge(category)}
            </KanbanCardTitle>
            <KanbanCardDescription>
              Configure notifications for {category}-related activities
            </KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent className="space-y-6">
            {categoryPrefs.map((pref, index) => (
              <div key={pref.id}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">{pref.title}</Label>
                      <div className="text-sm text-muted-foreground">
                        {pref.description}
                      </div>
                    </div>
                    <Switch
                      checked={pref.enabled}
                      onCheckedChange={(checked) => 
                        updatePreference(pref.id, { enabled: checked })
                      }
                    />
                  </div>

                  {pref.enabled && (
                    <div className="ml-6 space-y-4">
                      {/* Delivery Channels */}
                      <div>
                        <Label className="text-sm font-medium">Delivery Channels</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${pref.id}-email`}
                              checked={pref.channels.email}
                              onCheckedChange={(checked) => 
                                updateChannel(pref.id, 'email', checked)
                              }
                            />
                            <Label htmlFor={`${pref.id}-email`} className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Email
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${pref.id}-push`}
                              checked={pref.channels.push}
                              onCheckedChange={(checked) => 
                                updateChannel(pref.id, 'push', checked)
                              }
                            />
                            <Label htmlFor={`${pref.id}-push`} className="flex items-center gap-1">
                              <Bell className="h-3 w-3" />
                              Push
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${pref.id}-sms`}
                              checked={pref.channels.sms}
                              onCheckedChange={(checked) => 
                                updateChannel(pref.id, 'sms', checked)
                              }
                            />
                            <Label htmlFor={`${pref.id}-sms`} className="flex items-center gap-1">
                              <Smartphone className="h-3 w-3" />
                              SMS
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${pref.id}-inapp`}
                              checked={pref.channels.inApp}
                              onCheckedChange={(checked) => 
                                updateChannel(pref.id, 'inApp', checked)
                              }
                            />
                            <Label htmlFor={`${pref.id}-inapp`} className="flex items-center gap-1">
                              <Bell className="h-3 w-3" />
                              In-App
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Frequency */}
                      <div>
                        <Label className="text-sm font-medium">Frequency</Label>
                        <Select
                          value={pref.frequency}
                          onValueChange={(value: any) => 
                            updatePreference(pref.id, { frequency: value })
                          }
                        >
                          <SelectTrigger className="w-40 mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instant">Instant</SelectItem>
                            <SelectItem value="daily">Daily Digest</SelectItem>
                            <SelectItem value="weekly">Weekly Summary</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
                {index < categoryPrefs.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </KanbanCardContent>
        </KanbanCard>
      ))}

      {/* Quick Actions */}
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle>Quick Actions</KanbanCardTitle>
          <KanbanCardDescription>
            Quickly configure common notification scenarios
          </KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setPreferences(prev => prev.map(pref => ({ ...pref, enabled: true })))
                toast({ title: "All notifications enabled" })
              }}
            >
              Enable All
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setPreferences(prev => prev.map(pref => 
                  pref.category === 'marketing' 
                    ? { ...pref, enabled: false }
                    : { ...pref, enabled: true }
                ))
                toast({ title: "Essential notifications only" })
              }}
            >
              Essential Only
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setPreferences(prev => prev.map(pref => ({ ...pref, enabled: false })))
                toast({ title: "All notifications disabled" })
              }}
            >
              Disable All
            </Button>
          </div>
        </KanbanCardContent>
      </KanbanCard>
    </div>
  )
}