"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, 
  Cpu, 
  Eye, 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  CreditCard,
  ShoppingCart,
  BarChart3,
  Flame,
  Bolt,
  Star
} from "lucide-react"

export default function CyberpunkDarkPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Cyberpunk Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-cyber opacity-10 rounded-3xl blur-xl"></div>
          <div className="relative text-center space-y-6 py-16 px-8">
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium neon-glow animate-pulse-neon">
              <Zap className="h-4 w-4" />
              CYBERPUNK DARK MODE
            </div>
            <h1 className="text-6xl font-bold text-gradient-neon animate-pulse-neon">
              DARK FUTURE
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the ultimate cyberpunk dark mode with neon glows, electric effects, and modern cool styling.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Badge variant="secondary" className="electric-glow animate-pulse text-electric">
                <Cpu className="h-3 w-3 mr-1" />
                NEURAL ENHANCED
              </Badge>
              <Badge variant="outline" className="neon-glow text-neon">
                <Eye className="h-3 w-3 mr-1" />
                DARK ONLY
              </Badge>
            </div>
          </div>
        </div>

        <div className="separator-gradient"></div>

        {/* Cyberpunk Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Users, label: "Neural Nodes", value: "12,847", change: "+12.5%", trend: "up", glow: "neon-glow" },
            { icon: DollarSign, label: "Credits", value: "¥45,678", change: "+8.2%", trend: "up", glow: "electric-glow" },
            { icon: Activity, label: "Active Streams", value: "3,421", change: "-2.1%", trend: "down", glow: "neon-glow" },
            { icon: CreditCard, label: "Transactions", value: "8,934", change: "+15.3%", trend: "up", glow: "electric-glow" }
          ].map((stat, index) => (
            <Card key={index} className={`hover-lift ${stat.glow} transition-all duration-300`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                <stat.icon className={`h-4 w-4 ${index % 2 === 0 ? 'text-neon' : 'text-electric'}`} />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className={`text-2xl font-bold ${index % 2 === 0 ? 'text-neon' : 'text-electric'}`}>
                  {stat.value}
                </div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${
                  stat.trend === "up" ? "text-green-400" : "text-red-400"
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

        {/* Cyberpunk Cards Showcase */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4 text-gradient-electric">NEURAL INTERFACES</h2>
            <p className="text-muted-foreground">Advanced cyberpunk components with neon effects and cool animations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Neon Card */}
            <Card className="hover-lift neon-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-neon" />
                  <span className="text-neon">Neon Interface</span>
                </CardTitle>
                <CardDescription>Enhanced with cyan neon glow effects</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This interface showcases the cyberpunk neon aesthetic with cool blue glows and electric effects.
                </p>
                <Button className="w-full bg-gradient-neon text-black hover-scale">
                  <Zap className="h-4 w-4 mr-2" />
                  JACK IN
                </Button>
              </CardContent>
            </Card>

            {/* Electric Card */}
            <Card className="hover-lift electric-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bolt className="h-5 w-5 text-electric" />
                  <span className="text-electric">Electric Core</span>
                </CardTitle>
                <CardDescription>Powered by electric purple energy</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Electric purple effects create a powerful cyberpunk atmosphere with dynamic animations.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="electric-glow text-electric border-electric">
                    SCAN
                  </Button>
                  <Button variant="ghost" size="sm" className="hover-scale text-electric">
                    ANALYZE
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cyber Border Card */}
            <Card className="hover-lift cyber-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-gradient-cyber" />
                  <span className="text-gradient-cyber">Cyber Matrix</span>
                </CardTitle>
                <CardDescription>Multi-color gradient border effects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Input 
                    placeholder="Neural input stream..." 
                    className="neon-glow bg-background border-primary/30" 
                  />
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="neon-glow">ACTIVE</Badge>
                    <Badge variant="outline" className="electric-glow text-electric">SECURE</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="section-divider"></div>

        {/* Cyberpunk Navigation */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-muted rounded-lg neon-glow">
              {[
                { id: "overview", label: "NEURAL MAP", icon: BarChart3 },
                { id: "analytics", label: "DATA STREAM", icon: Activity },
                { id: "sales", label: "CREDIT FLOW", icon: ShoppingCart }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={`hover-scale transition-all duration-300 ${
                    activeTab === tab.id ? 'neon-glow text-neon' : 'hover:text-electric'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <Card className="hover-lift electric-glow">
            <CardHeader>
              <CardTitle className="text-gradient-electric">
                {activeTab === "overview" && "NEURAL NETWORK OVERVIEW"}
                {activeTab === "analytics" && "DATA STREAM ANALYTICS"}
                {activeTab === "sales" && "CREDIT FLOW ANALYSIS"}
              </CardTitle>
              <CardDescription>
                {activeTab === "overview" && "System performance and neural activity metrics"}
                {activeTab === "analytics" && "Advanced data processing and stream analysis"}
                {activeTab === "sales" && "Financial transactions and credit flow data"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className={`p-4 bg-muted/30 rounded-lg hover-lift transition-all duration-300 ${
                    item % 2 === 0 ? 'neon-glow' : 'electric-glow'
                  }`}>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Node {item}
                    </div>
                    <div className={`text-lg font-semibold ${
                      item % 2 === 0 ? 'text-neon' : 'text-electric'
                    }`}>
                      {activeTab === "overview" && `${item * 1234}`}
                      {activeTab === "analytics" && `${item * 567}%`}
                      {activeTab === "sales" && `¥${item * 8900}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="separator"></div>

        {/* Cyberpunk Controls */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 text-gradient-neon animate-pulse-neon">CONTROL MATRIX</h3>
            <p className="text-muted-foreground">Interactive cyberpunk controls with electric effects</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="hover-lift neon-glow">
              <CardHeader>
                <CardTitle className="text-neon">COMMAND INTERFACE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button className="bg-gradient-neon text-black hover-scale">
                    <Zap className="h-4 w-4 mr-2" />
                    EXECUTE
                  </Button>
                  <Button variant="secondary" className="neon-glow text-neon hover-scale">
                    PROCESS
                  </Button>
                  <Button variant="outline" className="electric-glow text-electric border-electric hover-lift">
                    ANALYZE
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="destructive" className="hover-lift bg-red-600">
                    TERMINATE
                  </Button>
                  <Button size="sm" className="neon-glow hover-scale">
                    MICRO
                  </Button>
                  <Button size="lg" className="bg-gradient-electric text-black hover-scale">
                    <Bolt className="h-4 w-4 mr-2" />
                    MEGA BOOST
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift electric-glow">
              <CardHeader>
                <CardTitle className="text-electric">NEURAL INPUT</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder="Primary neural stream..." 
                  className="neon-glow bg-background border-primary/30" 
                />
                <Input 
                  placeholder="Secondary data flow..." 
                  className="electric-glow bg-background border-secondary/30" 
                />
                <Button className="w-full bg-gradient-cyber text-black hover-scale">
                  <Sparkles className="h-4 w-4 mr-2" />
                  UPLOAD TO MATRIX
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="separator-gradient"></div>

        {/* Footer */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-muted-foreground mb-4">
            <Cpu className="h-4 w-4 text-neon animate-pulse-neon" />
            <span className="text-gradient-electric">CYBERPUNK DARK MODE SYSTEM</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            This cyberpunk dark mode features neon cyan and electric purple effects, 
            gradient borders, cool animations, and a modern dark aesthetic inspired by 
            futuristic interfaces and neural networks.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Badge variant="outline" className="neon-glow text-neon animate-pulse">
              NEURAL ACTIVE
            </Badge>
            <Badge variant="outline" className="electric-glow text-electric animate-pulse">
              SYSTEMS ONLINE
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
