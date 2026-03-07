"use client"

import { Header } from "@/components/common/header"
import { FriendInvitationWithDelete } from "@/components/friends/friend-invitation-with-delete"

export default function FriendsPage() {
  return (
    <>
      <Header title="Friends" />
      <div className="flex flex-1 flex-col gap-3 sm:gap-4 py-2 sm:py-4">
        <FriendInvitationWithDelete />
      </div>
    </>
  )
}
