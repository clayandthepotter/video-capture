/**
 * Google Drive integration: OAuth (separate consent from sign-in, since it
 * requests the drive.file scope) plus resumable-upload session creation.
 * Activates only once GOOGLE_CLIENT_ID/SECRET are set — same pattern as the
 * social sign-in providers in lib/auth.ts.
 */

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DEFAULT_FOLDER_NAME = "Capca Recordings";

export function isDriveConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function requireCreds() {
  if (!isDriveConfigured()) {
    throw new Error("Google Drive is not configured on this server");
  }
  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  };
}

export function buildDriveConsentUrl(redirectUri: string, state: string) {
  const { clientId } = requireCreds();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent", // force a refresh_token even on repeat connects
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeDriveCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = requireCreds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Drive token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresInSec: data.expires_in as number,
  };
}

export async function refreshDriveAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = requireCreds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Drive token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    expiresInSec: data.expires_in as number,
  };
}

/** Finds "Capca Recordings" in the user's Drive, creating it if absent. */
export async function ensureCapcaFolder(accessToken: string) {
  const q = encodeURIComponent(
    `name = '${DEFAULT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!search.ok) {
    throw new Error(`Drive folder search failed: ${search.status}`);
  }
  const found = await search.json();
  if (found.files?.[0]?.id) {
    return { id: found.files[0].id as string, name: DEFAULT_FOLDER_NAME };
  }

  const create = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: DEFAULT_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!create.ok) {
    throw new Error(`Drive folder creation failed: ${create.status}`);
  }
  const created = await create.json();
  return { id: created.id as string, name: DEFAULT_FOLDER_NAME };
}

/**
 * Starts a resumable upload session. The returned URL accepts direct
 * browser PUTs with Content-Range headers — Drive's resumable endpoint sets
 * permissive CORS, so the extension can stream chunks to it without our
 * server ever seeing the video bytes (same shape as our S3 presigned parts).
 */
export async function createResumableUploadSession(
  accessToken: string,
  folderId: string,
  filename: string,
  mimeType: string,
) {
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
      },
      body: JSON.stringify({ name: filename, parents: [folderId] }),
    },
  );
  if (!res.ok) {
    throw new Error(`Drive resumable session failed: ${res.status} ${await res.text()}`);
  }
  const sessionUrl = res.headers.get("Location");
  if (!sessionUrl) throw new Error("Drive did not return a resumable session URL");
  return sessionUrl;
}
