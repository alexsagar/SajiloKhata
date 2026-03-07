import { ProtectedRoute } from "@/components/auth/protected-route"
import { MobileShell } from "@/components/mobile/mobile-shell"

export default function MobileLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ProtectedRoute>
            <MobileShell>{children}</MobileShell>
        </ProtectedRoute>
    )
}
