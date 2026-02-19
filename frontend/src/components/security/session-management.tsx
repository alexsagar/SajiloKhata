"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    Clock,
    Trash2,
    LogOut,
    MoreVertical,
    RefreshCw,
    MapPin,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Shield
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"

// Types
interface Session {
    id: string
    deviceType: "desktop" | "mobile" | "tablet" | "unknown"
    deviceName: string
    browser: string
    browserVersion?: string
    os: string
    osVersion?: string
    ip: string
    location?: {
        city?: string
        country?: string
        region?: string
    }
    lastActive: string
    createdAt: string
    isCurrent: boolean
    isTrusted?: boolean
}

interface SessionManagementProps {
    className?: string
}

// Device type icons
const DEVICE_ICONS = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
    unknown: Globe,
} as const

// Parse user agent to determine device info
function parseUserAgent(userAgent: string): { deviceType: Session["deviceType"]; browser: string; os: string } {
    const ua = userAgent.toLowerCase()

    let deviceType: Session["deviceType"] = "unknown"
    if (/mobile|android|iphone|ipod/.test(ua)) {
        deviceType = "mobile"
    } else if (/tablet|ipad/.test(ua)) {
        deviceType = "tablet"
    } else if (/windows|macintosh|linux/.test(ua)) {
        deviceType = "desktop"
    }

    let browser = "Unknown Browser"
    if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome"
    else if (ua.includes("firefox")) browser = "Firefox"
    else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari"
    else if (ua.includes("edg")) browser = "Edge"
    else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera"

    let os = "Unknown OS"
    if (ua.includes("windows")) os = "Windows"
    else if (ua.includes("mac os")) os = "macOS"
    else if (ua.includes("linux")) os = "Linux"
    else if (ua.includes("android")) os = "Android"
    else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS"

    return { deviceType, browser, os }
}

// Format location string
function formatLocation(location?: Session["location"]): string {
    if (!location) return "Unknown location"
    const parts = [location.city, location.region, location.country].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : "Unknown location"
}

// Format relative time
function formatRelativeTime(dateString: string): string {
    try {
        const date = new Date(dateString)
        const now = new Date()
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)

        if (diffMinutes < 1) return "Just now"
        if (diffMinutes < 60) return `${diffMinutes}m ago`

        return formatDistanceToNow(date, { addSuffix: true })
    } catch {
        return "Unknown"
    }
}

