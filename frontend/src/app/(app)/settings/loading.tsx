import { PageLoading } from "@/components/ui/loading"

export default function SettingsLoading() {
  return (
    <PageLoading 
      text="Loading Settings" 
      subtitle="Please wait while we load your preferences..."
    />
  )
}
