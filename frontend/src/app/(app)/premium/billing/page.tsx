import { Header } from "@/components/common/header"
import { BillingHistory } from "@/components/premium/billing-history"

export default function BillingPage() {
  return (
    <>
      <Header title="Billing" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <BillingHistory />
      </div>
    </>
  )
}
