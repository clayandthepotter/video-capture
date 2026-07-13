import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { driveConnection } from "@/lib/db/schema";
import { isDriveConfigured } from "@/lib/google-drive";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [conn] = await db
    .select()
    .from(driveConnection)
    .where(eq(driveConnection.userId, session.user.id));

  return NextResponse.json({
    configured: isDriveConfigured(),
    connected: Boolean(conn),
    folderName: conn?.folderName ?? null,
    connectedAt: conn?.connectedAt ?? null,
  });
}
