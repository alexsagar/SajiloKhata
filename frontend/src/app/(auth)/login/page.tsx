import { LoginForm } from "@/components/auth/login-form"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { AuthShell } from "@/components/auth/auth-shell"

export default function LoginPage() {
  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center">
          <Image src="/images/logo.svg" alt="Khutrukey" width={150} height={150} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <KanbanCard>
          <KanbanCardHeader>
            <KanbanCardTitle>Sign In</KanbanCardTitle>
            <KanbanCardDescription>Enter your email and password to access your account</KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent>
            <LoginForm />
          </KanbanCardContent>
        </KanbanCard>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Button variant="link" asChild className="p-0">
              <Link href="/register">Sign up</Link>
            </Button>
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
