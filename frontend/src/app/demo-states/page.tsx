"use client"

import { useState } from "react"
import { AppLayout } from "@/components/common/app-layout"
import { Header } from "@/components/common/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Loading, 
  PageLoading, 
  ComponentLoading, 
  InlineLoading 
} from "@/components/ui/loading"
import { 
  ErrorDisplay, 
  PageError, 
  ComponentError, 
  InlineError 
} from "@/components/ui/error-display"

export default function DemoStatesPage() {
  const [showPageLoading, setShowPageLoading] = useState(false)
  const [showPageError, setShowPageError] = useState(false)

  return (
    <AppLayout>
      <Header title="Loading & Error States Demo" description="Showcase of all loading animations and error displays with responsive design and theme support" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-8">
          {/* Loading States */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Loading States</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Spinner (Small)</CardTitle>
                  <CardDescription>Small spinning loader</CardDescription>
                </CardHeader>
                <CardContent>
                  <Loading variant="spinner" size="sm" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Spinner (Medium)</CardTitle>
                  <CardDescription>Medium spinning loader</CardDescription>
                </CardHeader>
                <CardContent>
                  <Loading variant="spinner" size="md" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Spinner (Large)</CardTitle>
                  <CardDescription>Large spinning loader</CardDescription>
                </CardHeader>
                <CardContent>
                  <Loading variant="spinner" size="lg" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pulsing Dots</CardTitle>
                  <CardDescription>Animated dots with stagger</CardDescription>
                </CardHeader>
                <CardContent>
                  <Loading variant="dots" size="md" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pulse Scale</CardTitle>
                  <CardDescription>Scaling pulse animation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Loading variant="pulse" size="md" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>With Text</CardTitle>
                  <CardDescription>Loading with custom text</CardDescription>
                </CardHeader>
                <CardContent>
                  <Loading variant="spinner" size="md" text="Processing..." />
                </CardContent>
              </Card>
            </div>

            {/* Component Loading Examples */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Component Loading</h3>
              
              <Card>
                <CardHeader>
                  <CardTitle>Component Loading State</CardTitle>
                  <CardDescription>For loading content within components</CardDescription>
                </CardHeader>
                <CardContent>
                  <ComponentLoading text="Loading data..." />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inline Loading</CardTitle>
                  <CardDescription>Small loader for buttons and inline use</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <Button disabled>
                    <InlineLoading />
                    Loading...
                  </Button>
                  <span>Processing <InlineLoading /></span>
                </CardContent>
              </Card>
            </div>

            {/* Full Screen Loading */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Full Screen Loading</h3>
              <Button 
                onClick={() => {
                  setShowPageLoading(true)
                  setTimeout(() => setShowPageLoading(false), 3000)
                }}
              >
                Show Page Loading (3s)
              </Button>
              {showPageLoading && <PageLoading text="Loading application..." />}
            </div>
          </div>

          {/* Error States */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Error States</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Component Error</CardTitle>
                  <CardDescription>Error within a component</CardDescription>
                </CardHeader>
                <CardContent>
                  <ComponentError 
                    message="Failed to load data. Please try again." 
                    onRetry={() => alert("Retrying...")}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inline Error</CardTitle>
                  <CardDescription>Small error for form fields</CardDescription>
                </CardHeader>
                <CardContent>
                  <InlineError message="Invalid email address" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Display</CardTitle>
                  <CardDescription>Flexible error component</CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorDisplay
                    title="Network Error"
                    message="Unable to connect to server. Check your internet connection."
                    onRetry={() => alert("Retrying...")}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error with Home Button</CardTitle>
                  <CardDescription>Error with navigation option</CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorDisplay
                    title="Page Not Found"
                    message="The page you're looking for doesn't exist."
                    showRetry={false}
                    showHome={true}
                    onHome={() => alert("Going home...")}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Full Screen Error */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Full Screen Error</h3>
              <Button 
                onClick={() => {
                  setShowPageError(true)
                  setTimeout(() => setShowPageError(false), 5000)
                }}
              >
                Show Page Error (5s)
              </Button>
              {showPageError && (
                <PageError
                  title="Something went wrong!"
                  message="An unexpected error occurred. This is just a demo."
                  onRetry={() => setShowPageError(false)}
                  onHome={() => setShowPageError(false)}
                />
              )}
            </div>
          </div>

          {/* Responsive Test */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Responsive Test</h2>
            <p className="text-muted-foreground">
              Resize your browser window to test responsiveness. All components adapt to different screen sizes.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Loading variant={["spinner", "dots", "pulse"][i % 3] as any} size="md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
