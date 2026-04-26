import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={(session.user as Record<string, unknown>).role as string}
        subRole={(session.user as Record<string, unknown>).subRole as string | null}
        userName={session.user.name ?? undefined}
      />
      {/* Traveling scan line */}
      <div className="scan-line" />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top lightning bar */}
        <div className="w-full h-px shrink-0 lightning-top" style={{ zIndex: 10 }} />
        <main className="flex-1 overflow-y-auto p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
