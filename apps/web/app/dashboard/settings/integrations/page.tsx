import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { driveConnection } from "@/lib/db/schema";
import { isDriveConfigured } from "@/lib/google-drive";
import { DriveCard } from "./drive-card";

type Props = {
  searchParams: Promise<{ drive_connected?: string; drive_error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  denied: "You declined the Google Drive permission request.",
  invalid_request: "That connection link expired — try again.",
  no_refresh_token:
    "Google didn't return a refresh token — try disconnecting any prior Capca access in your Google Account and reconnecting.",
  connection_failed: "Couldn't complete the Google Drive connection. Try again.",
};

export default async function IntegrationsSettingsPage({ searchParams }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const params = await searchParams;

  const [conn] = await db
    .select()
    .from(driveConnection)
    .where(eq(driveConnection.userId, session.user.id));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
          Integrations
        </h1>
      </header>

      {params.drive_connected && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Google Drive connected.
        </div>
      )}
      {params.drive_error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {ERROR_MESSAGES[params.drive_error] ?? "Couldn't connect Google Drive."}
        </div>
      )}

      <DriveCard
        configured={isDriveConfigured()}
        connected={Boolean(conn)}
        folderName={conn?.folderName ?? null}
      />
    </main>
  );
}
