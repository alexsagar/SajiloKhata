"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface ExpenseTrendsProps {
  data: Array<{
    _id: string
    total: number
    count: number
    period: string
  }>
  period: string
}

export function ExpenseTrends({ data, period }: ExpenseTrendsProps) {
  // Use provided data or fall back to mock data
  const trends = data && data.length > 0 ? {
    currentPeriod: data[0]?.total || 0,
    previousPeriod: data[1]?.total || 0,
    change: (data[0]?.total || 0) - (data[1]?.total || 0),
    changePercent: data[1]?.total ? ((data[0]?.total - data[1]?.total) / data[1]?.total) * 100 : 0,
    isIncrease: (data[0]?.total || 0) > (data[1]?.total || 0)
  } : {
    currentPeriod: 1250.50,
    previousPeriod: 980.25,
    change: 270.25,
    changePercent: 27.6,
    isIncrease: true
  }

  const getTrendIcon = () => {
    if (trends.changePercent > 5) return <TrendingUp className="h-4 w-4 text-red-500" />
    if (trends.changePercent < -5) return <TrendingDown className="h-4 w-4 text-green-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getTrendColor = () => {
    if (trends.changePercent > 5) return "text-red-500"
    if (trends.changePercent < -5) return "text-green-500"
    return "text-gray-500"
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTrendIcon()}
            Spending Trend
          </CardTitle>
          <CardDescription>
            Comparison with previous {period}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current {period}</p>
                <p className="text-2xl font-bold">{formatCurrency(trends.currentPeriod)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Previous {period}</p>
                <p className="text-2xl font-bold">{formatCurrency(trends.previousPeriod)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`font-medium ${getTrendColor()}`}>
                {trends.isIncrease ? '+' : ''}{formatCurrency(trends.change)}
              </span>
              <span className={`text-sm ${getTrendColor()}`}>
                ({trends.isIncrease ? '+' : ''}{trends.changePercent.toFixed(1)}%)
              </span>
              <span className="text-sm text-muted-foreground">
                vs previous {period}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Average per day</p>
              <p className="text-lg font-bold">{formatCurrency(41.68)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Highest expense</p>
              <p className="text-lg font-bold">{formatCurrency(156.75)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Most frequent category</p>
              <p className="text-lg font-bold">Food</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}