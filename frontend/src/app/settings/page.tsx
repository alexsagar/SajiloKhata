import { AppLayout } from "@/components/common/app-layout"
import { Header } from "@/components/common/header"
import { UserSettings } from "@/components/settings/user-settings"

export default function SettingsPage() {
  return (
    <AppLayout>
      <Header title="Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <UserSettings />
      </div>
    </AppLayout>
  )
}
