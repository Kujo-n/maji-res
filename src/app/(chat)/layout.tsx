import { AuthGuard } from "@/components/auth/auth-guard";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden w-[200px] flex-col border-r md:flex lg:w-[250px]">
            <Sidebar className="h-full" />
          </aside>
          <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
