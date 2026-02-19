"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts"
import { formatCurrency } from "@/lib/utils"

// --- Types ---

interface ChartTooltipProps {
    active?: boolean
    payload?: any[]
    label?: string
}

interface ChartDataItem {
    date: string
    personal: { amountCents: number; baseCents: number; count: number }
    group: { amountCents: number; baseCents: number; count: number }
}

interface MonthlyItem {
    date: string
    personal?: { baseCents?: number }
    group?: { baseCents?: number }
}

interface MonthlyAgg {
    month: string
    personal: number
    group: number
    total: number
}

// --- Constants ---

const CATEGORY_COLORS = [
    '#8b5cf6', // violet
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
    '#a855f7', // purple
]

// --- Charts ---

export function SpendingOverTimeChart({ data, baseCurrency, detailed = false }: {
    data: ChartDataItem[] | undefined | null
    baseCurrency: string
    detailed?: boolean
}) {
    const safeData = Array.isArray(data) ? data : []

    if (safeData.length === 0) {
        return (
            <div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground bg-gray-50/5 rounded-md border border-gray-100/10">
                <div className="text-center p-4">
                    <p>No spending data available for the selected filters</p>
                    <p className="text-xs mt-1">Try adjusting your filters or time range</p>
                </div>
            </div>
        )
    }

    const personalTotal = safeData.reduce((sum, item) => sum + (item?.personal?.baseCents || 0), 0)
    const groupTotal = safeData.reduce((sum, item) => sum + (item?.group?.baseCents || 0), 0)

    const chartData = safeData.map(item => ({
        date: item.date,
        personal: (item.personal?.baseCents || 0) / 100,
        group: (item.group?.baseCents || 0) / 100,
        total: ((item.personal?.baseCents || 0) + (item.group?.baseCents || 0)) / 100
    }))

    const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[var(--card)] p-3 border border-gray-100/10 rounded-lg shadow-lg text-sm">
                    <p className="font-medium">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(entry.value, baseCurrency)}
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-[var(--card)] border border-gray-100/10 rounded-lg">
                    <div className="text-lg md:text-xl font-bold text-green-600">
                        {formatCurrency(personalTotal / 100, baseCurrency)}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1">Personal</div>
                </div>
                <div className="p-3 bg-[var(--card)] border border-gray-100/10 rounded-lg">
                    <div className="text-lg md:text-xl font-bold text-blue-600">
                        {formatCurrency(groupTotal / 100, baseCurrency)}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1">Group</div>
                </div>
            </div>

            <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={4} barCategoryGap={12}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                        <YAxis
                            tick={{ fontSize: 12, fill: '#888' }}
                            tickFormatter={(value: any) => formatCurrency(value, baseCurrency)}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        {/* Stacked bars for personal vs group */}
                        <Bar dataKey="personal" stackId="a" fill="#10b981" name="Personal" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="group" stackId="a" fill="#3b82f6" name="Group" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export function MonthlyTrendsChart({ data, baseCurrency }: { data: MonthlyItem[]; baseCurrency: string }) {
    const safeData = Array.isArray(data) ? data : []

    if (safeData.length === 0) {
        return (
            <div className="min-h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No trend data available
            </div>
        )
    }

    // Group data by month
    const monthlyData: Record<string, MonthlyAgg> = safeData.reduce((acc: Record<string, MonthlyAgg>, item) => {
        const date = new Date(item.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!acc[monthKey]) {
            acc[monthKey] = {
                month: monthKey,
                personal: 0,
                group: 0,
                total: 0
            }
        }

        acc[monthKey].personal += (item.personal?.baseCents || 0) / 100
        acc[monthKey].group += (item.group?.baseCents || 0) / 100
        acc[monthKey].total += ((item.personal?.baseCents || 0) + (item.group?.baseCents || 0)) / 100

        return acc
    }, {})

    const chartData: MonthlyAgg[] = Object.values(monthlyData).sort((a: MonthlyAgg, b: MonthlyAgg) => a.month.localeCompare(b.month))

    const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[var(--card)] p-3 border border-gray-100/10 rounded-lg shadow-lg text-sm">
                    <p className="font-medium">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(entry.value, baseCurrency)}
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: '#888' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#888' }}
                        tickFormatter={(value: any) => formatCurrency(value, baseCurrency)}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="personal" fill="#10b981" name="Personal" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="group" fill="#3b82f6" name="Group" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

