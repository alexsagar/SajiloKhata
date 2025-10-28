import { AppLayout } from "@/components/common/app-layout"
import { Header } from "@/components/common/header"
import { PricingPlans } from "@/components/premium/pricing-plans"

export default function PricingPlansPage() {
  return (
    <AppLayout>
      <Header title="Pricing Plans" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <PricingPlans />
      </div>
    </AppLayout>
  )
}
