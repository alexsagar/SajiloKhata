import { LoginForm } from "@/components/auth/login-form"
import { SocialLoginButtons, LoginDivider } from "@/components/auth/social-login-buttons"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { AuthShell } from "@/components/auth/auth-shell"

export default function LoginPage() {
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Sign in to your account</p>
        </div>

        <KanbanCard>
          <KanbanCardHeader>
            <KanbanCardTitle>Sign In</KanbanCardTitle>
            <KanbanCardDescription>Choose your preferred sign in method</KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent>
            {/* Social Login Options */}
            <SocialLoginButtons />
            
            {/* Divider */}
            <LoginDivider />
            
            {/* Email/Password Login */}
            <LoginForm />
          </KanbanCardContent>
        </KanbanCard>

        <div className="text-center">
          <p className="text-sm sm:text-base text-muted-foreground">
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
