import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildDriveConsentUrl, isDriveConfigured } from "@/lib/google-drive";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: "Google Drive is not configured on this server yet" },
      { status: 503 },
    );
  }

  const redirectUri = new URL("/api/drive/callback", req.url).toString();
  const url = buildDriveConsentUrl(redirectUri, session.user.id);
  return NextResponse.redirect(url);
}
