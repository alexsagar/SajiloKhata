"use client"

import React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scan, Upload, Camera, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { useMutation } from "@tanstack/react-query"
import { receiptAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

interface SmartReceiptScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReceiptProcessed?: (receiptData: any) => void
}

interface OCRResult {
  merchantName: string
  date: string | null
  total: number
  subtotal: number
  tax: number
  items: Array<{
    description: string
    amount: number
  }>
  confidence: number
  suggestedCategory: string
}

export function SmartReceiptScanner({ open, onOpenChange, onReceiptProcessed }: SmartReceiptScannerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [processingStep, setProcessingStep] = useState<'upload' | 'processing' | 'results'>('upload')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setSelectedFile(acceptedFiles[0])
    }
  })

  const processReceiptMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('receipt', file)
      return receiptAPI.uploadReceipt(formData)
    },
    onSuccess: (response) => {
      setOcrResult(response.data.ocrData)
      setProcessingStep('results')
      toast({
        title: "Receipt processed",
        description: "Your receipt has been successfully scanned and processed.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.response?.data?.message || "Failed to process receipt",
        variant: "destructive",
      })
      setProcessingStep('upload')
    },
  })

  const handleProcessReceipt = () => {
    if (!selectedFile) return
    
    setProcessingStep('processing')
    processReceiptMutation.mutate(selectedFile)
  }

  const handleUseResults = () => {
    if (ocrResult && onReceiptProcessed) {
      onReceiptProcessed({
        description: ocrResult.merchantName || "Receipt expense",
        amount: ocrResult.total,
        category: ocrResult.suggestedCategory,
        date: ocrResult.date,
        receipt: selectedFile,
        ocrData: ocrResult,
      })
    }
    onOpenChange(false)
    resetState()
  }

  const resetState = () => {
    setSelectedFile(null)
    setOcrResult(null)
    setProcessingStep('upload')
  }

  const handleClose = () => {
    onOpenChange(false)
    resetState()
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600"
    if (confidence >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return "High"
    if (confidence >= 60) return "Medium"
    return "Low"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">Smart Receipt Scanner</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload a receipt and let AI extract the details for you.
          </DialogDescription>
        </DialogHeader>

        {processingStep === 'upload' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"
              }`}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-lg font-medium">Drop your receipt here</p>
                  <p className="text-sm text-muted-foreground">
                    or click to select a file
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PNG, JPG, PDF files up to 10MB
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleProcessReceipt} 
                disabled={!selectedFile}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Process Receipt
              </Button>
            </div>
          </div>
        )}

        {processingStep === 'processing' && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <h3 className="text-lg font-semibold mt-4">Processing Receipt</h3>
              <p className="text-muted-foreground">
                Our AI is analyzing your receipt and extracting the details...
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>Please wait</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                This usually takes 5-10 seconds
              </p>
            </div>
          </div>
        )}

        {processingStep === 'results' && ocrResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Receipt Processed
              </h3>
              <Badge className={getConfidenceColor(ocrResult.confidence)}>
                {getConfidenceLabel(ocrResult.confidence)} Confidence ({ocrResult.confidence}%)
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Extracted Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Merchant</p>
                    <p className="text-sm text-muted-foreground">
                      {ocrResult.merchantName || "Not detected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {ocrResult.date ? new Date(ocrResult.date).toLocaleDateString() : "Not detected"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">Subtotal</p>
                    <p className="text-sm text-muted-foreground">
                      {ocrResult.subtotal ? formatCurrency(ocrResult.subtotal) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tax</p>
                    <p className="text-sm text-muted-foreground">
                      {ocrResult.tax ? formatCurrency(ocrResult.tax) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(ocrResult.total)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Suggested Category</p>
                  <Badge variant="secondary">{ocrResult.suggestedCategory}</Badge>
                </div>

                {ocrResult.items && ocrResult.items.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Line Items</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {ocrResult.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="truncate">{item.description}</span>
                          <span className="font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {ocrResult.confidence < 60 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Low Confidence Detection
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Please review the extracted information carefully before using it.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleUseResults}>
                Use This Data
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}