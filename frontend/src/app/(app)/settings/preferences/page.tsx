import { Header } from "@/components/common/header"
import { PreferenceSettings } from "@/components/settings/preference-settings"

export default function PreferencesPage() {
  return (
    <>
      <Header title="Preferences" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <PreferenceSettings />
      </div>
    </>
  )
}
