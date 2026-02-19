"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react"
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
  // No data — actionable empty state
  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No trend data available</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
              Add expenses to see spending trends, or try adjusting the date range and filters.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Compute trends from real data only
  const current = data[0]
  const previous = data.length > 1 ? data[1] : null
  const currentTotal = current?.total ?? 0
  const previousTotal = previous?.total ?? 0
  const change = currentTotal - previousTotal
  const changePercent = previousTotal !== 0 ? (change / previousTotal) * 100 : 0
  const isIncrease = change > 0

  // Derived stats from the full dataset
  const totalCount = data.reduce((s, d) => s + (d.count || 0), 0)
  const totalAmount = data.reduce((s, d) => s + (d.total || 0), 0)
  const avgPerPeriod = data.length > 0 ? totalAmount / data.length : 0
  const highestPeriod = data.reduce((max, d) => (d.total > max.total ? d : max), data[0])

  const getTrendIcon = () => {
    if (changePercent > 5) return <TrendingUp className="h-4 w-4 text-red-500" />
    if (changePercent < -5) return <TrendingDown className="h-4 w-4 text-green-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getTrendColor = () => {
    if (changePercent > 5) return "text-red-500"
    if (changePercent < -5) return "text-green-500"
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
                <p className="text-2xl font-bold">{formatCurrency(currentTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Previous {period}</p>
                <p className="text-2xl font-bold">{previous ? formatCurrency(previousTotal) : '—'}</p>
              </div>
            </div>

            {previous && (
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getTrendColor()}`}>
                  {isIncrease ? '+' : ''}{formatCurrency(change)}
                </span>
                <span className={`text-sm ${getTrendColor()}`}>
                  ({isIncrease ? '+' : ''}{changePercent.toFixed(1)}%)
                </span>
                <span className="text-sm text-muted-foreground">
                  vs previous {period}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Average per {period}</p>
              <p className="text-lg font-bold">{formatCurrency(avgPerPeriod)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Highest {period}</p>
              <p className="text-lg font-bold">{formatCurrency(highestPeriod?.total ?? 0)}</p>
              <p className="text-xs text-muted-foreground">{highestPeriod?._id || '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total expenses</p>
              <p className="text-lg font-bold">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}