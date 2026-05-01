import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/modules/Sidebar";
import Topbar from "@/components/modules/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }

  if (!session?.user) redirect("/login");

  const role = session.user.role ?? "EMPLEADO";
  const nombres = session.user.nombres ?? "";
  const apellidos = session.user.apellidos ?? "";

  return (
    <div className="flex h-screen bg-secondary overflow-hidden">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar nombres={nombres} apellidos={apellidos} role={role} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
