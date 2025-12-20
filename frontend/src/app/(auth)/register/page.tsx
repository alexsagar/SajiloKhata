import { RegisterForm } from "@/components/auth/register-form"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { AuthShell } from "@/components/auth/auth-shell"

export default function RegisterPage() {
  return (
    <AuthShell>
      <div className="space-y-6 px-4 sm:px-0 max-w-md w-full mx-auto">
        <div className="text-center">
          <Image 
            src="/images/logo with text.png" 
            alt="SajiloKhata" 
            width={200} 
            height={80} 
            className="mx-auto mb-10 transform scale-105"
            priority
          />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create account</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Join SajiloKhata today</p>
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
          <p className="text-sm sm:text-base text-muted-foreground">
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
