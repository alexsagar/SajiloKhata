"use client"

import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileSettings } from "./profile-settings"
import { PreferenceSettings } from "./preference-settings"
import { SecuritySettings } from "./security-settings"
import { PrivacyControls } from "./privacy-controls"
import { NotificationSettings } from "./notification-settings"
import { User, Shield, Bell, Eye, Settings } from "lucide-react"

export function UserSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Profile Information</KanbanCardTitle>
              <KanbanCardDescription>
                Update your personal information and profile details.
              </KanbanCardDescription>
            </KanbanCardHeader>
            <KanbanCardContent>
              <ProfileSettings />
            </KanbanCardContent>
          </KanbanCard>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Preferences</KanbanCardTitle>
              <KanbanCardDescription>
                Customize your app experience and default settings.
              </KanbanCardDescription>
            </KanbanCardHeader>
            <KanbanCardContent>
              <PreferenceSettings />
            </KanbanCardContent>
          </KanbanCard>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Security Settings</KanbanCardTitle>
              <KanbanCardDescription>
                Manage your password, two-factor authentication, and active sessions.
              </KanbanCardDescription>
            </KanbanCardHeader>
            <KanbanCardContent>
              <SecuritySettings />
            </KanbanCardContent>
          </KanbanCard>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Notification Preferences</KanbanCardTitle>
              <KanbanCardDescription>
                Choose how and when you want to receive notifications.
              </KanbanCardDescription>
            </KanbanCardHeader>
            <KanbanCardContent>
              <NotificationSettings />
            </KanbanCardContent>
          </KanbanCard>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Privacy Controls</KanbanCardTitle>
              <KanbanCardDescription>
                Control your privacy settings and data sharing preferences.
              </KanbanCardDescription>
            </KanbanCardHeader>
            <KanbanCardContent>
              <PrivacyControls />
            </KanbanCardContent>
          </KanbanCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}