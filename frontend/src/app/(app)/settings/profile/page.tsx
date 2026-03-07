import { Header } from "@/components/common/header"
import { ProfileSettings } from "@/components/settings/profile-settings"

export default function ProfileSettingsPage() {
  return (
    <>
      <Header title="Profile Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ProfileSettings />
      </div>
    </>
  )
}
