import { Header } from "@/components/common/header"
import { GroupSettings } from "@/components/groups/group-settings"

interface GroupSettingsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function GroupSettingsPage({ params }: GroupSettingsPageProps) {
  const { id } = await params

  return (
    <>
      <Header title="Group Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <GroupSettings groupId={id} />
      </div>
    </>
  )
}
