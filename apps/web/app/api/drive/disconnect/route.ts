import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { driveConnection } from "@/lib/db/schema";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await db
    .delete(driveConnection)
    .where(eq(driveConnection.userId, session.user.id));
  return NextResponse.json({ ok: true });
}
