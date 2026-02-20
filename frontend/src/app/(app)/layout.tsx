import { AppLayout } from "@/components/common/app-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function AppShellLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ProtectedRoute>
            <AppLayout>{children}</AppLayout>
        </ProtectedRoute>
    )
}
