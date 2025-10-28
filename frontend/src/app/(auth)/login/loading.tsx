import { LoadingSpinner } from "@/components/common/loading-spinner"

export default function LoginLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}
