"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  Zap, 
  Heart, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  CreditCard,
  ShoppingCart,
  BarChart3
} from "lucide-react"
// ThemeToggle removed - now dark-only

export default function PremiumLightPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Premium Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 rounded-3xl"></div>
          <div className="relative text-center space-y-6 py-16 px-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium hover-lift">
              <Sparkles className="h-4 w-4" />
              Premium Light Mode
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              Modern & Professional
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the premium light mode with warm off-white backgrounds, subtle shadows, and beautiful micro-interactions.
            </p>
            <div className="flex items-center justify-center gap-4">
              {/* ThemeToggle removed - dark-only mode */}
              <Badge variant="secondary" className="animate-pulse hover-scale">
                v2.0 Premium
              </Badge>
            </div>
          </div>
        </div>

        <div className="separator-gradient"></div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Users, label: "Total Users", value: "12,847", change: "+12.5%", trend: "up" },
            { icon: DollarSign, label: "Revenue", value: "$45,678", change: "+8.2%", trend: "up" },
            { icon: Activity, label: "Active Sessions", value: "3,421", change: "-2.1%", trend: "down" },
            { icon: CreditCard, label: "Transactions", value: "8,934", change: "+15.3%", trend: "up" }
          ].map((stat, index) => (
            <Card key={index} className="card-stat hover-lift hover-glow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${
                  stat.trend === "up" ? "text-green-600" : "text-red-600"
                }`}>
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="separator"></div>

        {/* Premium Cards Showcase */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Premium Components</h2>
            <p className="text-muted-foreground">Beautiful cards with subtle shadows and smooth interactions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Premium Card */}
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Premium Features
                </CardTitle>
                <CardDescription>Enhanced with subtle shadows and depth</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This card showcases the new premium light mode with warm backgrounds and professional styling.
                </p>
                <Button className="w-full hover-scale">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Glass Effect Card */}
            <Card className="card-glass hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Glass Effect
                </CardTitle>
                <CardDescription>Beautiful glassmorphism design</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Subtle glass effects with backdrop blur create a modern, premium appearance.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="hover-glow">
                    Learn More
                  </Button>
                  <Button variant="ghost" size="sm" className="hover-scale">
                    Demo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Card */}
            <Card className="hover-lift hover-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-blue-500" />
                  Interactive Elements
                </CardTitle>
                <CardDescription>Smooth hover effects and animations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Input placeholder="Try typing here..." className="hover-glow" />
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="hover-scale">Premium</Badge>
                    <Badge variant="outline" className="hover-lift">Modern</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="section-divider"></div>

        {/* Navigation Tabs */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-muted rounded-lg">
              {[
                { id: "overview", label: "Overview", icon: BarChart3 },
                { id: "analytics", label: "Analytics", icon: Activity },
                { id: "sales", label: "Sales", icon: ShoppingCart }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="hover-scale"
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle>
                {activeTab === "overview" && "Business Overview"}
                {activeTab === "analytics" && "Analytics Dashboard"}
                {activeTab === "sales" && "Sales Performance"}
              </CardTitle>
              <CardDescription>
                {activeTab === "overview" && "Key metrics and performance indicators"}
                {activeTab === "analytics" && "Detailed analytics and insights"}
                {activeTab === "sales" && "Sales data and conversion metrics"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="p-4 bg-muted/30 rounded-lg hover-lift">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Metric {item}
                    </div>
                    <div className="text-lg font-semibold">
                      {activeTab === "overview" && `${item * 1234}`}
                      {activeTab === "analytics" && `${item * 567}%`}
                      {activeTab === "sales" && `$${item * 8900}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="separator"></div>

        {/* Button Showcase */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Interactive Elements</h3>
            <p className="text-muted-foreground">Buttons and controls with premium hover effects</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle>Button Variants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button className="hover-glow">Primary</Button>
                  <Button variant="secondary" className="hover-scale">Secondary</Button>
                  <Button variant="outline" className="hover-lift">Outline</Button>
                  <Button variant="ghost" className="hover-scale">Ghost</Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="destructive" className="hover-lift">Destructive</Button>
                  <Button size="sm" className="hover-scale">Small</Button>
                  <Button size="lg" className="hover-glow">Large</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardHeader>
                <CardTitle>Form Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Premium input field" className="hover-glow" />
                <Input placeholder="Another input" className="hover-glow" />
                <Button className="w-full bg-gradient-primary text-primary-foreground hover-scale">
                  Submit Form
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="separator-gradient"></div>

        {/* Footer */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-muted-foreground mb-4">
            <Heart className="h-4 w-4 text-red-500" />
            Premium Light Mode Design System
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            This premium light mode features warm off-white backgrounds (#f9f9fb), subtle card shadows, 
            consistent primary accent colors, improved typography hierarchy, and smooth micro-animations 
            for a professional and modern user experience.
          </p>
        </div>
      </div>
    </div>
  )
}
