"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { getInitials } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { TrendingUp, TrendingDown, DollarSign, Users, Receipt } from "lucide-react"
import { ComponentLoading } from "@/components/ui/loading"

export function BalanceOverview() {
  const { user } = useAuth()
  const userCurrency = user?.preferences?.currency || "USD"
  
  const { data: balance, isLoading } = useQuery({
    queryKey: ["balance-summary"],
    queryFn: analyticsAPI.getBalanceOverview,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <ComponentLoading 
          text="Loading Balance Overview" 
          subtitle="Please wait while we load your balance information..."
        />
      </div>
    )
  }

  const balanceData = balance?.data || {
    totalOwed: 0,
    totalOwes: 0,
    netBalance: 0,
    groupBalances: []
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You're Owed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(balanceData.totalOwed, userCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Money coming to you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You Owe</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(balanceData.totalOwes, userCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Money you need to pay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              balanceData.netBalance > 0 ? 'text-green-600' : 
              balanceData.netBalance < 0 ? 'text-red-600' : 
              'text-muted-foreground'
            }`}>
              {formatCurrency(Math.abs(balanceData.netBalance), userCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {balanceData.netBalance > 0 ? 'You\'re owed overall' : 
               balanceData.netBalance < 0 ? 'You owe overall' : 
               'You\'re settled up'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Group Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Balance by Group</CardTitle>
          <CardDescription>
            Your balance breakdown across all groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balanceData.groupBalances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No group balances to display
            </div>
          ) : (
            <div className="space-y-4">
              {balanceData.groupBalances.map((group: any) => (
                <div key={group.groupId} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={group.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {getInitials(group.groupName, "")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{group.groupName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Owed: {formatCurrency(group.owed, userCurrency)}</span>
                        <span>•</span>
                        <span>Owes: {formatCurrency(group.owes, userCurrency)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      group.netBalance > 0 ? 'text-green-600' : 
                      group.netBalance < 0 ? 'text-red-600' : 
                      'text-muted-foreground'
                    }`}>
                      {group.netBalance > 0 ? '+' : ''}{formatCurrency(group.netBalance, userCurrency)}
                    </div>
                    <Badge variant={group.netBalance === 0 ? "secondary" : "outline"}>
                      {group.netBalance === 0 ? 'Settled' : 
                       group.netBalance > 0 ? 'You\'re owed' : 'You owe'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}