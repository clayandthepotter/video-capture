import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recording } from "@/lib/db/schema";
import { getObjectForPlayback, objectKey } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

// Public by design: anyone with the share link can watch (Loom's unlisted model).
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const [row] = await db
    .select()
    .from(recording)
    .where(eq(recording.id, id));

  // Share links only exist for Capca Cloud recordings — Drive and local
  // recordings have no server-side copy for us to serve.
  if (!row || row.status !== "ready" || row.destination !== "capca") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const requestedRange = req.headers.get("range");
  const range = requestedRange?.startsWith("bytes=") ? requestedRange : null;

  try {
    const object = await getObjectForPlayback(objectKey(id, row.mimeType), range);
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Content-Type": object.contentType || row.mimeType,
    });
    if (object.contentLength != null) {
      headers.set("Content-Length", String(object.contentLength));
    }
    if (object.contentRange) {
      headers.set("Content-Range", object.contentRange);
    }
    if (object.etag) {
      headers.set("ETag", object.etag);
    }
    if (object.lastModified) {
      headers.set("Last-Modified", object.lastModified.toUTCString());
    }

    return new Response(object.body, {
      status: object.contentRange ? 206 : 200,
      headers,
    });
  } catch (err) {
    console.error("[capca] media playback fetch failed", {
      recordingId: id,
      range,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "media_unavailable" },
      { status: 502 },
    );
  }
}
