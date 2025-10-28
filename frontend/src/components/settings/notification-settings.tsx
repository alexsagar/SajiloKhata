"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { notificationAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    email: {
      expenseAdded: true,
      expenseUpdated: true,
      paymentReminder: true,
      groupInvite: true,
      weeklyDigest: false,
    },
    push: {
      expenseAdded: true,
      expenseUpdated: false,
      paymentReminder: true,
      groupInvite: true,
    },
    inApp: {
      expenseAdded: true,
      expenseUpdated: true,
      paymentReminder: true,
      groupInvite: true,
    }
  })

  const updateSettingsMutation = useMutation({
    mutationFn: notificationAPI.updatePreferences,
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update settings",
        variant: "destructive",
      })
    },
  })

  const updateSetting = (category: string, setting: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }))
  }

  const handleSave = () => {
    updateSettingsMutation.mutate(settings)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New Expense Added</Label>
              <p className="text-sm text-muted-foreground">
                When someone adds a new expense to your groups
              </p>
            </div>
            <Switch
              checked={settings.email.expenseAdded}
              onCheckedChange={(checked) => updateSetting('email', 'expenseAdded', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Expense Updated</Label>
              <p className="text-sm text-muted-foreground">
                When an expense you're involved in is modified
              </p>
            </div>
            <Switch
              checked={settings.email.expenseUpdated}
              onCheckedChange={(checked) => updateSetting('email', 'expenseUpdated', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Payment Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Reminders about outstanding balances
              </p>
            </div>
            <Switch
              checked={settings.email.paymentReminder}
              onCheckedChange={(checked) => updateSetting('email', 'paymentReminder', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Group Invitations</Label>
              <p className="text-sm text-muted-foreground">
                When someone invites you to join a group
              </p>
            </div>
            <Switch
              checked={settings.email.groupInvite}
              onCheckedChange={(checked) => updateSetting('email', 'groupInvite', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Weekly summary of your expenses and balances
              </p>
            </div>
            <Switch
              checked={settings.email.weeklyDigest}
              onCheckedChange={(checked) => updateSetting('email', 'weeklyDigest', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Manage push notifications on your devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New Expense Added</Label>
              <p className="text-sm text-muted-foreground">
                Instant notifications for new expenses
              </p>
            </div>
            <Switch
              checked={settings.push.expenseAdded}
              onCheckedChange={(checked) => updateSetting('push', 'expenseAdded', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Payment Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Push reminders about payments due
              </p>
            </div>
            <Switch
              checked={settings.push.paymentReminder}
              onCheckedChange={(checked) => updateSetting('push', 'paymentReminder', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Group Invitations</Label>
              <p className="text-sm text-muted-foreground">
                Push notifications for group invites
              </p>
            </div>
            <Switch
              checked={settings.push.groupInvite}
              onCheckedChange={(checked) => updateSetting('push', 'groupInvite', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}