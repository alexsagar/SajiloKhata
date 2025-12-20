"use client"

import { useSession, signOut } from "next-auth/react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User } from "lucide-react"
import Link from "next/link"
import { getInitials } from "@/lib/utils"

/**
 * User Auth Menu Component
 * 
 * Shows user avatar with dropdown menu for:
 * - Profile link
 * - Settings link
 * - Sign out (handles both OAuth and email auth)
 */
export function UserAuthMenu() {
  const { data: session } = useSession()
  const { user: authUser, logout: authLogout, isAuthenticated } = useAuth()

  // Get user from either auth system
  const user = authUser || (session?.user ? {
    firstName: session.user.name?.split(" ")[0] || "",
    lastName: session.user.name?.split(" ").slice(1).join(" ") || "",
    email: session.user.email || "",
    avatar: session.user.image || "",
  } : null)

  const isLoggedIn = isAuthenticated || !!session?.user

  if (!isLoggedIn || !user) {
    return (
      <Button variant="outline" asChild>
        <Link href="/login">Sign In</Link>
      </Button>
    )
  }

  const handleSignOut = async () => {
    // Sign out from custom auth
    if (isAuthenticated) {
      await authLogout()
    }
    
    // Sign out from NextAuth
    if (session) {
      await signOut({ callbackUrl: "/login" })
    }
  }

  const initials = getInitials(user.firstName, user.lastName)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
            <AvatarFallback className="bg-emerald-500/20 text-emerald-400">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-400 focus:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
