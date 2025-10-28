"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useMutation } from "@tanstack/react-query"
import { userAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { CurrencySelector } from "@/components/currency/currency-selector"

export function PreferenceSettings() {
  const { user, updateUser } = useAuth()
  const [preferences, setPreferences] = useState({
    currency: "USD",
    language: "en",
    theme: "system",
    timezone: "America/New_York",
    autoSplit: true,
    defaultSplitType: "equal",
  })

  // Update preferences when user data loads
  useEffect(() => {
    if (user?.preferences) {
      const newPreferences = {
        currency: user.preferences.currency || "USD",
        language: user.preferences.language || "en",
        theme: user.preferences.theme || "system",
        timezone: user.preferences.timezone || "America/New_York",
        autoSplit: user.preferences.autoSplit || true,
        defaultSplitType: user.preferences.defaultSplitType || "equal",
      }
      setPreferences(newPreferences)
    }
  }, [user?.preferences])

  const updatePreferencesMutation = useMutation({
    mutationFn: userAPI.updatePreferences,
    onSuccess: (response) => {
      updateUser({ preferences: response.data.user.preferences })
      toast({
        title: "Preferences updated",
        description: "Your preferences have been saved successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update preferences",
        variant: "destructive",
      })
    },
  })

  const handleSave = () => {
    updatePreferencesMutation.mutate(preferences)
  }

  const updatePreference = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
          <CardDescription>
            Configure your regional preferences for currency, language, and timezone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <CurrencySelector
                value={preferences.currency}
                onValueChange={(value) => updatePreference("currency", value)}
                placeholder="Select currency"
                variant="detailed"
              />
              <p className="text-xs text-muted-foreground">
                This will be your default currency for personal expenses and new groups.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => updatePreference("language", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="ne">Nepali</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={preferences.timezone}
              onValueChange={(value) => updatePreference("timezone", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                <SelectItem value="Asia/Kolkata">Mumbai (IST)</SelectItem>
                <SelectItem value="Asia/Kathmandu">Kathmandu (NPT)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense Settings</CardTitle>
          <CardDescription>
            Configure how expenses are handled by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-split expenses</Label>
              <p className="text-sm text-muted-foreground">
                Automatically split new expenses equally among all group members
              </p>
            </div>
            <Switch
              checked={preferences.autoSplit}
              onCheckedChange={(checked) => updatePreference("autoSplit", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultSplitType">Default Split Type</Label>
            <Select
              value={preferences.defaultSplitType}
              onValueChange={(value) => updatePreference("defaultSplitType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Equal</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="exact">Exact Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={updatePreferencesMutation.isPending}
          className="min-w-[120px]"
        >
          {updatePreferencesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}