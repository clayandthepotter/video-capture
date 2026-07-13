import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_CAPCA_QUOTA_BYTES, recording, userSettings } from "@/lib/db/schema";
import { Library } from "./library";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [rows, [settings]] = await Promise.all([
    db
      .select()
      .from(recording)
      .where(eq(recording.userId, session.user.id))
      .orderBy(desc(recording.createdAt)),
    db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)),
  ]);

  const capcaReady = rows.filter(
    (r) => r.status === "ready" && r.destination === "capca",
  );
  const usageBytes = capcaReady.reduce((sum, r) => sum + (r.sizeBytes ?? 0), 0);
  const quotaBytes = settings?.capcaQuotaBytes ?? DEFAULT_CAPCA_QUOTA_BYTES;
  const usageGB = (usageBytes / (1024 * 1024 * 1024)).toFixed(2);
  const quotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(0);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Library
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
            {session.user.name
              ? `${session.user.name.split(" ")[0]}'s recordings`
              : "My recordings"}
          </h1>
        </div>
        <Link
          href="/record"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          New recording
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Recordings"
          value={String(rows.length)}
          hint={
            rows.length !== rows.filter((r) => r.status === "ready").length
              ? `${rows.length - rows.filter((r) => r.status === "ready").length} with incomplete uploads`
              : undefined
          }
        />
        <StatCard
          label="Capca Cloud storage"
          value={`${usageGB} / ${quotaGB} GB`}
          hint="Free tier — connect Drive for unlimited"
        />
        <StatCard
          label="Default destination"
          value={
            settings?.defaultDestination === "drive"
              ? "Google Drive"
              : settings?.defaultDestination === "local"
                ? "This device"
                : "Capca Cloud"
          }
          hint="Change in Settings → Configuration"
        />
      </div>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-10 text-center">
          <p className="text-lg font-semibold text-zinc-950">
            Record your first video
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            Install the Capca extension, click its toolbar icon on any page,
            and press record. Your recording uploads automatically and the
            share link lands here.
          </p>
          <Link
            href="/record"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Set up recording
          </Link>
        </section>
      ) : (
        <Library recordings={rows} />
      )}
    </main>
  );
}
