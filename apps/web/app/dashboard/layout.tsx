import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarNav } from "./sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-950">
            Capca
          </span>
        </Link>

        <SidebarNav />

        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-xs font-medium text-slate-500">
            {session.user.name}
          </p>
          <p className="truncate text-xs text-slate-400">{session.user.email}</p>
        </div>
      </aside>

      <div className="flex-1">{children}</div>
    </div>
  );
}
