import { Header } from "@/components/common/header"
import { ContentModeration } from "@/components/admin/content-moderation"

export default function AdminModerationPage() {
  return (
    <>
      <Header title="Content Moderation" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ContentModeration />
      </div>
    </>
  )
}