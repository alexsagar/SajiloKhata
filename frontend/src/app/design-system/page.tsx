"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Palette, 
  Sparkles, 
  Zap, 
  Heart, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Sun,
  Moon,
  Monitor
} from "lucide-react"
// ThemeToggle removed - now dark-only

export default function DesignSystemPage() {
  const [activeDemo, setActiveDemo] = useState("colors")

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 py-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Modern Design System
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
            SajiloKhata Design System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive, modern design system with beautiful animations, glassmorphism effects, and perfect dark/light mode support.
          </p>
          <div className="flex items-center justify-center gap-4">
            {/* ThemeToggle removed - dark-only mode */}
            <Badge variant="secondary" className="animate-pulse neon-glow">
              v2.0 Cyberpunk
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: "colors", label: "Colors", icon: Palette },
            { id: "typography", label: "Typography", icon: Star },
            { id: "cards", label: "Cards", icon: Heart },
            { id: "buttons", label: "Buttons", icon: Zap },
            { id: "animations", label: "Animations", icon: Sparkles }
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeDemo === id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveDemo(id)}
              className="hover-lift"
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>

        {/* Color System */}
        {activeDemo === "colors" && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Color System</h2>
              <p className="text-muted-foreground">Modern, accessible colors that adapt perfectly to light and dark modes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Primary Colors */}
              <Card className="card-glass hover-lift">
                <CardHeader>
                  <CardTitle className="text-lg">Primary Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-lg shadow-lg"></div>
                    <div>
                      <div className="font-medium">Primary</div>
                      <div className="text-sm text-muted-foreground">Brand color</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-secondary rounded-lg shadow-lg"></div>
                    <div>
                      <div className="font-medium">Secondary</div>
                      <div className="text-sm text-muted-foreground">Supporting color</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent rounded-lg shadow-lg"></div>
                    <div>
                      <div className="font-medium">Accent</div>
                      <div className="text-sm text-muted-foreground">Highlight color</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Semantic Colors */}
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="text-lg">Semantic Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-lg shadow-lg"></div>
                    <div>
                      <div className="font-medium">Success</div>
                      <div className="text-sm text-muted-foreground">Positive actions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-500 rounded-lg shadow-lg"></div>
                    <div>
                      <div className="font-medium">Warning</div>
                      <div className="text-sm text-muted-foreground">Caution states</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-destructive rounded-lg shadow-lg"></div>
                    <div>
                      <div className="font-medium">Destructive</div>
                      <div className="text-sm text-muted-foreground">Error states</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gradients */}
              <Card className="bg-gradient-primary text-primary-foreground hover-lift">
                <CardHeader>
                  <CardTitle className="text-lg">Gradient Backgrounds</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 bg-gradient-secondary rounded-lg">
                    <div className="font-medium">Secondary Gradient</div>
                    <div className="text-sm opacity-90">Beautiful gradients</div>
                  </div>
                  <div className="p-4 bg-gradient-success rounded-lg text-white">
                    <div className="font-medium">Success Gradient</div>
                    <div className="text-sm opacity-90">For positive states</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Typography */}
        {activeDemo === "typography" && (
          <div className="space-y-8 animate-slide-up">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Typography</h2>
              <p className="text-muted-foreground">Beautiful, readable typography with perfect hierarchy.</p>
            </div>

            <Card className="hover-lift">
              <CardHeader>
                <CardTitle>Typography Scale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h1 className="text-5xl font-bold mb-2">Heading 1</h1>
                  <p className="text-muted-foreground">48px - Used for main page titles</p>
                </div>
                <div>
                  <h2 className="text-4xl font-bold mb-2">Heading 2</h2>
                  <p className="text-muted-foreground">36px - Used for section titles</p>
                </div>
                <div>
                  <h3 className="text-3xl font-semibold mb-2">Heading 3</h3>
                  <p className="text-muted-foreground">30px - Used for subsection titles</p>
                </div>
                <div>
                  <p className="text-lg mb-2">Large Body Text</p>
                  <p className="text-muted-foreground">18px - Used for important content</p>
                </div>
                <div>
                  <p className="mb-2">Regular Body Text</p>
                  <p className="text-muted-foreground">16px - Used for general content</p>
                </div>
                <div>
                  <p className="text-sm mb-2">Small Text</p>
                  <p className="text-muted-foreground">14px - Used for captions and metadata</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cards */}
        {activeDemo === "cards" && (
          <div className="space-y-8 animate-scale-in">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Card Components</h2>
              <p className="text-muted-foreground">Modern card designs with hover effects and glassmorphism.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Regular Card */}
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle>Regular Card</CardTitle>
                  <CardDescription>Standard card with subtle shadows</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This is a regular card with hover effects and modern styling.
                  </p>
                </CardContent>
              </Card>

              {/* Glass Card */}
              <Card className="card-glass hover-lift">
                <CardHeader>
                  <CardTitle>Glass Card</CardTitle>
                  <CardDescription>Glassmorphism effect with backdrop blur</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Beautiful glass effect with backdrop blur and transparency.
                  </p>
                </CardContent>
              </Card>

              {/* Stat Card */}
              <Card className="card-stat hover-lift">
                <CardHeader>
                  <div className="card-stat__label">Total Revenue</div>
                  <div className="card-stat__value">$45,678</div>
                  <div className="card-stat__trend--up flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    +12.5%
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* Buttons */}
        {activeDemo === "buttons" && (
          <div className="space-y-8 animate-bounce-in">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Button Components</h2>
              <p className="text-muted-foreground">Interactive buttons with modern hover effects.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle>Button Variants</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button className="hover-lift">Primary</Button>
                    <Button variant="secondary" className="hover-lift">Secondary</Button>
                    <Button variant="outline" className="hover-lift">Outline</Button>
                    <Button variant="ghost" className="hover-lift">Ghost</Button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="destructive" className="hover-lift">Destructive</Button>
                    <Button size="sm" className="hover-lift">Small</Button>
                    <Button size="lg" className="hover-lift">Large</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle>Interactive States</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full hover-scale">Hover Scale Effect</Button>
                  <Button variant="outline" className="w-full shadow-glow">Glow Effect</Button>
                  <Button variant="secondary" className="w-full bg-gradient-primary text-primary-foreground">
                    Gradient Button
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Animations */}
        {activeDemo === "animations" && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Animations</h2>
              <p className="text-muted-foreground">Smooth, modern animations that enhance user experience.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="animate-fade-in hover-lift">
                <CardHeader>
                  <CardTitle>Fade In</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Smooth fade in animation for content appearance.
                  </p>
                </CardContent>
              </Card>

              <Card className="animate-slide-up hover-lift">
                <CardHeader>
                  <CardTitle>Slide Up</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Elegant slide up animation from bottom.
                  </p>
                </CardContent>
              </Card>

              <Card className="animate-scale-in hover-lift">
                <CardHeader>
                  <CardTitle>Scale In</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Dynamic scale in animation for emphasis.
                  </p>
                </CardContent>
              </Card>

              <Card className="animate-bounce-in hover-lift">
                <CardHeader>
                  <CardTitle>Bounce In</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Playful bounce animation for interactions.
                  </p>
                </CardContent>
              </Card>

              <Card className="animate-float hover-lift">
                <CardHeader>
                  <CardTitle>Float</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Subtle floating animation for ambient motion.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-scale">
                <CardHeader>
                  <CardTitle>Hover Scale</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Interactive hover scaling for engagement.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-12 border-t border-border/50">
          <div className="inline-flex items-center gap-2 text-muted-foreground mb-4">
            <Heart className="h-4 w-4 text-red-500" />
            Built with modern CSS and attention to detail
          </div>
          <p className="text-sm text-muted-foreground">
            This design system showcases modern web design principles with perfect accessibility and theme support.
          </p>
        </div>
      </div>
    </div>
  )
}
