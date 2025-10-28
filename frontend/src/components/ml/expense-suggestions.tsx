"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Zap,
  Star,
  ThumbsUp,
  ThumbsDown,
  X
} from "lucide-react"

interface ExpenseSuggestion {
  id: string
  type: 'split_optimization' | 'category_suggestion' | 'budget_alert' | 'recurring_detection' | 'duplicate_warning' | 'savings_opportunity'
  title: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  category: string
  actionable: boolean
  data: {
    amount?: number
    currency?: string
    participants?: string[]
    suggestedCategory?: string
    currentCategory?: string
    potentialSavings?: number
    frequency?: string
    similarExpenses?: any[]
  }
  timestamp: string
  status: 'pending' | 'accepted' | 'dismissed'
}

// Empty initial data - will be populated from API
const mockSuggestions: ExpenseSuggestion[] = []

export function ExpenseSuggestions() {
  const [suggestions, setSuggestions] = useState<ExpenseSuggestion[]>(mockSuggestions)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [isLearning, setIsLearning] = useState(false)

  const handleSuggestionAction = (id: string, action: 'accept' | 'dismiss') => {
    setSuggestions(prev => prev.map(suggestion => 
      suggestion.id === id 
        ? { ...suggestion, status: action === 'accept' ? 'accepted' : 'dismissed' }
        : suggestion
    ))

    // Simulate ML learning from user feedback
    setIsLearning(true)
    setTimeout(() => setIsLearning(false), 1000)
  }

  const provideFeedback = (id: string, helpful: boolean) => {
    // In a real app, this would send feedback to the ML service
    console.log(`Feedback for suggestion ${id}: ${helpful ? 'helpful' : 'not helpful'}`)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'split_optimization':
        return <Users className="h-4 w-4" />
      case 'category_suggestion':
        return <Target className="h-4 w-4" />
      case 'budget_alert':
        return <AlertTriangle className="h-4 w-4" />
      case 'recurring_detection':
        return <Clock className="h-4 w-4" />
      case 'duplicate_warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'savings_opportunity':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'split_optimization':
        return 'bg-blue-100 text-blue-800'
      case 'category_suggestion':
        return 'bg-purple-100 text-purple-800'
      case 'budget_alert':
        return 'bg-red-100 text-red-800'
      case 'recurring_detection':
        return 'bg-green-100 text-green-800'
      case 'duplicate_warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'savings_opportunity':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Impact</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Impact</Badge>
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Impact</Badge>
      default:
        return <Badge variant="outline">{impact}</Badge>
    }
  }

  const filteredSuggestions = suggestions.filter(suggestion => {
    if (filter === 'all') return suggestion.status === 'pending'
    return suggestion.status === 'pending' && suggestion.impact === filter
  })

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending')
  const acceptedSuggestions = suggestions.filter(s => s.status === 'accepted')
  const dismissedSuggestions = suggestions.filter(s => s.status === 'dismissed')

  const totalPotentialSavings = pendingSuggestions
    .filter(s => s.data.potentialSavings)
    .reduce((sum, s) => sum + (s.data.potentialSavings || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Expense Suggestions
          </h2>
          <p className="text-muted-foreground">
            Smart recommendations to optimize your expense management
          </p>
        </div>
        {isLearning && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 animate-pulse" />
            Learning from your feedback...
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSuggestions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalPotentialSavings.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {acceptedSuggestions.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingSuggestions.length > 0 
                ? Math.round(pendingSuggestions.reduce((sum, s) => sum + s.confidence, 0) / pendingSuggestions.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingSuggestions.length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({acceptedSuggestions.length})</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed ({dismissedSuggestions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('high')}
            >
              High Impact
            </Button>
            <Button
              variant={filter === 'medium' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('medium')}
            >
              Medium Impact
            </Button>
            <Button
              variant={filter === 'low' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('low')}
            >
              Low Impact
            </Button>
          </div>

          {/* Suggestions List */}
          <div className="space-y-4">
            {filteredSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(suggestion.type)}`}>
                        {getTypeIcon(suggestion.type)}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                        <CardDescription>{suggestion.description}</CardDescription>
                        <div className="flex items-center gap-2">
                          {getImpactBadge(suggestion.impact)}
                          <Badge variant="outline" className="text-xs">
                            {suggestion.confidence}% confidence
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSuggestionAction(suggestion.id, 'dismiss')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Confidence Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>AI Confidence</span>
                        <span>{suggestion.confidence}%</span>
                      </div>
                      <Progress value={suggestion.confidence} className="h-2" />
                    </div>

                    {/* Suggestion Details */}
                    {suggestion.data.amount && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>Amount: ${suggestion.data.amount}</span>
                      </div>
                    )}

                    {suggestion.data.potentialSavings && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <TrendingDown className="h-4 w-4" />
                        <span>Potential savings: ${suggestion.data.potentialSavings}</span>
                      </div>
                    )}

                    {suggestion.data.participants && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Participants: {suggestion.data.participants.join(', ')}</span>
                      </div>
                    )}

                    {suggestion.data.frequency && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Frequency: {suggestion.data.frequency}</span>
                      </div>
                    )}

                    {/* Actions */}
                    {suggestion.actionable && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Apply Suggestion
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionAction(suggestion.id, 'dismiss')}
                          >
                            Not Now
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground mr-2">Helpful?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => provideFeedback(suggestion.id, true)}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => provideFeedback(suggestion.id, false)}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredSuggestions.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No suggestions available</h3>
                  <p className="text-muted-foreground">
                    Our AI is analyzing your spending patterns. Check back later for personalized recommendations.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          <div className="space-y-4">
            {acceptedSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                      <CardDescription>{suggestion.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Applied on {new Date(suggestion.timestamp).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dismissed" className="space-y-4">
          <div className="space-y-4">
            {dismissedSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="border-gray-200 bg-gray-50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <X className="h-5 w-5 text-gray-600" />
                    <div>
                      <CardTitle className="text-lg text-gray-700">{suggestion.title}</CardTitle>
                      <CardDescription className="text-gray-600">{suggestion.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Dismissed on {new Date(suggestion.timestamp).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}