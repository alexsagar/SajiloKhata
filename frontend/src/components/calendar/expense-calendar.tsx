"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, Plus, Receipt, DollarSign, Calendar, Filter, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { calendarAPI, expenseAPI, groupAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useCurrency } from "@/contexts/currency-context"
import { formatCurrency } from "@/lib/utils"
import { CreateExpenseSchema } from "@/lib/validation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

type CreateExpenseFormData = z.infer<typeof CreateExpenseSchema>

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface CalendarDay {
  day: number
  isCurrentMonth: boolean
  date: string
  expenses?: any[]
  totalBaseCents?: number
  count?: number
}

interface CalendarFilters {
  mode: 'personal' | 'group' | 'all'
  groupIds: string[]
}

export function ExpenseCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [filters, setFilters] = useState<CalendarFilters>({
    mode: 'all',
    groupIds: []
  })
  
  const { toast } = useToast()
  const { user } = useAuth()
  const { currency: userCurrency } = useCurrency()
  const queryClient = useQueryClient()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  // Fetch calendar month data
  const { data: monthData, isLoading: monthLoading } = useQuery({
    queryKey: ['calendar-month', year, month, filters, userCurrency],
    queryFn: () => calendarAPI.getMonth({ year, month, ...filters, baseCurrency: userCurrency }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch user groups for group selector
  const { data: groupsData } = useQuery({
    queryKey: ['user-groups'],
    queryFn: () => groupAPI.getGroups(),
  })

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: CreateExpenseFormData) => {
      const formData = new FormData()
      formData.append('description', data.description)
      formData.append('amount', data.amount.toString())
      formData.append('category', data.category || 'other')
      formData.append('date', selectedDate || new Date().toISOString().split('T')[0])
      if (data.notes) formData.append('notes', data.notes)
      if (data.groupId) formData.append('groupId', data.groupId)
      if (data.splitType) formData.append('splitType', data.splitType)
      if (data.currencyCode) formData.append('currencyCode', data.currencyCode)
      
      // Add required createdBy field
      if (user?.id) {
        formData.append('createdBy', user.id)
      } else {
        throw new Error('User not authenticated')
      }
      
      return expenseAPI.createExpense(formData)
    },
    onSuccess: () => {
      toast({
        title: "Expense Added",
        description: "Expense has been added successfully",
      })
      setIsAddExpenseOpen(false)
      form.reset()
      
      // Invalidate all expense-related queries to ensure the list refreshes
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["expenses", undefined] })
      queryClient.invalidateQueries({ queryKey: ["expenses", null] })
      
      // Invalidate calendar and analytics queries
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-spend-over-time'] })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive"
      })
    }
  })

  // Form setup
  const form = useForm<CreateExpenseFormData>({
    resolver: zodResolver(CreateExpenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      category: 'other',
      notes: '',
      groupId: undefined,
      splitType: 'equal',
      currencyCode: userCurrency,
      date: selectedDate || new Date().toISOString().split('T')[0],
    },
  })

  // Update form when selected date changes
  useEffect(() => {
    if (selectedDate) {
      form.setValue('date', selectedDate)
    }
  }, [selectedDate, form])

  // Update currency when group changes
  const selectedGroupId = form.watch('groupId')
  const selectedGroup = (groupsData as any)?.data?.data?.find((g: any) => g._id === selectedGroupId)
  
  useEffect(() => {
    if (filters.mode === 'personal') {
      form.setValue('currencyCode', userCurrency)
    } else if (selectedGroup && filters.mode === 'group') {
      form.setValue('currencyCode', selectedGroup.currencyCode || userCurrency)
    }
  }, [filters.mode, selectedGroup, userCurrency, form])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    setIsAddExpenseOpen(true)
  }

  const handleAddExpense = (data: CreateExpenseFormData) => {
    // Validate that group is selected when mode is group
    if (filters.mode === 'group' && !data.groupId) {
      toast({
        title: "Validation Error",
        description: "Please select a group for group expenses",
        variant: "destructive"
      })
      return
    }
    
    createExpenseMutation.mutate(data)
  }

  const handleFilterChange = (key: keyof CalendarFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Generate calendar days
  const generateCalendarDays = (): CalendarDay[] => {
    const firstDay = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate()

    const calendarDays: CalendarDay[] = []
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const date = `${year}-${String(month - 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      calendarDays.push({
        day,
        isCurrentMonth: false,
        date
      })
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = monthData?.data?.days?.find((d: any) => d.date === date)
      
      calendarDays.push({
        day,
        isCurrentMonth: true,
        date,
        totalBaseCents: dayData?.totalBaseCents || 0,
        count: dayData?.count || 0
      })
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - calendarDays.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      calendarDays.push({
        day,
        isCurrentMonth: false,
        date
      })
    }

    return calendarDays
  }

  const calendarDays = generateCalendarDays()
  const monthTotals = monthData?.data?.monthTotals || { totalBaseCents: 0, count: 0 }
  const isToday = new Date().toISOString().split('T')[0]

     if (monthLoading) {
     return (
       <div className="loading-responsive flex items-center justify-center">
         <div className="text-center">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
           <h3 className="text-responsive-lg font-semibold mb-2">Loading Calendar</h3>
           <p className="text-responsive-sm text-muted-foreground">Please wait while we load your calendar data...</p>
         </div>
       </div>
     )
   }



     return (
     <div className="space-y-responsive-lg">
      {/* Top Bar with Filters */}
      <Card className="mb-6">
        <CardHeader className="p-responsive-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Left side - Navigation and Month */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="touch-friendly"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="touch-friendly"
                >
                  <span className="hidden sm:inline">Today</span>
                  <span className="sm:hidden">Now</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="touch-friendly"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Month/Year Display */}
              <div className="text-responsive-2xl font-semibold text-center sm:text-left">
                {months[month - 1]} {year}
              </div>
            </div>
            
            {/* Right side - Filters and Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2">
                <Label className="text-responsive-sm hidden sm:inline">Mode:</Label>
                <Select 
                  value={filters.mode} 
                  onValueChange={(value: 'personal' | 'group' | 'all') => 
                    handleFilterChange('mode', value)
                  }
                >
                  <SelectTrigger className="w-20 sm:w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Group Selector */}
              {filters.mode !== 'personal' && (
                <div className="flex items-center gap-2">
                  <Label className="text-responsive-sm hidden sm:inline">Groups:</Label>
                  <Select 
                    value={filters.groupIds[0] || 'all'} 
                    onValueChange={(value) => 
                      handleFilterChange('groupIds', value === 'all' ? [] : [value])
                    }
                  >
                    <SelectTrigger className="w-28 sm:w-32">
                      <SelectValue placeholder="All Groups">
                        {filters.groupIds.length === 0 ? 'All Groups' : 'Selected Group'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      {(groupsData as any)?.data?.data?.map((group: any) => (
                        <SelectItem key={group._id} value={group._id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* View Analytics CTA */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams({
                    range: 'THIS_MONTH',
                    mode: filters.mode,
                    baseCurrency: userCurrency
                  })
                  if (filters.groupIds.length > 0 && filters.groupIds[0] !== 'all') {
                    params.append('groupIds', filters.groupIds.join(','))
                  }
                  window.open(`/analytics?${params.toString()}`, '_blank')
                }}
                className="touch-friendly"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">View Analytics</span>
                <span className="sm:hidden">Analytics</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

             <div className="grid gap-responsive-lg lg:grid-cols-3">
         {/* Calendar */}
         <div className="lg:col-span-2">
           <Card>
             <CardContent className="p-responsive-4">
               <div className="grid grid-cols-7 gap-1 mb-4">
                 {weekdays.map(day => (
                   <div key={day} className="p-2 text-center text-responsive-sm font-medium text-muted-foreground">
                     {day}
                   </div>
                 ))}
               </div>
               <div className="grid grid-cols-7 gap-1 calendar-responsive calendar-mobile">
                {calendarDays.map((calendarDay, index) => {
                  const isTodayDate = calendarDay.date === isToday
                  const isSelected = selectedDate === calendarDay.date
                  const hasExpenses = calendarDay.count && calendarDay.count > 0

                  return (
                                         <button
                       key={index}
                       className={cn(
                         "calendar-day min-h-[50px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 border rounded-md text-left hover:ring-1 hover:ring-white/10 transition-all cursor-pointer touch-friendly",
                         !calendarDay.isCurrentMonth && "text-muted-foreground bg-muted/20",
                         isTodayDate && "bg-primary/10 border-primary ring-2 ring-primary/20",
                         isSelected && "bg-primary/20 border-primary",
                         hasExpenses && "bg-muted/30"
                       )}
                       onClick={() => handleDateClick(calendarDay.date)}
                       aria-label={`Add expense on ${calendarDay.date}`}
                       role="button"
                     >
                       <div className="text-responsive-xs sm:text-responsive-sm font-medium mb-1 sm:mb-2">
                          {calendarDay.day}
                         {isTodayDate && (
                           <Badge variant="secondary" className="ml-1 text-xs hidden sm:inline">
                             Today
                           </Badge>
                         )}
                       </div>
                       
                       {hasExpenses ? (
                         <div className="space-y-1">
                           <div className="text-responsive-xs text-muted-foreground">
                             {calendarDay.count} expense{calendarDay.count !== 1 ? 's' : ''}
                           </div>
                           <div className="text-responsive-xs font-medium text-green-600">
                             {formatCurrency(calendarDay.totalBaseCents! / 100, userCurrency)}
                           </div>
                         </div>
                       ) : null}
                     </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

               {/* Sidebar */}
       <div className="space-y-responsive">
         {/* Quick Actions */}
         <Card>
           <CardHeader className="p-responsive-3">
             <CardTitle className="text-responsive-lg">Quick Actions</CardTitle>
           </CardHeader>
           <CardContent className="space-y-2 p-responsive-3">
             <Button 
               className="w-full touch-friendly" 
               size="sm"
               onClick={() => setIsAddExpenseOpen(true)}
             >
               <Plus className="h-4 w-4 mr-2" />
               Add Expense
             </Button>
           </CardContent>
         </Card>
         
         {/* Monthly Summary */}
         <Card>
           <CardHeader className="p-responsive-3">
             <CardTitle className="text-responsive-lg">Monthly Summary</CardTitle>
           </CardHeader>
           <CardContent className="space-y-3 p-responsive-3">
             <div className="flex justify-between items-center">
               <span className="text-responsive-sm text-muted-foreground">Total Expenses:</span>
               <span className="text-responsive-lg font-semibold text-green-600">
                 {formatCurrency(monthTotals.totalBaseCents / 100, userCurrency)}
               </span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-responsive-sm text-muted-foreground">Count:</span>
               <span className="text-responsive-sm font-medium">
                 {monthTotals.count} expense{monthTotals.count !== 1 ? 's' : ''}
               </span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-responsive-sm text-muted-foreground">Currency:</span>
               <span className="text-responsive-sm font-medium">{userCurrency}</span>
             </div>
           </CardContent>
         </Card>

                    {/* Empty State */}
           {monthTotals.count === 0 && (
             <Card>
               <CardContent className="p-responsive-3 text-center">
                 <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                 <h3 className="text-responsive-lg font-semibold mb-2">No Expenses Yet</h3>
                 <p className="text-responsive-sm text-muted-foreground">
                   Click any date to add your first expense and start tracking your spending
                 </p>
               </CardContent>
             </Card>
           )}
       </div>
      </div>

             {/* Add Expense Dialog */}
       <Dialog open={isAddExpenseOpen} onOpenChange={(open) => {
         setIsAddExpenseOpen(open)
         if (!open) {
           form.reset()
         }
       }}>
         <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto bg-white dark:bg-[#12151c] ring-1 ring-black/10 dark:ring-white/10 shadow-xl">
                     <DialogHeader className="p-responsive-3">
             <DialogTitle className="text-responsive-lg">
               Add expense — {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { 
                 day: 'numeric', 
                 month: 'short', 
                 year: 'numeric' 
               }) : 'New Expense'}
             </DialogTitle>
             <DialogDescription className="text-responsive-sm">
               {selectedDate 
                 ? `Add an expense for ${new Date(selectedDate).toLocaleDateString()}`
                 : "Add a new expense"
               }
             </DialogDescription>
           </DialogHeader>
           
           <form onSubmit={form.handleSubmit(handleAddExpense)} className="form-responsive space-y-4 p-responsive-3">
                         <div className="form-group">
               <Label htmlFor="description" className="form-responsive">Description *</Label>
               <Input
                 id="description"
                 placeholder="e.g., Lunch at restaurant"
                 {...form.register('description')}
                 className="form-responsive touch-friendly"
               />
               {form.formState.errors.description && (
                 <p className="text-responsive-xs text-red-600 mt-1">{form.formState.errors.description.message}</p>
               )}
             </div>
             
             <div className="form-group">
               <Label htmlFor="amount" className="form-responsive">Amount *</Label>
               <Input
                 id="amount"
                 type="number"
                 step="0.01"
                 placeholder="0.00"
                 {...form.register('amount', { valueAsNumber: true })}
                 className="form-responsive touch-friendly"
               />
               {form.formState.errors.amount && (
                 <p className="text-responsive-xs text-red-600 mt-1">{form.formState.errors.amount.message}</p>
               )}
             </div>

                         <div className="form-group">
               <Label htmlFor="mode" className="form-responsive">Mode *</Label>
               <Select 
                 value={filters.mode} 
                 onValueChange={(value: 'personal' | 'group' | 'all') => 
                   handleFilterChange('mode', value)
                 }
               >
                 <SelectTrigger className="form-responsive touch-friendly">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="personal">Personal</SelectItem>
                   <SelectItem value="group">Group</SelectItem>
                   <SelectItem value="all">All</SelectItem>
                 </SelectContent>
               </Select>
             </div>

                         {filters.mode !== 'personal' && (
               <div className="form-group">
                 <Label htmlFor="groupId" className="form-responsive">Group *</Label>
                 <Select 
                   value={form.watch('groupId') || undefined} 
                   onValueChange={(value) => form.setValue('groupId', value)}
                 >
                   <SelectTrigger className="form-responsive touch-friendly">
                     <SelectValue placeholder="Select a group" />
                   </SelectTrigger>
                   <SelectContent>
                     {groupsData?.data?.data?.map((group: any) => (
                       <SelectItem key={group._id} value={group._id}>
                         {group.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 {form.formState.errors.groupId && (
                   <p className="text-responsive-xs text-red-600 mt-1">{form.formState.errors.groupId.message}</p>
                 )}
               </div>
             )}

             <div className="form-group">
               <Label htmlFor="category" className="form-responsive">Category</Label>
               <Select 
                 value={form.watch('category')} 
                 onValueChange={(value) => form.setValue('category', value as any)}
               >
                 <SelectTrigger className="form-responsive touch-friendly">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="food">Food & Dining</SelectItem>
                   <SelectItem value="transportation">Transportation</SelectItem>
                   <SelectItem value="accommodation">Accommodation</SelectItem>
                   <SelectItem value="entertainment">Entertainment</SelectItem>
                   <SelectItem value="utilities">Bills & Utilities</SelectItem>
                   <SelectItem value="shopping">Shopping</SelectItem>
                   <SelectItem value="healthcare">Healthcare</SelectItem>
                   <SelectItem value="other">Other</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <div className="form-group">
               <Label htmlFor="currencyCode" className="form-responsive">Currency</Label>
               <Input
                 id="currencyCode"
                 value={form.watch('currencyCode')}
                 onChange={(e) => form.setValue('currencyCode', e.target.value)}
                 placeholder="USD"
                 className="form-responsive touch-friendly"
               />
             </div>

             <div className="form-group">
               <Label htmlFor="notes" className="form-responsive">Notes</Label>
               <Textarea
                 id="notes"
                 placeholder="Optional notes..."
                 {...form.register('notes')}
                 className="form-responsive touch-friendly"
               />
             </div>

                         <DialogFooter className="p-responsive-3">
               <Button 
                 type="button" 
                 variant="outline" 
                 onClick={() => {
                   setIsAddExpenseOpen(false)
                   form.reset()
                 }}
                 className="touch-friendly"
               >
                 Cancel
               </Button>
               <Button 
                 type="submit" 
                 disabled={createExpenseMutation.isPending}
                 className="touch-friendly"
               >
                 {createExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
               </Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}