export function SessionManagement({ className }: SessionManagementProps) {
    // State
    const [sessions, setSessions] = useState<Session[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRevoking, setIsRevoking] = useState<string | null>(null)
    const [isRevokingAll, setIsRevokingAll] = useState(false)
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
    const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null)
    const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false)

    // Hooks
    const { toast } = useToast()
    const { user } = useAuth()

    // Computed
    const currentSession = useMemo(() => sessions.find(s => s.isCurrent), [sessions])
    const otherSessions = useMemo(() => sessions.filter(s => !s.isCurrent), [sessions])
    const hasOtherSessions = otherSessions.length > 0

    // Fetch sessions
    const fetchSessions = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await userAPI.getSessions()
            const data = response.data?.data || response.data?.sessions || response.data || []

            // Normalize session data
            const normalizedSessions: Session[] = data.map((session: any) => {
                const parsedUA = session.userAgent ? parseUserAgent(session.userAgent) : null

                return {
                    id: session.id || session._id,
                    deviceType: session.deviceType || parsedUA?.deviceType || "unknown",
                    deviceName: session.deviceName || session.device || `${parsedUA?.os} ${parsedUA?.browser}`,
                    browser: session.browser || parsedUA?.browser || "Unknown",
                    browserVersion: session.browserVersion,
                    os: session.os || parsedUA?.os || "Unknown",
                    osVersion: session.osVersion,
                    ip: session.ip || session.ipAddress || "Unknown",
                    location: session.location,
                    lastActive: session.lastActive || session.lastActivityAt || session.updatedAt,
                    createdAt: session.createdAt,
                    isCurrent: session.isCurrent || session.current || false,
                    isTrusted: session.isTrusted || session.trusted,
                }
            })

            // Sort: current first, then by last active
            normalizedSessions.sort((a, b) => {
                if (a.isCurrent) return -1
                if (b.isCurrent) return 1
                return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
            })

            setSessions(normalizedSessions)
        } catch (err: any) {
            setError(err.message || "Failed to load sessions")
            toast({
                title: "Error",
                description: "Failed to load your sessions. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

    // Initial fetch
    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    // Revoke a single session
    const handleRevokeSession = useCallback(async (session: Session) => {
        if (session.isCurrent) {
            toast({
                title: "Cannot revoke current session",
                description: "You cannot sign out of your current session here. Use the logout button instead.",
                variant: "destructive",
            })
            return
        }

        setIsRevoking(session.id)
        try {
            await userAPI.revokeSession(session.id)
            setSessions(prev => prev.filter(s => s.id !== session.id))
            toast({
                title: "Session revoked",
                description: `The session on ${session.deviceName} has been signed out.`,
            })
        } catch (err: any) {
            toast({
                title: "Failed to revoke session",
                description: err.message || "Please try again",
                variant: "destructive",
            })
        } finally {
            setIsRevoking(null)
            setConfirmDialogOpen(false)
            setSessionToRevoke(null)
        }
    }, [toast])

    // Revoke all other sessions
    const handleRevokeAllSessions = useCallback(async () => {
        setIsRevokingAll(true)
        try {
            await userAPI.revokeAllSessions()
            setSessions(prev => prev.filter(s => s.isCurrent))
            toast({
                title: "All other sessions revoked",
                description: "You have been signed out of all other devices.",
            })
        } catch (err: any) {
            toast({
                title: "Failed to revoke sessions",
                description: err.message || "Please try again",
                variant: "destructive",
            })
        } finally {
            setIsRevokingAll(false)
            setRevokeAllDialogOpen(false)
        }
    }, [toast])

    // Open confirmation dialog
    const openRevokeConfirm = useCallback((session: Session) => {
        setSessionToRevoke(session)
        setConfirmDialogOpen(true)
    }, [])

    // Render session item
    const renderSessionItem = (session: Session) => {
        const DeviceIcon = DEVICE_ICONS[session.deviceType]
        const isRevoking_ = isRevoking === session.id

        return (
            <div
                key={session.id}
                className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                    session.isCurrent && "bg-primary/5 border-primary/20",
                    !session.isCurrent && "hover:bg-muted/50"
                )}
            >
                <div className={cn(
                    "p-3 rounded-lg",
                    session.isCurrent ? "bg-primary/10" : "bg-muted"
                )}>
                    <DeviceIcon className={cn(
                        "h-5 w-5",
                        session.isCurrent ? "text-primary" : "text-muted-foreground"
                    )} />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{session.deviceName}</p>
                        {session.isCurrent && (
                            <Badge variant="default" className="bg-primary shrink-0">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Current
                            </Badge>
                        )}
                        {session.isTrusted && (
                            <Badge variant="outline" className="shrink-0">
                                <Shield className="h-3 w-3 mr-1" />
                                Trusted
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {session.browser} on {session.os}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {formatLocation(session.location)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {session.isCurrent ? (
                            <span className="text-primary font-medium">Active now</span>
                        ) : (
                            <span>Last active {formatRelativeTime(session.lastActive)}</span>
                        )}
                    </div>

                    {session.createdAt && (
                        <p className="text-xs text-muted-foreground">
                            First seen: {format(new Date(session.createdAt), "MMM d, yyyy")}
                        </p>
                    )}
                </div>

                {!session.isCurrent && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => openRevokeConfirm(session)}
                                className="text-destructive focus:text-destructive"
                                disabled={isRevoking_}
                            >
                                {isRevoking_ ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Sign out this device
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        )
    }

    // Loading skeleton
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                            <Skeleton className="h-12 w-12 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    // Error state
    if (error) {
        return (
            <Card className={cn("border-destructive/50", className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Active Sessions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button variant="outline" onClick={fetchSessions} className="mt-4">
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
                            <Globe className="h-5 w-5 text-primary" />
                            <CardTitle>Active Sessions</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={fetchSessions}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            {hasOtherSessions && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRevokeAllDialogOpen(true)}
                                    disabled={isRevokingAll}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out All Others
                                </Button>
                            )}
                        </div>
                    </div>
                    <CardDescription>
                        Manage devices where you're currently signed in. Revoke access to any session you don't recognize.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Current session */}
                    {currentSession && (
                        <>
                            <h3 className="text-sm font-medium text-muted-foreground">Current Session</h3>
                            {renderSessionItem(currentSession)}
                        </>
                    )}

                    {/* Other sessions */}
                    {hasOtherSessions && (
                        <>
                            <Separator />
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Other Sessions ({otherSessions.length})
                            </h3>
                            <div className="space-y-3">
                                {otherSessions.map(renderSessionItem)}
                            </div>
                        </>
                    )}

                    {/* No other sessions */}
                    {!hasOtherSessions && currentSession && (
                        <>
                            <Separator />
                            <div className="text-center py-6">
                                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                                <p className="font-medium">No other active sessions</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    You're only signed in on this device.
                                </p>
                            </div>
                        </>
                    )}

                    {/* Empty state */}
                    {sessions.length === 0 && (
                        <div className="text-center py-8">
                            <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">No active sessions found</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Single session revoke confirmation */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Sign out this device?
                        </DialogTitle>
                        <DialogDescription>
                            This will immediately sign out the session on{" "}
                            <strong>{sessionToRevoke?.deviceName}</strong>.
                            They will need to sign in again to access their account.
                        </DialogDescription>
                    </DialogHeader>

                    {sessionToRevoke && (
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const DeviceIcon = DEVICE_ICONS[sessionToRevoke.deviceType]
                                    return <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                                })()}
                                <div>
                                    <p className="font-medium">{sessionToRevoke.deviceName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatLocation(sessionToRevoke.location)} • Last active{" "}
                                        {formatRelativeTime(sessionToRevoke.lastActive)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => sessionToRevoke && handleRevokeSession(sessionToRevoke)}
                            disabled={isRevoking === sessionToRevoke?.id}
                        >
                            {isRevoking === sessionToRevoke?.id ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Signing out...
                                </>
                            ) : (
                                <>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign out device
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revoke all confirmation */}
            <Dialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Sign out all other devices?
                        </DialogTitle>
                        <DialogDescription>
                            This will immediately sign out {otherSessions.length} other session
                            {otherSessions.length !== 1 ? "s" : ""}. Those devices will need to sign in again.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-lg border bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground mb-2">This will sign out:</p>
                        <ul className="space-y-1">
                            {otherSessions.slice(0, 5).map(session => (
                                <li key={session.id} className="text-sm flex items-center gap-2">
                                    {(() => {
                                        const DeviceIcon = DEVICE_ICONS[session.deviceType]
                                        return <DeviceIcon className="h-3 w-3 text-muted-foreground" />
                                    })()}
                                    {session.deviceName}
                                </li>
                            ))}
                            {otherSessions.length > 5 && (
                                <li className="text-sm text-muted-foreground">
                                    ...and {otherSessions.length - 5} more
                                </li>
                            )}
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRevokeAllDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRevokeAllSessions}
                            disabled={isRevokingAll}
                        >
                            {isRevokingAll ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Signing out...
                                </>
                            ) : (
                                <>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign out all
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default SessionManagement
