"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, Table } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { downloadFile } from "@/lib/utils"

interface ExportDataProps {
  period: string
  groupId?: string
}

interface ExportResponse {
  data?: unknown
}

interface ErrorWithMessage {
  response?: {
    data?: {
      message?: string
    }
  }
}

function toDownloadString(value: unknown) {
  if (typeof value === "string") return value
  if (value == null) return ""
  return JSON.stringify(value, null, 2)
}

export function ExportData({ period, groupId }: ExportDataProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportMutation = useMutation({
    mutationFn: ({ format }: { format: string }) => 
      analyticsAPI.exportData(format, period, groupId),
    onSuccess: (response: ExportResponse, variables) => {
      if (variables.format === 'csv') {
        // For CSV, the response should be the CSV content
        downloadFile(toDownloadString(response.data), `expenses-${period}.csv`, 'text/csv')
      } else {
        // For JSON, download as JSON file
        downloadFile(
          toDownloadString(response.data), 
          `expenses-${period}.json`, 
          'application/json'
        )
      }
      toast({
        title: "Export successful",
        description: `Your data has been exported as ${variables.format.toUpperCase()}.`,
      })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Export failed",
        description: error.response?.data?.message || "Failed to export data",
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsExporting(false)
    }
  })

  const handleExport = (format: 'json' | 'csv') => {
    setIsExporting(true)
    exportMutation.mutate({ format })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <Table className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
