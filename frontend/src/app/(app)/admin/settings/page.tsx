import { Header } from "@/components/common/header"
import { FeatureFlags } from "@/components/admin/feature-flags"

export default function AdminSettingsPage() {
  return (
    <>
      <Header title="Admin Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FeatureFlags />
      </div>
    </>
  )
}
