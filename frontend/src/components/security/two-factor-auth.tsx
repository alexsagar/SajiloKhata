"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Shield,
    Smartphone,
    Key,
    Copy,
    Check,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Eye,
    EyeOff,
    Download
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

// Types
interface TwoFactorStatus {
    enabled: boolean
    enabledAt?: string
    lastUsed?: string
    backupCodesRemaining?: number
}

interface SetupData {
    secret: string
    otpauthUrl: string
    issuer: string
    accountName: string
}

interface TwoFactorAuthProps {
    className?: string
}

interface ApiErrorLike {
    message?: string
    response?: {
        status?: number
    }
}

interface GenerateSecretResponse {
    data?: {
        data?: Partial<SetupData> & { secret: string }
    } & Partial<SetupData> & { secret: string }
}

interface BackupCodesResponse {
    data?: {
        data?: {
            codes?: string[]
        }
        codes?: string[]
    }
}

type SetupStep = "initial" | "generate" | "verify" | "backup-codes" | "complete"

function getSetupPayload(response: GenerateSecretResponse): (Partial<SetupData> & { secret: string }) | null {
    return response.data?.data || response.data || null
}

// Constants
const CODE_LENGTH = 6
const BACKUP_CODE_COUNT = 10

export function TwoFactorAuth({ className }: TwoFactorAuthProps) {
    // Status state
    const [status, setStatus] = useState<TwoFactorStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Enable flow state
    const [enableDialogOpen, setEnableDialogOpen] = useState(false)
    const [enableStep, setEnableStep] = useState<SetupStep>("initial")
    const [setupData, setSetupData] = useState<SetupData | null>(null)
    const [verificationCode, setVerificationCode] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [verifyError, setVerifyError] = useState<string | null>(null)
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [backupCodesSaved, setBackupCodesSaved] = useState(false)
    const [showManualEntry, setShowManualEntry] = useState(false)

    // Disable flow state
    const [disableDialogOpen, setDisableDialogOpen] = useState(false)
    const [disableCode, setDisableCode] = useState("")
    const [disablePassword, setDisablePassword] = useState("")
    const [isDisabling, setIsDisabling] = useState(false)
    const [disableError, setDisableError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    // UI state
    const [copied, setCopied] = useState(false)
    const [showBackupCodesView, setShowBackupCodesView] = useState(false)

    // Refs
    const codeInputRef = useRef<HTMLInputElement>(null)

    // Hooks
    const { toast } = useToast()
    const { user, isOAuthUser } = useAuth()

    // Fetch 2FA status
    const fetchStatus = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await userAPI.get2FAStatus()
            setStatus(response.data?.data || response.data)
        } catch (err: unknown) {
            const error = err as ApiErrorLike
            // If 404, assume 2FA is not set up
            if (error.response?.status === 404) {
                setStatus({ enabled: false })
            } else {
                setError(error.message || "Failed to fetch 2FA status")
            }
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Fetch 2FA status on mount
    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    // Focus code input when relevant
    useEffect(() => {
        if (enableStep === "verify" || disableDialogOpen) {
            codeInputRef.current?.focus()
        }
    }, [enableStep, disableDialogOpen])

    // Reset enable dialog state when closed
    useEffect(() => {
        if (!enableDialogOpen) {
            setEnableStep("initial")
            setSetupData(null)
            setVerificationCode("")
            setVerifyError(null)
            setBackupCodes([])
            setBackupCodesSaved(false)
            setShowManualEntry(false)
        }
    }, [enableDialogOpen])

    // Reset disable dialog state when closed
    useEffect(() => {
        if (!disableDialogOpen) {
            setDisableCode("")
            setDisablePassword("")
            setDisableError(null)
        }
    }, [disableDialogOpen])

    // Generate 2FA secret
    const handleGenerateSecret = useCallback(async () => {
        setIsGenerating(true)
        setVerifyError(null)
        try {
            const response = await userAPI.generate2FASecret() as GenerateSecretResponse
            const data = getSetupPayload(response)

            if (!data?.secret) {
                throw new Error("Failed to generate setup secret")
            }

            const issuer = data.issuer || "SajiloKhata"
            const accountName = user?.email || ""
            const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
                accountName
            )}?secret=${data.secret}&issuer=${encodeURIComponent(issuer)}`

            setSetupData({
                secret: data.secret,
                otpauthUrl,
                issuer,
                accountName,
            })
            setEnableStep("verify")
        } catch (err: unknown) {
            const error = err as ApiErrorLike
            toast({
                title: "Failed to generate secret",
                description: error.message || "Please try again",
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
        }
    }, [user?.email, toast])

    // Verify and enable 2FA
    const handleVerifyAndEnable = useCallback(async () => {
        if (verificationCode.length !== CODE_LENGTH) {
            setVerifyError("Please enter a 6-digit code")
            return
        }

        setIsVerifying(true)
        setVerifyError(null)
        try {
            const response = await userAPI.enable2FA({
                code: verificationCode,
                secret: setupData?.secret || "",
            })

            // Get backup codes from response
            const codes = response.data?.data?.backupCodes || response.data?.backupCodes || []
            setBackupCodes(codes)
            setEnableStep("backup-codes")

            toast({
                title: "2FA Enabled",
                description: "Two-factor authentication is now active on your account.",
            })
        } catch (err: unknown) {
            const error = err as ApiErrorLike
            setVerifyError(error.message || "Invalid verification code")
        } finally {
            setIsVerifying(false)
        }
    }, [verificationCode, setupData?.secret, toast])

    // Complete setup
    const handleCompleteSetup = useCallback(() => {
        setEnableDialogOpen(false)
        setStatus({ enabled: true, enabledAt: new Date().toISOString(), backupCodesRemaining: backupCodes.length })
    }, [backupCodes.length])

    // Disable 2FA
    const handleDisable2FA = useCallback(async () => {
        if (disableCode.length !== CODE_LENGTH) {
            setDisableError("Please enter a 6-digit code")
            return
        }

        if (!isOAuthUser && disablePassword.length < 6) {
            setDisableError("Please enter your password")
            return
        }

        setIsDisabling(true)
        setDisableError(null)
        try {
            await userAPI.disable2FA({
                code: disableCode,
                password: disablePassword,
            })

            setStatus({ enabled: false })
            setDisableDialogOpen(false)

            toast({
                title: "2FA Disabled",
                description: "Two-factor authentication has been disabled.",
            })
        } catch (err: unknown) {
            const error = err as ApiErrorLike
            setDisableError(error.message || "Failed to disable 2FA")
        } finally {
            setIsDisabling(false)
        }
    }, [disableCode, disablePassword, isOAuthUser, toast])

    // Copy secret to clipboard
    const handleCopySecret = useCallback(async () => {
        if (!setupData?.secret) return
        try {
            await navigator.clipboard.writeText(setupData.secret)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            toast({ title: "Copied to clipboard" })
        } catch {
            toast({ title: "Failed to copy", variant: "destructive" })
        }
    }, [setupData?.secret, toast])

    // Download backup codes
    const handleDownloadBackupCodes = useCallback(() => {
        const content = [
            "SajiloKhata Backup Codes",
            "========================",
            "",
            `Generated: ${new Date().toLocaleString()}`,
            `Account: ${user?.email}`,
            "",
            "IMPORTANT: Store these codes securely. Each code can only be used once.",
            "",
            ...backupCodes.map((code, i) => `${i + 1}. ${code}`),
            "",
            "If you lose access to your authenticator app, use one of these codes to sign in.",
        ].join("\n")

        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "sajilokhata-backup-codes.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setBackupCodesSaved(true)
    }, [backupCodes, user?.email])

    // Handle code input with numeric-only validation
    const handleCodeInput = useCallback((value: string, setter: (v: string) => void) => {
        const numericValue = value.replace(/\D/g, "").slice(0, CODE_LENGTH)
        setter(numericValue)
    }, [])

    // Loading state
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Two-Factor Authentication
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    // Error state
    if (error) {
        return (
            <Card className={cn("border-destructive/50", className)}>
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <XCircle className="h-5 w-5" />
                        Two-Factor Authentication
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button variant="outline" onClick={fetchStatus} className="mt-4">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card className={className}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <CardTitle>Two-Factor Authentication</CardTitle>
                        </div>
                        {status?.enabled && (
                            <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Enabled
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        Add an extra layer of security by requiring a verification code from your phone when signing in.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Main toggle */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-muted rounded-lg">
                                <Smartphone className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium">Authenticator App</p>
                                <p className="text-sm text-muted-foreground">
                                    Use Google Authenticator, Authy, or similar apps
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={status?.enabled || false}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    setEnableDialogOpen(true)
                                } else {
                                    setDisableDialogOpen(true)
                                }
                            }}
                        />
                    </div>

                    {/* Status details when enabled */}
                    {status?.enabled && (
                        <>
                            <Separator />
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Enabled since</span>
                                    <span>{status.enabledAt ? new Date(status.enabledAt).toLocaleDateString() : "Unknown"}</span>
                                </div>
                                {status.lastUsed && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Last used</span>
                                        <span>{new Date(status.lastUsed).toLocaleDateString()}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Backup codes remaining</span>
                                    <Badge variant={status.backupCodesRemaining && status.backupCodesRemaining <= 2 ? "destructive" : "secondary"}>
                                        {status.backupCodesRemaining ?? 0} / {BACKUP_CODE_COUNT}
                                    </Badge>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={async () => {
                                    try {
                                        const response = await userAPI.getBackupCodes() as BackupCodesResponse
                                        setBackupCodes(response.data?.data?.codes || response.data?.codes || [])
                                        setShowBackupCodesView(true)
                                    } catch (err: unknown) {
                                        const error = err as ApiErrorLike
                                        toast({
                                            title: "Failed to fetch backup codes",
                                            description: error.message,
                                            variant: "destructive",
                                        })
                                    }
                                }}
                            >
                                <Key className="h-4 w-4 mr-2" />
                                Manage Backup Codes
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Enable 2FA Dialog */}
            <Dialog open={enableDialogOpen} onOpenChange={setEnableDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Set Up Two-Factor Authentication
                        </DialogTitle>
                        <DialogDescription>
                            {enableStep === "initial" && "Scan a QR code with your authenticator app to get started."}
                            {enableStep === "verify" && "Enter the 6-digit code from your authenticator app."}
                            {enableStep === "backup-codes" && "Save these backup codes in a secure place."}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Initial step */}
                    {enableStep === "initial" && (
                        <div className="space-y-4 py-4">
                            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                                <h4 className="font-medium flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" />
                                    What you&apos;ll need
                                </h4>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                                    <li>Download an authenticator app like Google Authenticator or Authy</li>
                                    <li>Scan the QR code or enter the secret key manually</li>
                                    <li>Enter the 6-digit verification code</li>
                                </ol>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleGenerateSecret} disabled={isGenerating}>
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        "Get Started"
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {/* Verify step */}
                    {enableStep === "verify" && setupData && (
                        <div className="space-y-6 py-4">
                            {/* QR Code placeholder with link */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="bg-muted p-6 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Scan this QR code with your authenticator app, or click below to open it:
                                    </p>
                                    <Button variant="outline" asChild>
                                        <a href={setupData.otpauthUrl}>
                                            <Smartphone className="h-4 w-4 mr-2" />
                                            Open in Authenticator App
                                        </a>
                                    </Button>
                                </div>
                            </div>

                            {/* Manual entry toggle */}
                            <div className="space-y-2">
                                <Button
                                    variant="ghost"
                                    className="w-full flex items-center justify-between"
                                    onClick={() => setShowManualEntry(!showManualEntry)}
                                >
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Key className="h-4 w-4" />
                                        Can&apos;t scan? Enter code manually
                                    </span>
                                    {showManualEntry ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>

                                {showManualEntry && (
                                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                        <code className="flex-1 font-mono text-sm break-all">
                                            {setupData.secret}
                                        </code>
                                        <Button variant="ghost" size="sm" onClick={handleCopySecret}>
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Verification code input */}
                            <div className="space-y-2">
                                <Label htmlFor="verify-code">Enter verification code</Label>
                                <Input
                                    ref={codeInputRef}
                                    id="verify-code"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="000000"
                                    value={verificationCode}
                                    onChange={(e) => handleCodeInput(e.target.value, setVerificationCode)}
                                    className={cn(
                                        "font-mono text-center text-2xl tracking-[0.5em] h-14",
                                        verifyError && "border-destructive"
                                    )}
                                    autoComplete="one-time-code"
                                />
                                {verifyError && (
                                    <p className="text-sm text-destructive flex items-center gap-1">
                                        <XCircle className="h-3 w-3" />
                                        {verifyError}
                                    </p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setEnableStep("initial")}>
                                    Back
                                </Button>
                                <Button
                                    onClick={handleVerifyAndEnable}
                                    disabled={verificationCode.length !== CODE_LENGTH || isVerifying}
                                >
                                    {isVerifying ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify & Enable"
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {/* Backup codes step */}
                    {enableStep === "backup-codes" && (
                        <div className="space-y-6 py-4">
                            <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="space-y-2">
                                        <p className="font-medium text-amber-700 dark:text-amber-400">
                                            Save your backup codes
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            If you lose access to your authenticator app, you can use these codes to sign in.
                                            Each code can only be used once. Store them securely!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                                {backupCodes.map((code, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{index + 1}.</span>
                                        <span>{code}</span>
                                    </div>
                                ))}
                            </div>

                            <Button variant="outline" className="w-full" onClick={handleDownloadBackupCodes}>
                                <Download className="h-4 w-4 mr-2" />
                                Download Backup Codes
                            </Button>

                            <DialogFooter>
                                <Button
                                    onClick={handleCompleteSetup}
                                    disabled={!backupCodesSaved}
                                    className="w-full"
                                >
                                    {backupCodesSaved ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Done
                                        </>
                                    ) : (
                                        "Please download your backup codes first"
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Disable 2FA Dialog */}
            <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Disable Two-Factor Authentication
                        </DialogTitle>
                        <DialogDescription>
                            This will make your account less secure. Please confirm to proceed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                            <p className="text-sm text-muted-foreground">
                                Disabling 2FA will remove the extra security layer from your account.
                                Anyone with your password will be able to access your account.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="disable-code">Authenticator code</Label>
                                <Input
                                    ref={codeInputRef}
                                    id="disable-code"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="000000"
                                    value={disableCode}
                                    onChange={(e) => handleCodeInput(e.target.value, setDisableCode)}
                                    className="font-mono text-center text-xl tracking-[0.5em]"
                                    autoComplete="one-time-code"
                                />
                            </div>

                            {!isOAuthUser && (
                                <div className="space-y-2">
                                    <Label htmlFor="disable-password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="disable-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={disablePassword}
                                            onChange={(e) => setDisablePassword(e.target.value)}
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {disableError && (
                                <p className="text-sm text-destructive flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    {disableError}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDisableDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDisable2FA}
                            disabled={disableCode.length !== CODE_LENGTH || isDisabling}
                        >
                            {isDisabling ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Disabling...
                                </>
                            ) : (
                                "Disable 2FA"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Backup Codes Dialog */}
            <Dialog open={showBackupCodesView} onOpenChange={setShowBackupCodesView}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            Your Backup Codes
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                        {backupCodes.map((code, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className="text-muted-foreground">{index + 1}.</span>
                                <span>{code}</span>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleDownloadBackupCodes}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                        <Button onClick={() => setShowBackupCodesView(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default TwoFactorAuth
