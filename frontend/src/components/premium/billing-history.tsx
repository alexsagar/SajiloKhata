"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Receipt } from "lucide-react"

interface BillingHistoryProps {
  userId?: string
}

export function BillingHistory({ userId }: BillingHistoryProps) {
  // Mock data - replace with actual API call
  const billingHistory = [
    {
      id: "1",
      date: "2024-01-15",
      amount: 9.99,
      status: "paid",
      description: "Premium Plan - Monthly",
      invoiceNumber: "INV-001"
    },
    {
      id: "2",
      date: "2023-12-15",
      amount: 9.99,
      status: "paid",
      description: "Premium Plan - Monthly",
      invoiceNumber: "INV-002"
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>View your past invoices and payments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {billingHistory.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <Receipt className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="font-medium">{item.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.date} • {item.invoiceNumber}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold">${item.amount}</div>
                  {getStatusBadge(item.status)}
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
