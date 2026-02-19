"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
    AlertTriangle,
    Trash2,
    Download,
    Shield,
    Loader2,
    CheckCircle2,
    XCircle,
    ArrowRight,
    ArrowLeft
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userAPI, expenseAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

// Types
interface DeletionStep {
    id: number
    title: string
    description: string
    completed: boolean
}

interface DataExportStatus {
    isExporting: boolean
    progress: number
    downloadUrl: string | null
    error: string | null
}

interface AccountDeletionProps {
    className?: string
}

// Constants
const CONFIRMATION_PHRASE = "DELETE MY ACCOUNT"
const DELETION_STEPS: DeletionStep[] = [
    { id: 1, title: "Acknowledge Impact", description: "Understand what will be deleted", completed: false },
    { id: 2, title: "Export Data (Optional)", description: "Download your data before deletion", completed: false },
    { id: 3, title: "Verify Identity", description: "Confirm with your password", completed: false },
    { id: 4, title: "Final Confirmation", description: "Type confirmation phrase", completed: false },
]

const DATA_TO_BE_DELETED = [
    { category: "Financial Data", items: ["All expenses and transactions", "Receipt images and OCR data", "Payment history", "Balance records"] },
    { category: "Social Data", items: ["Group memberships", "Friend connections", "Shared expense splits", "Settlement history"] },
    { category: "Communication", items: ["Chat messages", "Notifications", "Activity logs"] },
    { category: "Account Data", items: ["Profile information", "Preferences and settings", "Avatar images", "Connected OAuth accounts"] },
]

