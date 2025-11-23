import { InviteAcceptClient } from "./InviteAcceptClient"

export default async function InviteAcceptPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <InviteAcceptClient code={code} />
}


