"use client"

import { useState } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MoreHorizontal, 
  Receipt, 
  Edit, 
  Trash2, 
  User,
  Calendar,
  Tag
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CurrencyDisplay, CurrencyBadge } from "@/components/currency/currency-display"
import { getInitials } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ExpenseKanbanCardProps {
  expense: {
    id: string
    description: string
    amount: number
    currency: string
    category: string
    date: string
    paidBy: {
      id: string
      firstName: string
      lastName: string
      avatar?: string
    }
    group?: {
      id: string
      name: string
      currency: string
    }
    isPersonal?: boolean
    splits?: Array<{
      user: {
        id: string
        firstName: string
        lastName: string
        avatar?: string
      }
      amount: number
      settled: boolean
    }>
  }
  onEdit?: (expenseId: string) => void
  onDelete?: (expenseId: string) => void
  onViewReceipt?: (expenseId: string) => void
  className?: string
}

const categoryIcons: Record<string, string> = {
  food: "🍽️",
  transportation: "🚗",
  accommodation: "🏨",
  entertainment: "🎬",
  utilities: "💡",
  shopping: "🛍️",
  healthcare: "🏥",
  other: "📦"
}

const categoryColors: Record<string, string> = {
  food: "bg-orange-100 text-orange-800 border-orange-200",
  transportation: "bg-blue-100 text-blue-800 border-blue-200",
  accommodation: "bg-purple-100 text-purple-800 border-purple-200",
  entertainment: "bg-pink-100 text-pink-800 border-pink-200",
  utilities: "bg-yellow-100 text-yellow-800 border-yellow-200",
  shopping: "bg-green-100 text-green-800 border-green-200",
  healthcare: "bg-red-100 text-red-800 border-red-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
}

export function ExpenseKanbanCard({ 
  expense, 
  onEdit, 
  onDelete, 
  onViewReceipt, 
  className 
}: ExpenseKanbanCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || categoryIcons.other
  }

  const getCategoryColor = (category: string) => {
    return categoryColors[category] || categoryColors.other
  }

  const isPersonalExpense = expense.isPersonal || !expense.group

  return (
    <KanbanCard 
      className={cn(
        "transition-all duration-200 hover:shadow-md cursor-pointer",
        isHovered && "ring-2 ring-primary/20",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <KanbanCardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <KanbanCardTitle className="text-base font-semibold truncate">
              {expense.description}
            </KanbanCardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="outline" 
                className={cn("text-xs", getCategoryColor(expense.category))}
              >
                <span className="mr-1">{getCategoryIcon(expense.category)}</span>
                {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
              </Badge>
              {!isPersonalExpense && expense.group && (
                <Badge variant="secondary" className="text-xs">
                  {expense.group.name}
                </Badge>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(expense.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onViewReceipt && (
                <DropdownMenuItem onClick={() => onViewReceipt(expense.id)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  View Receipt
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(expense.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </KanbanCardHeader>

      <KanbanCardContent className="pt-0">
        <div className="space-y-3">
          {/* Amount and Currency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CurrencyDisplay 
                amount={expense.amount} 
                currencyCode={expense.currency}
                variant="large"
                showTooltip
              />
              <CurrencyBadge 
                currencyCode={expense.currency}
                variant="outline"
                size="sm"
              />
            </div>
            
            {/* Personal vs Group indicator */}
            <div className="flex items-center gap-1">
              {isPersonalExpense ? (
                <User className="h-4 w-4 text-blue-600" />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Group: {expense.group?.currency}
                </span>
              )}
            </div>
          </div>

          {/* Paid by and Date */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={expense.paidBy.avatar} />
                <AvatarFallback className="text-xs">
                  {getInitials(expense.paidBy.firstName, expense.paidBy.lastName)}
                </AvatarFallback>
              </Avatar>
              <span>
                Paid by {expense.paidBy.firstName} {expense.paidBy.lastName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(expense.date)}
            </div>
          </div>

          {/* Splits information */}
          {expense.splits && expense.splits.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Split with:</span>
                <span className="font-medium">{expense.splits.length} people</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {expense.splits.slice(0, 3).map((split, index) => (
                  <div key={split.user.id} className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={split.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(split.user.firstName, split.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">
                      {split.user.firstName}
                    </span>
                    {split.settled && (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </div>
                ))}
                {expense.splits.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{expense.splits.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </KanbanCardContent>
    </KanbanCard>
  )
}
