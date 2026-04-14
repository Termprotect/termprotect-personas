import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/modules/Sidebar";
import Topbar from "@/components/modules/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Barra lateral */}
      <Sidebar role={session.user.role} />

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar
          nombres={session.user.nombres}
          apellidos={session.user.apellidos}
          role={session.user.role}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
