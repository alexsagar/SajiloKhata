import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ReceiptPreview } from "@/components/ocr/receipt-preview"

interface ReceiptPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params
  
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Receipt" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <ReceiptPreview expenseId={id} />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
