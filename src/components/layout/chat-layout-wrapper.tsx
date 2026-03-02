import { AuthGuard } from "@/components/auth/auth-guard";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatProvider } from "@/components/chat/chat-context";

export default function ChatLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ChatProvider>
        <div className="flex h-[100dvh] flex-col overflow-hidden">
          <Header />
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <aside className="hidden w-[200px] flex-col border-r md:flex lg:w-[250px] overflow-y-auto">
              <Sidebar className="h-full" />
            </aside>
            <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
          </div>
        </div>
      </ChatProvider>
    </AuthGuard>
  );
}
