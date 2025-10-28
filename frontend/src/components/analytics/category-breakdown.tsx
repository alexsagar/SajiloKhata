"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface CategoryBreakdownProps {
  data: Array<{
    _id: string
    total: number
    count: number
  }>
  detailed?: boolean
}

const COLORS = [
  "#0088FE",
  "#00C49F", 
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C"
]

export function CategoryBreakdown({ data, detailed = false }: CategoryBreakdownProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No category data available
      </div>
    )
  }

  const chartData = data.map((item, index) => ({
    name: item._id,
    value: item.total,
    count: item.count,
    color: COLORS[index % COLORS.length]
  }))

  if (detailed) {
    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="grid gap-2">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between p-2 rounded-lg border">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium capitalize">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatCurrency(item.value)}</div>
                <div className="text-sm text-muted-foreground">{item.count} expenses</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}