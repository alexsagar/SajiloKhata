import { AppLayout } from "@/components/common/app-layout"
import { Header } from "@/components/common/header"
import { ChatInterface } from "@/components/chat/chat-interface"

export default function ChatPage() {
  return (
    <AppLayout>
      <Header 
        title="Chat" 
        description="Communicate with your group members" 
      />
      <div className="flex flex-1 flex-col p-4">
        <ChatInterface />
      </div>
    </AppLayout>
  )
}