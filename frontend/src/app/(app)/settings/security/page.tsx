import { Header } from "@/components/common/header"
import { SecuritySettings } from "@/components/settings/security-settings"

export default function SecuritySettingsPage() {
  return (
    <>
      <Header title="Security Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <SecuritySettings />
      </div>
    </>
  )
}
