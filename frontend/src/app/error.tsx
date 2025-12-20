'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <h1 className="text-xl font-semibold text-slate-100 mb-2">
          Something went wrong!
        </h1>
        
        <p className="text-slate-400 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        
        {error.digest && (
          <p className="text-xs text-slate-500 mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="space-y-3">
          <Button 
            onClick={reset}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Go to Dashboard
          </Button>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