export function AccountDeletion({ className }: AccountDeletionProps) {
    // State
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [steps, setSteps] = useState<DeletionStep[]>(DELETION_STEPS)
    const [acknowledgements, setAcknowledgements] = useState<Record<string, boolean>>({
        understand: false,
        noRecovery: false,
        settlementsCleared: false,
    })
    const [exportStatus, setExportStatus] = useState<DataExportStatus>({
        isExporting: false,
        progress: 0,
        downloadUrl: null,
        error: null,
    })
    const [password, setPassword] = useState("")
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [confirmationPhrase, setConfirmationPhrase] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)
    const [deletionError, setDeletionError] = useState<string | null>(null)

    // Hooks
    const { toast } = useToast()
    const { user, logout, isOAuthUser } = useAuth()
    const router = useRouter()

    // Computed
    const allAcknowledged = Object.values(acknowledgements).every(Boolean)
    const confirmationValid = confirmationPhrase === CONFIRMATION_PHRASE
    const canProceedToStep2 = allAcknowledged
    const canProceedToStep3 = true // Export is optional
    const canProceedToStep4 = !passwordError && (isOAuthUser || password.length >= 6)
    const canDelete = confirmationValid && !isDeleting

    // Reset state when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setCurrentStep(1)
            setSteps(DELETION_STEPS)
            setAcknowledgements({ understand: false, noRecovery: false, settlementsCleared: false })
            setExportStatus({ isExporting: false, progress: 0, downloadUrl: null, error: null })
            setPassword("")
            setPasswordError(null)
            setConfirmationPhrase("")
            setIsDeleting(false)
            setDeletionError(null)
        }
    }, [isOpen])

    // Mark step as completed
    const completeStep = useCallback((stepId: number) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, completed: true } : s))
    }, [])

    // Handle acknowledgement changes
    const handleAcknowledgementChange = useCallback((key: string, checked: boolean) => {
        setAcknowledgements(prev => ({ ...prev, [key]: checked }))
    }, [])

    // Handle data export
    const handleExportData = useCallback(async () => {
        setExportStatus({ isExporting: true, progress: 0, downloadUrl: null, error: null })

        try {
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setExportStatus(prev => ({
                    ...prev,
                    progress: Math.min(prev.progress + 10, 90)
                }))
            }, 500)

            // Call export API
            const response = await expenseAPI.exportData({ format: 'json', includeReceipts: true })

            clearInterval(progressInterval)

            // Handle the download URL from response
            const downloadUrl = response.data?.downloadUrl || response.data?.url

            setExportStatus({
                isExporting: false,
                progress: 100,
                downloadUrl,
                error: null,
            })

            toast({
                title: "Export Complete",
                description: "Your data has been exported successfully.",
            })
        } catch (error: any) {
            setExportStatus({
                isExporting: false,
                progress: 0,
                downloadUrl: null,
                error: error.message || "Failed to export data",
            })

            toast({
                title: "Export Failed",
                description: error.message || "Failed to export your data. You can try again or skip this step.",
                variant: "destructive",
            })
        }
    }, [toast])

    // Handle password verification
    const handleVerifyPassword = useCallback(async () => {
        if (isOAuthUser) {
            // OAuth users don't need password verification
            completeStep(3)
            setCurrentStep(4)
            return
        }

        if (password.length < 6) {
            setPasswordError("Password must be at least 6 characters")
            return
        }

        setPasswordError(null)
        completeStep(3)
        setCurrentStep(4)
    }, [password, isOAuthUser, completeStep])

    // Handle account deletion
    const handleDeleteAccount = useCallback(async () => {
        if (!confirmationValid) return

        setIsDeleting(true)
        setDeletionError(null)

        try {
            await userAPI.deleteAccount({
                password: isOAuthUser ? undefined : password,
                confirmation: CONFIRMATION_PHRASE,
            })

            toast({
                title: "Account Deleted",
                description: "Your account has been permanently deleted. We're sorry to see you go.",
            })

            // Logout and redirect
            await logout()
            router.push("/goodbye")
        } catch (error: any) {
            const errorMessage = error.message || "Failed to delete account"
            setDeletionError(errorMessage)

            toast({
                title: "Deletion Failed",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
            setIsDeleting(false)
        }
    }, [confirmationValid, isOAuthUser, password, toast, logout, router])

    // Navigation handlers
    const handleNext = useCallback(() => {
        if (currentStep === 1 && canProceedToStep2) {
            completeStep(1)
            setCurrentStep(2)
        } else if (currentStep === 2 && canProceedToStep3) {
            completeStep(2)
            setCurrentStep(3)
        } else if (currentStep === 3) {
            handleVerifyPassword()
        }
    }, [currentStep, canProceedToStep2, canProceedToStep3, completeStep, handleVerifyPassword])

    const handleBack = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }, [currentStep])

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                            <div className="flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="font-medium text-destructive">This action is permanent and cannot be undone</p>
                                    <p className="text-sm text-muted-foreground">
                                        Once your account is deleted, all your data will be permanently removed from our servers.
                                        This includes your expenses, groups, messages, and all personal information.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-medium">The following data will be permanently deleted:</h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {DATA_TO_BE_DELETED.map((category) => (
                                    <div key={category.category} className="rounded-lg border p-4">
                                        <h5 className="font-medium text-sm mb-2">{category.category}</h5>
                                        <ul className="space-y-1">
                                            {category.items.map((item) => (
                                                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <XCircle className="h-3 w-3 text-destructive shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="font-medium">Please confirm you understand:</h4>
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="understand"
                                        checked={acknowledgements.understand}
                                        onCheckedChange={(checked) => handleAcknowledgementChange("understand", checked as boolean)}
                                    />
                                    <Label htmlFor="understand" className="text-sm leading-relaxed cursor-pointer">
                                        I understand that deleting my account is permanent and all my data will be lost forever.
                                    </Label>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="noRecovery"
                                        checked={acknowledgements.noRecovery}
                                        onCheckedChange={(checked) => handleAcknowledgementChange("noRecovery", checked as boolean)}
                                    />
                                    <Label htmlFor="noRecovery" className="text-sm leading-relaxed cursor-pointer">
                                        I understand that this action cannot be undone and my account cannot be recovered.
                                    </Label>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="settlementsCleared"
                                        checked={acknowledgements.settlementsCleared}
                                        onCheckedChange={(checked) => handleAcknowledgementChange("settlementsCleared", checked as boolean)}
                                    />
                                    <Label htmlFor="settlementsCleared" className="text-sm leading-relaxed cursor-pointer">
                                        I have settled all outstanding balances with my friends and groups.
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="rounded-lg border bg-muted/50 p-4">
                            <div className="flex gap-3">
                                <Download className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="font-medium">Export Your Data (Optional)</p>
                                    <p className="text-sm text-muted-foreground">
                                        Before deleting your account, you may want to download a copy of your data including expenses,
                                        receipts, and transaction history.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {exportStatus.isExporting && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Preparing your data...</span>
                                    <span>{exportStatus.progress}%</span>
                                </div>
                                <Progress value={exportStatus.progress} className="h-2" />
                            </div>
                        )}

                        {exportStatus.downloadUrl && (
                            <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-medium text-green-700 dark:text-green-400">Export Ready</p>
                                        <p className="text-sm text-muted-foreground">Your data has been exported successfully.</p>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={exportStatus.downloadUrl} download>
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {exportStatus.error && (
                            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                                <div className="flex gap-3">
                                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                                    <div>
                                        <p className="font-medium text-destructive">Export Failed</p>
                                        <p className="text-sm text-muted-foreground">{exportStatus.error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!exportStatus.isExporting && !exportStatus.downloadUrl && (
                            <Button
                                variant="outline"
                                onClick={handleExportData}
                                className="w-full"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export My Data
                            </Button>
                        )}

                        <p className="text-sm text-muted-foreground text-center">
                            You can skip this step if you don't need a copy of your data.
                        </p>
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="rounded-lg border bg-muted/50 p-4">
                            <div className="flex gap-3">
                                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="font-medium">Verify Your Identity</p>
                                    <p className="text-sm text-muted-foreground">
                                        {isOAuthUser
                                            ? "Since you signed in with a social account, you can proceed without entering a password."
                                            : "For security, please enter your password to confirm this is you."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {isOAuthUser ? (
                            <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                    <div>
                                        <p className="font-medium text-green-700 dark:text-green-400">Identity Verified</p>
                                        <p className="text-sm text-muted-foreground">
                                            You're signed in as {user?.email}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            setPasswordError(null)
                                        }}
                                        className={cn(passwordError && "border-destructive")}
                                    />
                                    {passwordError && (
                                        <p className="text-sm text-destructive">{passwordError}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-destructive bg-destructive/5 p-4">
                            <div className="flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="font-medium text-destructive">Final Confirmation</p>
                                    <p className="text-sm text-muted-foreground">
                                        This is your last chance to cancel. After this step, your account and all data will be permanently deleted.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label htmlFor="confirmation">
                                Type <span className="font-mono font-bold text-destructive">{CONFIRMATION_PHRASE}</span> to confirm:
                            </Label>
                            <Input
                                id="confirmation"
                                type="text"
                                placeholder={CONFIRMATION_PHRASE}
                                value={confirmationPhrase}
                                onChange={(e) => setConfirmationPhrase(e.target.value.toUpperCase())}
                                className={cn(
                                    "font-mono text-center uppercase tracking-wider",
                                    confirmationValid && "border-destructive bg-destructive/5"
                                )}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {confirmationPhrase && !confirmationValid && (
                                <p className="text-sm text-muted-foreground text-center">
                                    Phrase doesn't match. Please type exactly: {CONFIRMATION_PHRASE}
                                </p>
                            )}
                        </div>

                        {deletionError && (
                            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                                <div className="flex gap-3">
                                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                                    <div>
                                        <p className="font-medium text-destructive">Deletion Failed</p>
                                        <p className="text-sm text-muted-foreground">{deletionError}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <Card className={cn("border-destructive/50", className)}>
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                </CardTitle>
                <CardDescription>
                    Permanently delete your account and all associated data. This action cannot be undone.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Delete Your Account
                            </DialogTitle>
                            <DialogDescription>
                                Complete all steps to permanently delete your account.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Progress Steps */}
                        <div className="py-4">
                            <div className="flex items-center justify-between">
                                {steps.map((step, index) => (
                                    <div key={step.id} className="flex items-center">
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                                                    currentStep === step.id
                                                        ? "border-destructive bg-destructive text-destructive-foreground"
                                                        : step.completed
                                                            ? "border-green-500 bg-green-500 text-white"
                                                            : "border-muted-foreground/30 text-muted-foreground"
                                                )}
                                            >
                                                {step.completed ? (
                                                    <CheckCircle2 className="h-4 w-4" />
                                                ) : (
                                                    step.id
                                                )}
                                            </div>
                                            <span className="text-xs mt-1 text-muted-foreground hidden sm:block max-w-[80px] text-center">
                                                {step.title}
                                            </span>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div
                                                className={cn(
                                                    "h-0.5 w-8 sm:w-16 mx-2",
                                                    step.completed ? "bg-green-500" : "bg-muted-foreground/30"
                                                )}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        {/* Step Content */}
                        <div className="py-4 min-h-[300px]">
                            {renderStepContent()}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            {currentStep > 1 && (
                                <Button variant="ghost" onClick={handleBack} disabled={isDeleting}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                            )}
                            <div className="flex-1" />
                            {currentStep < 4 ? (
                                <Button
                                    onClick={handleNext}
                                    disabled={
                                        (currentStep === 1 && !canProceedToStep2) ||
                                        (currentStep === 3 && !canProceedToStep4)
                                    }
                                >
                                    {currentStep === 3 ? "Verify & Continue" : "Continue"}
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteAccount}
                                    disabled={!canDelete}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete My Account Forever
                                        </>
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}

export default AccountDeletion
