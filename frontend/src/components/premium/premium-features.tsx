import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Badge } from "@/components/ui/badge"
import { Check, Star, Users, BarChart3, Shield, Zap } from "lucide-react"

const features = [
  {
    icon: Users,
    title: "Unlimited Groups",
    description: "Create and manage unlimited expense groups",
    badge: "Popular"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Detailed spending insights and reports",
    badge: "New"
  },
  {
    icon: Shield,
    title: "Priority Support",
    description: "Get help when you need it most",
    badge: null
  },
  {
    icon: Zap,
    title: "Smart Notifications",
    description: "Intelligent reminders and alerts",
    badge: null
  },
  {
    icon: Star,
    title: "Custom Categories",
    description: "Create personalized expense categories",
    badge: null
  }
]

export function PremiumFeatures() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Premium Features</h2>
        <p className="text-muted-foreground">
          Unlock powerful tools to manage your expenses like a pro
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <KanbanCard key={index} className="relative">
            <KanbanCardHeader>
              <div className="flex items-center justify-between">
                <feature.icon className="h-8 w-8 text-primary" />
                {feature.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {feature.badge}
                  </Badge>
                )}
              </div>
              <KanbanCardTitle className="text-lg">{feature.title}</KanbanCardTitle>
            </KanbanCardHeader>
            <KanbanCardContent>
              <KanbanCardDescription>{feature.description}</KanbanCardDescription>
              <div className="mt-4 flex items-center text-sm text-green-600">
                <Check className="h-4 w-4 mr-2" />
                Included in Premium
              </div>
            </KanbanCardContent>
          </KanbanCard>
        ))}
      </div>
    </div>
  )
}