"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DirectMessages } from "./direct-messages"
import { GroupChatSimpleDelete } from "./group-chat-simple-delete"
import { MessageSquare, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChatInterface() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("groups")

  useEffect(() => {
    const dm = searchParams.get("dm")
    if (dm) setActiveTab("direct")
  }, [searchParams])

  return (
    <div className="h-full min-h-[420px] space-y-4">
      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setActiveTab("groups")}
          className={`
            px-6 py-3 h-auto transition-all duration-200 
            hover:shadow-lg hover:shadow-primary/20 hover:scale-105
            ${activeTab === "groups" 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
              : "bg-background/50 hover:bg-background/80"
            }
          `}
        >
          <Users className="h-5 w-5 mr-2" />
          Group Chats
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setActiveTab("direct")}
          className={`
            px-6 py-3 h-auto transition-all duration-200 
            hover:shadow-lg hover:shadow-primary/20 hover:scale-105
            ${activeTab === "direct" 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
              : "bg-background/50 hover:bg-background/80"
            }
          `}
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          Direct Messages
        </Button>
      </div>

      {/* Content panels */}
      <div className="h-[calc(100%-6rem)]">
        {activeTab === "groups" ? (
          <GroupChatSimpleDelete />
        ) : (
          <DirectMessages />
        )}
      </div>
    </div>
  )
}