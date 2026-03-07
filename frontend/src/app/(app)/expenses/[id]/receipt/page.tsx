import { Header } from "@/components/common/header"
import { ReceiptPreview } from "@/components/ocr/receipt-preview"

interface ReceiptPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params

  return (
    <>
      <Header title="Receipt" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ReceiptPreview expenseId={id} />
      </div>
    </>
  )
}
