"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Brain, 
  Target, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Zap,
  Settings,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Edit
} from "lucide-react"

interface CategoryPrediction {
  category: string
  confidence: number
  reasoning: string[]
  alternativeCategories: {
    category: string
    confidence: number
  }[]
}

interface ExpenseItem {
  id: string
  description: string
  amount: number
  merchant: string
  currentCategory?: string
  predictedCategory: CategoryPrediction
  userFeedback?: 'correct' | 'incorrect'
  timestamp: string
}

interface CategoryRule {
  id: string
  pattern: string
  category: string
  confidence: number
  examples: string[]
  isActive: boolean
  accuracy: number
}

// Mock expense categories
const categories = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Education',
  'Business',
  'Personal Care',
  'Gifts & Donations',
  'Investments',
  'Other'
]

// Empty initial data - will be populated from API
const mockRules: CategoryRule[] = []
const mockExpenses: ExpenseItem[] = []

export function SmartCategorization() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(mockExpenses)
  const [rules, setRules] = useState<CategoryRule[]>(mockRules)
  const [isLearning, setIsLearning] = useState(false)
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    merchant: ''
  })

  const handleFeedback = (expenseId: string, feedback: 'correct' | 'incorrect', correctCategory?: string) => {
    setExpenses(prev => prev.map(expense => 
      expense.id === expenseId 
        ? { ...expense, userFeedback: feedback, currentCategory: correctCategory || expense.predictedCategory.category }
        : expense
    ))

    // Simulate AI learning
    setIsLearning(true)
    setTimeout(() => setIsLearning(false), 1500)
  }

  const predictCategory = async (description: string, merchant: string, amount: number): Promise<CategoryPrediction> => {
    // Simulate AI prediction
    await new Promise(resolve => setTimeout(resolve, 500))

    // Simple rule-based prediction for demo
    const text = `${description} ${merchant}`.toLowerCase()
    
    for (const rule of rules) {
      const regex = new RegExp(rule.pattern.toLowerCase(), 'i')
      if (regex.test(text)) {
        return {
          category: rule.category,
          confidence: rule.confidence,
          reasoning: [
            `Matches pattern: "${rule.pattern}"`,
            `Based on ${rule.examples.length} similar examples`,
            `Rule accuracy: ${rule.accuracy}%`
          ],
          alternativeCategories: [
            { category: 'Other', confidence: 100 - rule.confidence }
          ]
        }
      }
    }

    // Default prediction
    return {
      category: 'Other',
      confidence: 45,
      reasoning: [
        'No specific patterns matched',
        'Using general classification model',
        'Consider adding more context'
      ],
      alternativeCategories: [
        { category: 'Shopping', confidence: 25 },
        { category: 'Food & Dining', confidence: 20 }
      ]
    }
  }

  const handleTestPrediction = async () => {
    if (!newExpense.description || !newExpense.amount) return

    setIsLearning(true)
    const prediction = await predictCategory(
      newExpense.description,
      newExpense.merchant,
      parseFloat(newExpense.amount)
    )

    const testExpense: ExpenseItem = {
      id: Date.now().toString(),
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      merchant: newExpense.merchant,
      predictedCategory: prediction,
      timestamp: new Date().toISOString()
    }

    setExpenses(prev => [testExpense, ...prev])
    setNewExpense({ description: '', amount: '', merchant: '' })
    setIsLearning(false)
  }

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ))
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600'
    if (confidence >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>
    if (confidence >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>
    return <Badge className="bg-red-100 text-red-800">Low Confidence</Badge>
  }

  const averageAccuracy = rules.reduce((sum, rule) => sum + rule.accuracy, 0) / rules.length
  const correctPredictions = expenses.filter(e => e.userFeedback === 'correct').length
  const totalFeedback = expenses.filter(e => e.userFeedback).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Smart Categorization
          </h2>
          <p className="text-muted-foreground">
            AI-powered expense categorization with continuous learning
          </p>
        </div>
        {isLearning && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 animate-pulse" />
            AI is learning...
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageAccuracy.toFixed(1)}%</div>
            <Progress value={averageAccuracy} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.filter(r => r.isActive).length}</div>
            <p className="text-xs text-muted-foreground">of {rules.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalFeedback > 0 ? Math.round((correctPredictions / totalFeedback) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{correctPredictions}/{totalFeedback} correct</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Predictions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
            <p className="text-xs text-muted-foreground">expenses categorized</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="predictions">Recent Predictions</TabsTrigger>
          <TabsTrigger value="rules">Categorization Rules</TabsTrigger>
          <TabsTrigger value="test">Test Prediction</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-4">
          <div className="space-y-4">
            {expenses.map((expense) => (
              <Card key={expense.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{expense.description}</CardTitle>
                      <CardDescription>
                        {expense.merchant} • ${expense.amount} • {new Date(expense.timestamp).toLocaleDateString()}
                      </CardDescription>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{expense.predictedCategory.category}</span>
                        {getConfidenceBadge(expense.predictedCategory.confidence)}
                        <span className={`text-sm ${getConfidenceColor(expense.predictedCategory.confidence)}`}>
                          {expense.predictedCategory.confidence}%
                        </span>
                      </div>
                    </div>
                    {expense.userFeedback && (
                      <Badge variant={expense.userFeedback === 'correct' ? 'default' : 'destructive'}>
                        {expense.userFeedback === 'correct' ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Correct
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Incorrect
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* AI Reasoning */}
                    <div>
                      <Label className="text-sm font-medium">AI Reasoning</Label>
                      <ul className="mt-1 space-y-1">
                        {expense.predictedCategory.reasoning.map((reason, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Alternative Categories */}
                    {expense.predictedCategory.alternativeCategories.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Alternative Suggestions</Label>
                        <div className="mt-1 flex gap-2 flex-wrap">
                          {expense.predictedCategory.alternativeCategories.map((alt, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {alt.category} ({alt.confidence}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feedback Actions */}
                    {!expense.userFeedback && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="space-y-2">
                          <Label className="text-sm">Is this categorization correct?</Label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleFeedback(expense.id, 'correct')}
                            >
                              <ThumbsUp className="h-4 w-4 mr-2" />
                              Correct
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFeedback(expense.id, 'incorrect')}
                            >
                              <ThumbsDown className="h-4 w-4 mr-2" />
                              Incorrect
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">Correct category:</Label>
                          <Select onValueChange={(value) => handleFeedback(expense.id, 'correct', value)}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learned Categorization Rules</CardTitle>
              <CardDescription>
                AI-generated rules based on your expense patterns and feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm">{rule.pattern}</code>
                        <span>→</span>
                        <Badge>{rule.category}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {rule.accuracy}% accuracy
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Examples: {rule.examples.join(', ')}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant={rule.isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleRule(rule.id)}
                      >
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test AI Categorization</CardTitle>
              <CardDescription>
                Enter expense details to see how the AI would categorize it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="e.g., Coffee and muffin"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="merchant">Merchant</Label>
                    <Input
                      id="merchant"
                      placeholder="e.g., Starbucks"
                      value={newExpense.merchant}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, merchant: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleTestPrediction}
                  disabled={!newExpense.description || !newExpense.amount || isLearning}
                  className="w-full"
                >
                  {isLearning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Predict Category
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}