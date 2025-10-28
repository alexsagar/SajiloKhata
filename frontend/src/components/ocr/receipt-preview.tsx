"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Eye, Trash2 } from "lucide-react"

interface ReceiptPreviewProps {
  expenseId: string
}

export function ReceiptPreview({ expenseId }: ReceiptPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Preview</CardTitle>
        <CardDescription>Viewing receipt for expense {expenseId}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Full Size
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          <p>Receipt preview will be displayed here.</p>
        </div>
      </CardContent>
    </Card>
  )
}
