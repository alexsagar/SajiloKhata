"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Plus, User, Users, Wallet } from "lucide-react"
import { CreateExpenseDialog } from "./create-expense-dialog"
import { CreatePersonalExpenseDialog } from "./create-personal-expense-dialog"

interface ExpenseCreationOptionsProps {
  defaultGroupId?: string
}

export function ExpenseCreationOptions({ defaultGroupId }: ExpenseCreationOptionsProps) {
  const [isPersonalExpenseOpen, setIsPersonalExpenseOpen] = useState(false)
  const [isGroupExpenseOpen, setIsGroupExpenseOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Add New Expense</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KanbanCard className="cursor-pointer transition-all hover:shadow-md">
          <KanbanCardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <KanbanCardTitle className="text-base">Personal Expense</KanbanCardTitle>
            </div>
            <KanbanCardDescription>
              Track your personal spending with your preferred currency
            </KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Record expenses that are not shared with others. Perfect for tracking personal spending habits.
            </p>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => setIsPersonalExpenseOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Personal Expense
            </Button>
          </KanbanCardContent>
        </KanbanCard>

        <KanbanCard className="cursor-pointer transition-all hover:shadow-md">
          <KanbanCardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <KanbanCardTitle className="text-base">Group Expense</KanbanCardTitle>
            </div>
            <KanbanCardDescription>
              Split expenses with friends, family, or roommates
            </KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Create expenses to split with your group members. Your personal currency preference will be used.
            </p>
            <Button 
              className="w-full"
              onClick={() => setIsGroupExpenseOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Group Expense
            </Button>
          </KanbanCardContent>
        </KanbanCard>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> All expenses will use your personal currency preference from your profile settings.
        </p>
      </div>

      {/* Modals */}
      <CreatePersonalExpenseDialog 
        open={isPersonalExpenseOpen} 
        onOpenChange={setIsPersonalExpenseOpen} 
      />
      
      <CreateExpenseDialog 
        open={isGroupExpenseOpen} 
        onOpenChange={setIsGroupExpenseOpen}
        defaultGroupId={defaultGroupId}
      />
    </div>
  )
}
