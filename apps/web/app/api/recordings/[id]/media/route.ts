import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";
import { objectKey, presignDownload } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

// Public by design: anyone with the share link can watch (Loom's unlisted model).
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const [row] = await db
    .select()
    .from(recording)
    .where(eq(recording.id, id));

  if (!row || row.status !== "ready") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(
    await presignDownload(objectKey(id, row.mimeType)),
    302,
  );
}
