import { GroupPageClient } from "./group-page-client"

interface GroupPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { id } = await params

  return <GroupPageClient groupId={id} />
}
