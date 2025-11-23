import { RegisterForm } from "@/components/auth/register-form"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { AuthShell } from "@/components/auth/auth-shell"

export default function RegisterPage() {
  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center">
          <Image src="/images/logo.svg" alt="Khutrukey" width={80} height={80} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Create account</h1>
          <p className="text-muted-foreground">Join Khutrukey today</p>
        </div>

        <KanbanCard>
          <KanbanCardHeader>
            <KanbanCardTitle>Sign Up</KanbanCardTitle>
            <KanbanCardDescription>Create your account to start splitting expenses</KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent>
            <RegisterForm />
          </KanbanCardContent>
        </KanbanCard>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" asChild className="p-0">
              <Link href="/login">Sign in</Link>
            </Button>
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
