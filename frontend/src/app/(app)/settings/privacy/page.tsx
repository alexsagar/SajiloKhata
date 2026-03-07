import { Header } from "@/components/common/header"
import { PrivacyControls } from "@/components/settings/privacy-controls"

export default function PrivacySettingsPage() {
  return (
    <>
      <Header title="Privacy Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <PrivacyControls />
      </div>
    </>
  )
}
