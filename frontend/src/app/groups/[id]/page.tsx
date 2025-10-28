import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { GroupBalance } from "@/components/groups/group-balance"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Settings, Users } from "lucide-react"
import Link from "next/link"
import { GroupPageClient } from "./group-page-client"

interface GroupPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { id } = await params

  return (
    <ProtectedRoute>
      <GroupPageClient groupId={id} />
    </ProtectedRoute>
  )
}
