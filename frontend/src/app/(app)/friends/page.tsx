"use client"

import { Header } from "@/components/common/header"
import { FriendInvitationWithDelete } from "@/components/friends/friend-invitation-with-delete"

export default function FriendsPage() {
  return (
    <>
      <Header title="Friends" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FriendInvitationWithDelete />
      </div>
    </>
  )
}