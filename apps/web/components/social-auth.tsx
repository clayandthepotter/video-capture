"use client";

import { useEffect } from "react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.12 0-5.77-2.1-6.71-4.94H1.29v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.29a12 12 0 0 0 0 10.78z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.61l4 3.1C6.23 6.87 8.88 4.77 12 4.77z"
      />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.34.96.11-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.15c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function SocialAuth() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    if (!authError) return;
    setError(
      authError === "account_not_linked"
        ? "That email already has a Capca account. Try Google again and we will link it automatically."
        : "Sign in failed. Try again or use another sign-in method.",
    );
  }, []);

  async function social(provider: "google" | "github") {
    setBusy(provider);
    setError(null);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/dashboard",
      newUserCallbackURL: "/dashboard",
      errorCallbackURL: "/login",
    });
    if (error) {
      setBusy(null);
      setError(error.message ?? `${provider} sign-in failed`);
    }
    // On success the browser navigates to the provider; no state reset is needed.
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void social("google")}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
        >
          <GoogleLogo />
          {busy === "google" ? "Redirecting..." : "Google"}
        </button>
        <button
          type="button"
          onClick={() => void social("github")}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
        >
          <GitHubLogo />
          {busy === "github" ? "Redirecting..." : "GitHub"}
        </button>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-medium text-zinc-500">or with email</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>
    </div>
  );
}
