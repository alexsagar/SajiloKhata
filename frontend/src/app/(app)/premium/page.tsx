import { Header } from "@/components/common/header"
import { PremiumFeatures } from "@/components/premium/premium-features"
import { PricingPlans } from "@/components/premium/pricing-plans"

export default function PremiumPage() {
  return (
    <>
      <Header title="Premium" description="Unlock advanced features with SajiloKhata Premium" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <PremiumFeatures />
        <PricingPlans />
      </div>
    </>
  )
}
