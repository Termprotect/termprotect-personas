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
    <div className="min-h-screen bg-page">
      <Sidebar role={role} nombres={nombres} apellidos={apellidos} />
      <div className="ml-[232px] flex flex-col min-h-screen">
        <Topbar nombres={nombres} apellidos={apellidos} role={role} />
        <main className="flex-1 px-[22px] pt-[22px] pb-[60px]">
          {children}
        </main>
      </div>
    </div>
  );
}
