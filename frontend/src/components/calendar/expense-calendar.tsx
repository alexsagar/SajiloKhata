"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, Calendar, BellRing, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { calendarAPI, groupAPI, reminderAPI } from "@/lib/api"
import { useCurrency } from "@/contexts/currency-context"
import { formatCurrency } from "@/lib/utils"

interface ReminderItem {
  _id?: string
  dueDate?: string
  dueDateKey?: string
  title?: string
  description?: string
  amount?: number
  category?: string
}

interface CalendarApiDay {
  date: string
  totalBaseCents?: number
  count?: number
}

interface CalendarMonthResponse {
  data?: {
    days?: CalendarApiDay[]
  }
}

interface GroupOption {
  _id: string
  name: string
}

interface GroupsResponse {
  data?: {
    data?: GroupOption[]
  }
}

interface RemindersResponse {
  data?: {
    data?: ReminderItem[]
  }
}

interface ErrorWithMessage {
  message?: string
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function toUtcDateKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseLocalDateKey(dateKey: string) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

function formatLocalDateLabel(dateKey: string) {
  const parsed = parseLocalDateKey(dateKey)
  return parsed ? parsed.toLocaleDateString() : dateKey
}

function getReminderDateKey(value: ReminderItem | string | null | undefined) {
  if (value && typeof value === "object" && value.dueDateKey) {
    return String(value.dueDateKey)
  }
  const raw = String(value || "")
  const isoDateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDateMatch) {
    return isoDateMatch[1]
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return toUtcDateKey(parsed)
}

interface CalendarDay {
  day: number
  isCurrentMonth: boolean
  date: string
  expenses?: CalendarApiDay[]
  totalBaseCents?: number
  count?: number
  reminders?: ReminderItem[]
}

interface CalendarFilters {
  mode: 'personal' | 'group' | 'all'
  groupIds: string[]
}

type CalendarFilterValue = CalendarFilters[keyof CalendarFilters]

export function ExpenseCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false)
  const [reminderTitle, setReminderTitle] = useState("")
  const [reminderDescription, setReminderDescription] = useState("")
  const [reminderAmount, setReminderAmount] = useState<number | undefined>(undefined)
  const [reminderCategory, setReminderCategory] = useState<string>("utilities")
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null)
  const [filters, setFilters] = useState<CalendarFilters>({
    mode: 'all',
    groupIds: []
  })

  const { toast } = useToast()
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
    staleTime: 10 * 60 * 1000, // groups rarely change
  })

  // Fetch reminders for the month
  const { data: remindersData } = useQuery({
    queryKey: ['calendar-reminders'],
    queryFn: () => reminderAPI.getAll(),
    staleTime: 5 * 60 * 1000,
  })

  const reminderList = useMemo(() => ((remindersData as RemindersResponse | undefined)?.data?.data) || [], [remindersData])

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

    // Check if this date has any reminders; if so, open reminder dialog prefilled
    const remindersForDate = reminderList.filter((r) => {
      if (!r?.dueDate) return false
      const key = getReminderDateKey(r)
      return key === date
    })

    if (remindersForDate.length > 0) {
      const first = remindersForDate[0]
      setSelectedReminderId(first._id || null)
      setReminderTitle(first.title || "")
      setReminderDescription(first.description || "")
      setReminderAmount(typeof first.amount === "number" ? first.amount : undefined)
      setReminderCategory(first.category || "utilities")
      setIsAddReminderOpen(true)
    } else {
      setSelectedReminderId(null)
      setReminderTitle("")
      setReminderDescription("")
      setReminderAmount(undefined)
      setReminderCategory("utilities")
      setIsAddReminderOpen(true)
    }
  }

  const handleFilterChange = (key: keyof CalendarFilters, value: CalendarFilterValue) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Memoize calendar days — expensive computation (42-cell grid with map lookups)
  const calendarDays = useMemo((): CalendarDay[] => {
    const currentMonthIndex = month - 1 // 0-based month index
    const firstDay = new Date(year, currentMonthIndex, 1).getDay()
    const daysInMonth = new Date(year, currentMonthIndex + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, currentMonthIndex, 0).getDate()

    // Map reminders by date (YYYY-MM-DD)
    const remindersByDate = new Map<string, ReminderItem[]>()
    reminderList.forEach((r) => {
      if (!r?.dueDate) return
      const dateKey = getReminderDateKey(r)
      if (!remindersByDate.has(dateKey)) remindersByDate.set(dateKey, [])
      remindersByDate.get(dateKey)!.push(r)
    })

    const days: CalendarDay[] = []

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const jsDate = new Date(year, currentMonthIndex - 1, day)
      const date = toLocalDateKey(jsDate)
      days.push({
        day,
        isCurrentMonth: false,
        date,
        reminders: remindersByDate.get(date) || [],
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const jsDate = new Date(year, currentMonthIndex, day)
      const date = toLocalDateKey(jsDate)
      const dayData = (monthData as CalendarMonthResponse | undefined)?.data?.days?.find((dayItem) => dayItem.date === date)
      days.push({
        day,
        isCurrentMonth: true,
        date,
        totalBaseCents: dayData?.totalBaseCents || 0,
        count: dayData?.count || 0,
        reminders: remindersByDate.get(date) || [],
      })
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const jsDate = new Date(year, currentMonthIndex + 1, day)
      const date = toLocalDateKey(jsDate)
      days.push({
        day,
        isCurrentMonth: false,
        date,
        reminders: remindersByDate.get(date) || [],
      })
    }

    return days
  }, [year, month, monthData, reminderList])
  const isToday = toLocalDateKey(new Date())
  const reminderStats = useMemo(() => {
    const total = reminderList.length
    const todayDate = parseLocalDateKey(isToday) || new Date()
    const upcoming7d = reminderList.filter((r) => {
      if (!r?.dueDate) return false
      const dueKey = getReminderDateKey(r)
      const due = parseLocalDateKey(dueKey)
      if (!due) return false
      if (Number.isNaN(due.getTime())) return false
      const deltaDays = Math.floor((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
      return deltaDays >= 0 && deltaDays <= 7
    }).length
    return { total, upcoming7d }
  }, [reminderList, isToday])

  return (
    <div className="space-y-responsive-lg">
      {/* Top Bar with Filters */}
      <Card className="mb-6 border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent">
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
              <div className="space-y-1">
                <div className="text-responsive-2xl font-semibold text-center sm:text-left tracking-tight">
                  {months[month - 1]} {year}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">
                    <BellRing className="h-3 w-3 mr-1" />
                    {reminderStats.total} reminders
                  </Badge>
                  <Badge variant="outline" className="text-[11px] border-amber-500/40 text-amber-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {reminderStats.upcoming7d} due in 7 days
                  </Badge>
                  {monthLoading && (
                    <span className="text-xs text-muted-foreground">Refreshing...</span>
                  )}
                </div>
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
                      {((groupsData as GroupsResponse | undefined)?.data?.data || []).map((group) => (
                        <SelectItem key={group._id} value={group._id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-responsive-lg lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm">
            <CardContent className="p-responsive-4">
              <div className="grid grid-cols-7 gap-1 mb-4 rounded-xl bg-white/[0.03] p-1">
                {weekdays.map(day => (
                  <div key={day} className="p-2 text-center text-responsive-sm font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 calendar-responsive calendar-mobile">
                {calendarDays.map((calendarDay, index) => {
                  const isTodayDate = calendarDay.date === isToday
                  const isSelected = selectedDate === calendarDay.date
                  const hasExpenses = calendarDay.count && calendarDay.count > 0
                  const reminderCount = calendarDay.reminders?.length ?? 0

                  const firstReminder = reminderCount > 0 ? calendarDay.reminders?.[0] : null

                  return (
                    <button
                      key={index}
                      className={cn(
                        "calendar-day min-h-[56px] sm:min-h-[92px] lg:min-h-[110px] p-1.5 sm:p-2 border rounded-xl text-left transition-all cursor-pointer touch-friendly",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        !calendarDay.isCurrentMonth && "text-muted-foreground bg-muted/20 border-white/5",
                        calendarDay.isCurrentMonth && "bg-card/40 border-white/10 hover:bg-card/70",
                        isTodayDate && "bg-primary/10 border-primary ring-2 ring-primary/25",
                        isSelected && "bg-primary/15 border-primary/70",
                        hasExpenses && "shadow-[inset_0_0_0_1px_rgba(34,197,94,0.25)]"
                      )}
                      onClick={() => handleDateClick(calendarDay.date)}
                      aria-label={`Add reminder on ${calendarDay.date}`}
                      role="button"
                    >
                      <div className="flex items-start justify-between mb-1 sm:mb-2">
                        <div className="text-responsive-xs sm:text-responsive-sm font-semibold">
                          {calendarDay.day}
                        </div>
                        {isTodayDate && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 hidden sm:inline-flex">
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

                      {firstReminder && (firstReminder.title || firstReminder.description) ? (
                        <div className="mt-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-1">
                          <div className="text-[10px] text-amber-700 dark:text-amber-300 line-clamp-1 font-medium">
                            {firstReminder.title || firstReminder.description}
                            {reminderCount > 1 && (
                              <span className="ml-1 text-[9px] text-amber-500">
                                (+{reminderCount - 1})
                              </span>
                            )}
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
          <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm">
            <CardHeader className="p-responsive-3">
              <CardTitle className="text-responsive-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-responsive-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-muted-foreground">
                Selected date:{" "}
                <span className="font-medium text-foreground">
                  {selectedDate ? formatLocalDateLabel(selectedDate) : "Today"}
                </span>
              </div>
              <Button
                className="w-full touch-friendly font-semibold"
                size="sm"
                variant="default"
                onClick={() => {
                  if (!selectedDate) {
                    const today = toLocalDateKey(new Date())
                    setSelectedDate(today)
                  }
                  setIsAddReminderOpen(true)
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Create Reminder
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Add Reminder Dialog */}
      <Dialog open={isAddReminderOpen} onOpenChange={setIsAddReminderOpen}>
        <DialogContent className="w-full max-w-md sm:max-w-lg max-h-[85vh] mx-auto bg-white dark:bg-[#12151c] ring-1 ring-black/10 dark:ring-white/10 shadow-xl">
          <DialogHeader className="p-responsive-3">
            <DialogTitle className="text-responsive-lg">
              Add reminder — {selectedDate ? formatLocalDateLabel(selectedDate) : "Select a date"}
            </DialogTitle>
            <DialogDescription className="text-responsive-sm">
              Create a reminder like a bill or subscription; you&apos;ll be notified a few days before it is due.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-responsive-3">
            <div className="form-group">
              <Label htmlFor="reminder-title" className="form-responsive">Title *</Label>
              <Input
                id="reminder-title"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                placeholder="WiFi bill"
                className="form-responsive touch-friendly"
              />
            </div>

            <div className="form-group">
              <Label htmlFor="reminder-description" className="form-responsive">Notes</Label>
              <Textarea
                id="reminder-description"
                value={reminderDescription}
                onChange={(e) => setReminderDescription(e.target.value)}
                placeholder="Optional details (account number, etc.)"
                className="form-responsive touch-friendly"
              />
            </div>

            <div className="form-group">
              <Label htmlFor="reminder-amount" className="form-responsive">Amount (optional)</Label>
              <Input
                id="reminder-amount"
                type="number"
                step="0.01"
                value={reminderAmount ?? ""}
                onChange={(e) => setReminderAmount(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0.00"
                className="form-responsive touch-friendly"
              />
            </div>

            <div className="form-group">
              <Label htmlFor="reminder-category" className="form-responsive">Category</Label>
              <Select
                value={reminderCategory}
                onValueChange={(value) => setReminderCategory(value)}
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
          </div>

          <DialogFooter className="p-responsive-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddReminderOpen(false)
                setSelectedReminderId(null)
              }}
              className="touch-friendly"
            >
              Cancel
            </Button>
            {selectedReminderId && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  reminderAPI.updateStatus(selectedReminderId, "cancelled")
                    .then(() => {
                      setSelectedReminderId(null)
                      setIsAddReminderOpen(false)
                      queryClient.invalidateQueries({ queryKey: ['calendar-reminders'] })
                      queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
                      toast({
                        title: 'Reminder deleted',
                        description: 'This reminder has been removed from your calendar.',
                      })
                    })
                    .catch((err: ErrorWithMessage) => {
                      toast({
                        title: 'Error',
                        description: err?.message || 'Failed to delete reminder',
                        variant: 'destructive',
                      })
                    })
                }}
                className="touch-friendly"
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              disabled={!reminderTitle || !selectedDate}
              onClick={() => {
                if (!selectedDate || !reminderTitle) return
                reminderAPI.create({
                  title: reminderTitle,
                  description: reminderDescription || undefined,
                  dueDate: selectedDate,
                  amount: reminderAmount,
                  category: reminderCategory,
                })
                  .then(() => {
                    setReminderTitle("")
                    setReminderDescription("")
                    setReminderAmount(undefined)
                    setIsAddReminderOpen(false)
                    queryClient.invalidateQueries({ queryKey: ['calendar-reminders'] })
                    queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
                    toast({
                      title: 'Reminder created',
                      description: 'We will notify you before this reminder is due.',
                    })
                  })
                  .catch((err: ErrorWithMessage) => {
                    toast({
                      title: 'Error',
                      description: err?.message || 'Failed to create reminder',
                      variant: 'destructive',
                    })
                  })
              }}
              className="touch-friendly"
            >
              Save Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
