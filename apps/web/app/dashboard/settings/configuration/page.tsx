import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_CAPCA_QUOTA_BYTES, driveConnection, userSettings } from "@/lib/db/schema";
import { getCapcaCloudUsageBytes } from "@/lib/storage";
import { DestinationForm } from "./destination-form";

export default async function ConfigurationSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [[settings], [conn], usageBytes] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)),
    db
      .select()
      .from(driveConnection)
      .where(eq(driveConnection.userId, session.user.id)),
    getCapcaCloudUsageBytes(session.user.id),
  ]);

  const quotaBytes = settings?.capcaQuotaBytes ?? DEFAULT_CAPCA_QUOTA_BYTES;
  const pct = Math.min(100, Math.round((usageBytes / quotaBytes) * 100));
  const usageGB = (usageBytes / (1024 * 1024 * 1024)).toFixed(2);
  const quotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(0);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
          Configuration
        </h1>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-950">
          Default recording destination
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Where new recordings from the extension go by default.
        </p>
        <div className="mt-4">
          <DestinationForm
            defaultDestination={settings?.defaultDestination ?? "capca"}
            driveConnected={Boolean(conn)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-950">
            Capca Cloud storage
          </h2>
          <span className="text-sm font-semibold text-zinc-950">
            {usageGB} / {quotaGB} GB
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-blue-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Free tier includes {quotaGB} GB on Capca Cloud. Connect Google Drive
          in Integrations for unlimited storage — Drive and local recordings
          never count against this quota.
        </p>
      </section>
    </main>
  );
}
