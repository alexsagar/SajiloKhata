import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Star } from "lucide-react"

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for personal use",
    features: [
      "Up to 3 groups",
      "Basic expense tracking",
      "Simple splitting",
      "Mobile app access",
      "Email support"
    ],
    popular: false,
    buttonText: "Current Plan",
    buttonVariant: "outline" as const
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "month",
    description: "For power users and teams",
    features: [
      "Unlimited groups",
      "Advanced analytics",
      "Custom categories",
      "Priority support",
      "Smart notifications",
      "Export to CSV/PDF",
      "Receipt scanning",
      "Multi-currency support"
    ],
    popular: true,
    buttonText: "Upgrade Now",
    buttonVariant: "default" as const
  },
  {
    name: "Team",
    price: "$19.99",
    period: "month",
    description: "For organizations and large groups",
    features: [
      "Everything in Premium",
      "Team management",
      "Admin controls",
      "Bulk operations",
      "API access",
      "Custom integrations",
      "Dedicated support",
      "Advanced security"
    ],
    popular: false,
    buttonText: "Contact Sales",
    buttonVariant: "outline" as const
  }
]

export function PricingPlans() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Select the perfect plan for your expense management needs
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, index) => (
          <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{plan.period}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full" 
                variant={plan.buttonVariant}
                size="lg"
              >
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}