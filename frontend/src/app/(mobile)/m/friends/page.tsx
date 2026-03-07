"use client"

import { MobileHeader } from "@/components/mobile/mobile-header"
import { FriendInvitationWithDelete } from "@/components/friends/friend-invitation-with-delete"

export default function MobileFriendsPage() {
    return (
        <>
            <MobileHeader title="Friends" showBack />
            <div className="flex flex-col gap-3 px-3 py-3">
                <FriendInvitationWithDelete />
            </div>
        </>
    )
}
