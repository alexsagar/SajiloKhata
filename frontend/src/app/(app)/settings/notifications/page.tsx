import { Header } from "@/components/common/header"
import { NotificationSettings } from "@/components/settings/notification-settings"

export default function NotificationSettingsPage() {
  return (
    <>
      <Header title="Notification Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <NotificationSettings />
      </div>
    </>
  )
}
