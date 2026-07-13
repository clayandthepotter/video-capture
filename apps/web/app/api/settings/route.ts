import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DESTINATIONS, userSettings } from "@/lib/db/schema";
import { getCapcaCloudUsageBytes } from "@/lib/storage";

async function ensureSettings(userId: string) {
  const [existing] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  if (existing) return existing;
  const [created] = await db
    .insert(userSettings)
    .values({ userId })
    .returning();
  return created;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await ensureSettings(session.user.id);
  const usageBytes = await getCapcaCloudUsageBytes(session.user.id);

  return NextResponse.json({
    defaultDestination: settings.defaultDestination,
    capcaQuotaBytes: settings.capcaQuotaBytes,
    capcaUsageBytes: usageBytes,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (!DESTINATIONS.includes(body.defaultDestination)) {
    return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
  }

  await ensureSettings(session.user.id);
  await db
    .update(userSettings)
    .set({ defaultDestination: body.defaultDestination, updatedAt: new Date() })
    .where(eq(userSettings.userId, session.user.id));

  return NextResponse.json({ ok: true });
}
