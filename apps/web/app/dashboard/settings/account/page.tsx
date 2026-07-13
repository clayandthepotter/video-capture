import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "../sign-out-button";

export default async function AccountSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
          Account
        </h1>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <dl className="divide-y divide-zinc-100">
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm font-medium text-zinc-500">Name</dt>
            <dd className="text-sm font-semibold text-zinc-950">
              {session.user.name}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm font-medium text-zinc-500">Email</dt>
            <dd className="text-sm font-semibold text-zinc-950">
              {session.user.email}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm font-medium text-zinc-500">Member since</dt>
            <dd className="text-sm font-semibold text-zinc-950">
              {new Date(session.user.createdAt).toLocaleDateString(undefined, {
                dateStyle: "long",
              })}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-red-100 bg-red-50/40 p-6">
        <h2 className="text-sm font-semibold text-zinc-950">Sign out</h2>
        <p className="mt-1 text-sm text-zinc-600">
          You&apos;ll need to sign in again to record or view your library.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
