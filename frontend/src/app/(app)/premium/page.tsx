import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PremiumFeatures } from "@/components/premium/premium-features"
import { PricingPlans } from "@/components/premium/pricing-plans"

export default function PremiumPage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Premium" description="Unlock advanced features with SajiloKhata Premium" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <PremiumFeatures />
          <PricingPlans />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
