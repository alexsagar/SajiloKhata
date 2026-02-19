"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/currency-context"

// Types
interface SpendingItem {
    category: string
    amount: number
    count: number
    percentage?: number
    trend?: "up" | "down" | "stable"
    previousAmount?: number
}

interface SpendingChartProps {
    data: SpendingItem[]
    className?: string
}

// Color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
    food: "bg-orange-500",
    transportation: "bg-blue-500",
    entertainment: "bg-purple-500",
    utilities: "bg-green-500",
    shopping: "bg-pink-500",
    healthcare: "bg-red-500",
    education: "bg-indigo-500",
    travel: "bg-cyan-500",
    groceries: "bg-yellow-500",
    rent: "bg-gray-500",
    other: "bg-slate-500",
}

function getCategoryColor(category: string): string {
    const normalized = category.toLowerCase().replace(/\s+/g, "")
    return CATEGORY_COLORS[normalized] || CATEGORY_COLORS.other
}

// Format currency
function formatAmount(amount: number, currencySymbol: string): string {
    return `${currencySymbol}${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

export function SpendingChart({ data, className }: SpendingChartProps) {
    const { userCurrency } = useCurrency()

    // Calculate totals and percentages
    const { total, sortedData, maxAmount } = useMemo(() => {
        const total = data.reduce((sum, item) => sum + item.amount, 0)
        const withPercentage = data.map(item => ({
            ...item,
            percentage: total > 0 ? (item.amount / total) * 100 : 0,
        }))
        const sorted = [...withPercentage].sort((a, b) => b.amount - a.amount)
        const max = Math.max(...data.map(item => item.amount), 1)
        return { total, sortedData: sorted, maxAmount: max }
    }, [data])

    // Get currency symbol
    const currencySymbol = useMemo(() => {
        const symbols: Record<string, string> = {
            NPR: "Rs. ",
            USD: "$",
            EUR: "€",
            GBP: "£",
            INR: "₹",
        }
        return symbols[userCurrency] || `${userCurrency} `
    }, [userCurrency])

    // Empty state
    if (data.length === 0) {
        return (
            <Card className={cn("", className)}>
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <PieChart className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardTitle>No Spending Data</CardTitle>
                    <CardDescription>
                        Start adding expenses to see your spending breakdown by category.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* Summary Card */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-medium text-muted-foreground">
                                Total Spending
                            </CardTitle>
                            <p className="text-3xl font-bold mt-1">
                                {formatAmount(total, currencySymbol)}
                            </p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                            <DollarSign className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4" />
                            {sortedData.length} categories
                        </span>
                        <span>
                            {data.reduce((sum, item) => sum + item.count, 0)} expenses
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        Spending by Category
                    </CardTitle>
                    <CardDescription>
                        See where your money goes across different categories
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {sortedData.map((item, index) => (
                        <div key={item.category} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            "w-3 h-3 rounded-full",
                                            getCategoryColor(item.category)
                                        )}
                                    />
                                    <span className="font-medium capitalize">{item.category}</span>
                                    <Badge variant="secondary" className="text-xs">
                                        {item.count} {item.count === 1 ? "expense" : "expenses"}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                    {item.trend && (
                                        <span className={cn(
                                            "flex items-center gap-1 text-xs",
                                            item.trend === "up" && "text-red-500",
                                            item.trend === "down" && "text-green-500",
                                            item.trend === "stable" && "text-muted-foreground"
                                        )}>
                                            {item.trend === "up" && <TrendingUp className="h-3 w-3" />}
                                            {item.trend === "down" && <TrendingDown className="h-3 w-3" />}
                                        </span>
                                    )}
                                    <span className="font-semibold tabular-nums">
                                        {formatAmount(item.amount, currencySymbol)}
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        getCategoryColor(item.category)
                                    )}
                                    style={{
                                        width: `${(item.amount / maxAmount) * 100}%`,
                                        animationDelay: `${index * 100}ms`
                                    }}
                                />
                            </div>

                            {/* Percentage indicator */}
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{item.percentage?.toFixed(1)}% of total</span>
                                {item.previousAmount !== undefined && (
                                    <span>
                                        Previous: {formatAmount(item.previousAmount, currencySymbol)}
                                    </span>
                                )}
                            </div>

                            {index < sortedData.length - 1 && (
                                <Separator className="mt-4" />
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Visual bar chart representation */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Category Comparison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end justify-between gap-2 h-48">
                        {sortedData.slice(0, 8).map((item, index) => {
                            const heightPercentage = (item.amount / maxAmount) * 100
                            return (
                                <div
                                    key={item.category}
                                    className="flex-1 flex flex-col items-center gap-2"
                                >
                                    <div className="relative w-full flex items-end justify-center h-36">
                                        <div
                                            className={cn(
                                                "w-full max-w-[40px] rounded-t transition-all duration-500",
                                                getCategoryColor(item.category)
                                            )}
                                            style={{
                                                height: `${Math.max(heightPercentage, 4)}%`,
                                                animationDelay: `${index * 100}ms`
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground text-center truncate w-full capitalize">
                                        {item.category.slice(0, 8)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default SpendingChart
