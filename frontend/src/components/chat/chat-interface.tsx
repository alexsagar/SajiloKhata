"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DirectMessages } from "./direct-messages"
import { GroupChat } from "./group-chat"
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
    <div className="h-full min-h-[520px] space-y-3 sm:space-y-4">
      {/* Navigation Buttons */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
        <Button
          variant={activeTab === "groups" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("groups")}
          className={`
            h-10 transition-all duration-200
            ${activeTab === "groups" 
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          <Users className="h-4 w-4 mr-2" />
          Group Chats
        </Button>
        <Button
          variant={activeTab === "direct" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("direct")}
          className={`
            h-10 transition-all duration-200
            ${activeTab === "direct" 
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Direct Messages
        </Button>
      </div>

      {/* Content panels */}
      <div className="h-[calc(100%-3.25rem)] min-h-[420px]">
        {activeTab === "groups" ? (
          <GroupChat />
        ) : (
          <DirectMessages />
        )}
      </div>
    </div>
  )
}