export function CategoryTrendsChart({ data, baseCurrency }: { data: Array<{ _id: string; totalBaseCents?: number; count?: number }>; baseCurrency: string }) {
    const safeData = Array.isArray(data) ? data : []
    if (safeData.length === 0) {
        return (
            <div className="min-h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No category trend data available
            </div>
        )
    }
    const chartData = safeData
        .sort((a, b) => (b.totalBaseCents || 0) - (a.totalBaseCents || 0))
        .slice(0, 5)
        .map(cat => ({ name: cat._id, amount: (cat.totalBaseCents || 0) / 100 }))

    const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
        if (active && payload && payload.length) {
            const row = payload[0].payload
            return (
                <div className="bg-[var(--card)] p-3 border border-gray-100/10 rounded-lg shadow-lg text-sm">
                    <p className="font-medium capitalize">{label}</p>
                    <p className="text-sm">{formatCurrency(row.amount, baseCurrency)}</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#888' }}
                        tickFormatter={(value: any) => formatCurrency(value, baseCurrency)}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

export function CategoryBreakdownChart({ data, baseCurrency, detailed }: { data: Array<{ _id: string; totalBaseCents?: number; count?: number }>; baseCurrency: string; detailed?: boolean }) {
    const safe = Array.isArray(data) ? data : []
    if (safe.length === 0) {
        return (
            <div className="min-h-[300px] flex items-center justify-center text-sm text-muted-foreground bg-gray-50/5 rounded-md border border-gray-100/10">
                <div className="text-center p-4">
                    <p>No category data available</p>
                    <p className="text-xs mt-1">Create some expenses to see your spending breakdown</p>
                </div>
            </div>
        )
    }

    const totalCents = safe.reduce((sum, c) => sum + (c.totalBaseCents || 0), 0)
    const sorted = [...safe].sort((a, b) => (b.totalBaseCents || 0) - (a.totalBaseCents || 0))

    // Build pie data: show top categories, group the rest as "Other"
    const MAX_SLICES = 8
    const topCategories = sorted.slice(0, MAX_SLICES)
    const otherCategories = sorted.slice(MAX_SLICES)
    const otherTotal = otherCategories.reduce((sum, c) => sum + (c.totalBaseCents || 0), 0)

    const pieData = topCategories.map((c) => ({
        name: c._id.charAt(0).toUpperCase() + c._id.slice(1),
        value: (c.totalBaseCents || 0) / 100,
        cents: c.totalBaseCents || 0,
        count: c.count || 0,
    }))
    if (otherTotal > 0) {
        pieData.push({
            name: 'Other',
            value: otherTotal / 100,
            cents: otherTotal,
            count: otherCategories.reduce((s, c) => s + (c.count || 0), 0),
        })
    }

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload
            const pct = totalCents > 0 ? ((d.cents / totalCents) * 100).toFixed(1) : '0'
            return (
                <div className="bg-[var(--card)] p-3 border border-gray-100/10 rounded-lg shadow-lg text-sm">
                    <p className="font-medium">{d.name}</p>
                    <p className="text-muted-foreground">{formatCurrency(d.value, baseCurrency)}</p>
                    <p className="text-muted-foreground">{pct}% · {d.count} expense{d.count !== 1 ? 's' : ''}</p>
                </div>
            )
        }
        return null
    }

    // Custom label renderer
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null
        const RADIAN = Math.PI / 180
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5
        const x = cx + radius * Math.cos(-midAngle * RADIAN)
        const y = cy + radius * Math.sin(-midAngle * RADIAN)

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={600}
                style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        )
    }

    return (
        <div className="space-y-4">
            <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(totalCents / 100, baseCurrency)}</div>
                <div className="text-xs text-muted-foreground mt-1">Total across {safe.length} categor{safe.length !== 1 ? 'ies' : 'y'}</div>
            </div>

            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={2}
                            dataKey="value"
                            label={renderLabel}
                            labelLine={false}
                            stroke="none"
                        >
                            {pieData.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {pieData.map((item, index) => {
                    const pct = totalCents > 0 ? ((item.cents / totalCents) * 100).toFixed(1) : '0'
                    return (
                        <div key={item.name} className="flex items-center gap-2 text-sm p-1.5 rounded-md hover:bg-white/5 transition-colors">
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-xs">{item.name}</div>
                                <div className="text-[10px] text-muted-foreground">{pct}% · {formatCurrency(item.value, baseCurrency)}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
