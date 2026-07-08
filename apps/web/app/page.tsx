import Link from "next/link";

const GITHUB_URL = "https://github.com/clayandthepotter/video-capture";

/* ---------- Inline icons (lucide-style, stroke) ---------- */

function Icon({
  d,
  className = "h-5 w-5",
}: {
  d: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {d}
    </svg>
  );
}

const icons = {
  video: (
    <>
      <path d="m16 13 5.2 3.1a.6.6 0 0 0 .8-.5V8.4a.6.6 0 0 0-.8-.5L16 11" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </>
  ),
  link: (
    <>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </>
  ),
  puzzle: (
    <path d="M19.4 14.5a1.9 1.9 0 0 0 0-2.9l-1-.9a2 2 0 0 1 0-3l.4-.4a2 2 0 0 0-2.8-2.8l-.4.4a2 2 0 0 1-3 0l-.9-1a1.9 1.9 0 0 0-2.9 0l-.9 1a2 2 0 0 1-3 0l-.3-.4A2 2 0 1 0 1.7 7.3l.4.4a2 2 0 0 1 0 3l-1 .9a1.9 1.9 0 0 0 0 2.9l1 .9a2 2 0 0 1 0 3l-.4.3a2 2 0 1 0 2.9 2.9l.3-.4a2 2 0 0 1 3 0l.9 1a1.9 1.9 0 0 0 2.9 0l.9-1a2 2 0 0 1 3 0l.4.4a2 2 0 0 0 2.8-2.9l-.4-.3a2 2 0 0 1 0-3z" />
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </>
  ),
  shield: (
    <path d="M20 13c0 5-3.5 7.5-7.7 9a.6.6 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
  ),
  code: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  x: (
    <>
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </>
  ),
  github: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.34.96.11-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.15c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
    />
  ),
};

/* ---------- Small building blocks ---------- */

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
      {children}
    </p>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-950" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">Capca</span>
    </span>
  );
}

/* ---------- Page sections ---------- */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0b]/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href="/">
            <Logo />
          </Link>
          <div className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <a href="#product" className="transition hover:text-zinc-100">
              Product
            </a>
            <a href="#compare" className="transition hover:text-zinc-100">
              Compare
            </a>
            <a href="#open-source" className="transition hover:text-zinc-100">
              Open source
            </a>
            <a href="#faq" className="transition hover:text-zinc-100">
              FAQ
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={GITHUB_URL}
            className="hidden p-2 text-zinc-400 transition hover:text-zinc-100 sm:block"
            aria-label="GitHub repository"
          >
            <Icon d={icons.github} className="h-5 w-5" />
          </a>
          <Link
            href="/login"
            className="hidden px-3 py-2 text-sm font-medium text-zinc-300 transition hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/record"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Start recording
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto mt-16 w-full max-w-4xl">
      <div
        className="pointer-events-none absolute -inset-x-20 -top-24 h-[26rem] opacity-60"
        style={{
          background:
            "radial-gradient(600px 240px at 50% 20%, rgba(16,185,129,0.14), transparent 70%)",
        }}
      />
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#101012] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)]">
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <div className="mx-auto flex h-6 w-72 items-center justify-center gap-2 rounded-md bg-white/[0.05] text-[11px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            app.yourcompany.com/dashboard
          </div>
          <span className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            2:14
          </span>
        </div>
        {/* captured content */}
        <div className="relative grid grid-cols-[180px_1fr] gap-0">
          <div className="hidden border-r border-white/[0.06] p-4 sm:block">
            <div className="h-2 w-16 rounded bg-white/10" />
            <div className="mt-4 space-y-2.5">
              {[20, 24, 16, 22, 18].map((w, i) => (
                <div
                  key={i}
                  className="h-2 rounded bg-white/[0.05]"
                  style={{ width: `${w * 4}px` }}
                />
              ))}
            </div>
          </div>
          <div className="p-6">
            <div className="h-3 w-48 rounded bg-white/10" />
            <div className="mt-2 h-2 w-72 rounded bg-white/[0.05]" />
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <div className="h-2 w-12 rounded bg-white/10" />
                  <div className="mt-2 h-4 w-16 rounded bg-emerald-500/20" />
                </div>
              ))}
            </div>
            <div className="mt-4 h-28 rounded-lg border border-white/[0.06] bg-gradient-to-tr from-emerald-500/[0.07] to-transparent" />
          </div>
          {/* camera bubble */}
          <div className="absolute bottom-5 left-5 h-20 w-20 rounded-full border-2 border-white/80 bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-2xl sm:h-24 sm:w-24">
            <svg
              viewBox="0 0 24 24"
              className="h-full w-full p-4 text-zinc-400"
              fill="currentColor"
              aria-hidden
            >
              <circle cx="12" cy="9" r="4" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
            </svg>
          </div>
          {/* share toast */}
          <div className="absolute bottom-5 right-5 hidden items-center gap-3 rounded-lg border border-white/[0.08] bg-[#17171a] px-4 py-3 shadow-2xl sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
              <Icon d={icons.link} className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-medium text-zinc-200">
                Link copied to clipboard
              </p>
              <p className="text-[11px] text-zinc-500">capca.app/s/xK2mPq…</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-20 sm:pt-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
        style={{
          background:
            "radial-gradient(800px 400px at 50% -10%, rgba(16,185,129,0.08), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl text-center">
        <a
          href={GITHUB_URL}
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Open source video messaging — AGPL-3.0
        </a>
        <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[4.25rem]">
          Async video for teams that ship
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
          Record your screen with your camera and voice, then share a link
          instead of booking a meeting. Open source, self-hostable, and your
          recordings live in storage you control.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/record"
            className="rounded-lg bg-emerald-500 px-6 py-3 text-[15px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_8px_24px_-8px_rgba(16,185,129,0.5)] transition hover:bg-emerald-400"
          >
            Start recording — free
          </Link>
          <a
            href={GITHUB_URL}
            className="flex items-center gap-2 rounded-lg border border-white/[0.1] px-6 py-3 text-[15px] font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.03]"
          >
            <Icon d={icons.github} className="h-4 w-4" />
            View source
          </a>
        </div>
        <p className="mt-6 text-[13px] text-zinc-500">
          No install required · Works in your browser · Chrome extension
          available
        </p>
        <HeroMockup />
      </div>
    </section>
  );
}

const SPLIT_SECTIONS = [
  {
    overline: "Presence",
    title: "Your face on every explanation",
    body: "A camera bubble rides on top of whatever you're presenting and is composited directly into the recording — no post-production, no separate tracks to sync. Viewers see your screen and you, exactly as you presented it.",
    bullets: [
      "Draggable bubble, rendered into the final video",
      "Microphone and tab audio mixed automatically",
      "Chrome extension puts the bubble on any page",
    ],
    demo: (
      <div className="relative flex h-full min-h-[240px] items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent">
        <div className="h-3/4 w-4/5 rounded-lg border border-white/[0.08] bg-[#101012] p-4">
          <div className="h-2 w-1/2 rounded bg-white/10" />
          <div className="mt-2 h-2 w-2/3 rounded bg-white/[0.05]" />
          <div className="mt-2 h-2 w-1/3 rounded bg-white/[0.05]" />
        </div>
        <div className="absolute bottom-8 left-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/80 bg-gradient-to-br from-emerald-900/60 to-zinc-800 shadow-2xl">
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10 text-zinc-300"
            fill="currentColor"
            aria-hidden
          >
            <circle cx="12" cy="9" r="4" />
            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
          </svg>
        </div>
      </div>
    ),
  },
  {
    overline: "Velocity",
    title: "From “stop” to shared in seconds",
    body: "The moment you finish recording, Capca uploads your video and hands you an unlisted link. Paste it in Slack, a pull request, or a support ticket — anyone can watch instantly, no account required.",
    bullets: [
      "Unlisted share pages with a clean player",
      "Dashboard for every recording you've made",
      "Direct-to-bucket uploads — video never transits our servers",
    ],
    demo: (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-8">
        <div className="w-full max-w-sm rounded-lg border border-white/[0.08] bg-[#101012] p-4">
          <div className="flex aspect-video items-center justify-center rounded-md bg-gradient-to-br from-emerald-500/10 to-transparent">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="#09090b">
                <path d="M8 5.14v13.72L19 12z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="h-2 w-28 rounded bg-white/15" />
              <div className="mt-1.5 h-1.5 w-16 rounded bg-white/[0.07]" />
            </div>
            <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              Copy link
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    overline: "Ownership",
    title: "Your videos. Your bucket. Your rules.",
    body: "Point Capca at any S3-compatible storage — Cloudflare R2, AWS S3, MinIO — and every recording lands in infrastructure you control. Or self-host the entire platform with Docker and own the stack outright.",
    bullets: [
      "Works with R2, S3, MinIO, and anything S3-compatible",
      "Full self-hosting via docker compose",
      "AGPL-3.0 — the code stays open, forever",
    ],
    demo: (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-8">
        <div className="w-full max-w-sm overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c0c0e] font-mono text-[12.5px] leading-6">
          <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="ml-2 text-[11px] text-zinc-500">terminal</span>
          </div>
          <div className="p-4">
            <p className="text-zinc-500">
              <span className="text-emerald-400">$</span> git clone
              clayandthepotter/video-capture
            </p>
            <p className="text-zinc-500">
              <span className="text-emerald-400">$</span> docker compose up -d
            </p>
            <p className="mt-1 text-zinc-300">
              ✓ postgres <span className="text-zinc-600">— ready</span>
            </p>
            <p className="text-zinc-300">
              ✓ storage <span className="text-zinc-600">— ready</span>
            </p>
            <p className="text-zinc-300">
              ✓ capca{" "}
              <span className="text-zinc-600">— http://localhost:3000</span>
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

function ProductSections() {
  return (
    <section id="product" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl space-y-24 px-6 py-24">
        {SPLIT_SECTIONS.map((s, i) => (
          <div
            key={s.title}
            className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20"
          >
            <div className={i % 2 === 1 ? "lg:order-2" : ""}>
              <Overline>{s.overline}</Overline>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {s.title}
              </h2>
              <p className="mt-4 leading-relaxed text-zinc-400">{s.body}</p>
              <ul className="mt-6 space-y-3">
                {s.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                      <Icon d={icons.check} className="h-3 w-3" />
                    </span>
                    <span className="text-zinc-300">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={i % 2 === 1 ? "lg:order-1" : ""}>{s.demo}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const GRID_FEATURES = [
  {
    icon: icons.puzzle,
    title: "Chrome extension",
    body: "One click on any page. The camera bubble lives inside the page you're recording — exactly where your viewers need you.",
  },
  {
    icon: icons.video,
    title: "Screen, window, or tab",
    body: "Capture whatever scope the moment calls for, with tab audio when you need the sound too.",
  },
  {
    icon: icons.link,
    title: "Unlisted share links",
    body: "Every recording gets a clean, unlisted URL. Viewers don't need an account — they just press play.",
  },
  {
    icon: icons.database,
    title: "Bring your own storage",
    body: "R2, S3, MinIO — your call. Uploads go browser-to-bucket via presigned URLs; video bytes never touch our servers.",
  },
  {
    icon: icons.shield,
    title: "Private by default",
    body: "No trackers, no telemetry, no analytics scripts on your recordings. Delete a video and it's gone from your bucket.",
  },
  {
    icon: icons.code,
    title: "Open source",
    body: "AGPL-3.0 and built in public. Read the code, file issues, self-host, or ship a PR — the roadmap is yours too.",
  },
];

function FeatureGrid() {
  return (
    <section className="border-t border-white/[0.06] bg-white/[0.015]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <Overline>Platform</Overline>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built like infrastructure, not a gadget
          </h2>
          <p className="mt-4 leading-relaxed text-zinc-400">
            Everything a team needs to replace status meetings with two-minute
            videos — with none of the lock-in.
          </p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          {GRID_FEATURES.map((f) => (
            <div key={f.title} className="bg-[#0c0c0e] p-7">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-emerald-400">
                <Icon d={f.icon} className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const COMPARISON: [string, string | boolean, string | boolean][] = [
  ["Open source", true, false],
  ["Self-hostable", true, false],
  ["Recordings in your own storage", true, false],
  ["Screen + camera bubble recording", true, true],
  ["Instant share links", true, true],
  ["Watch without an account", true, true],
  ["Price", "Free — run it yourself", "Paid plans per user"],
];

function CompareCell({ v }: { v: string | boolean }) {
  if (typeof v === "string") {
    return <span className="text-sm text-zinc-300">{v}</span>;
  }
  return v ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
      <Icon d={icons.check} className="h-3.5 w-3.5" />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.05] text-zinc-600">
      <Icon d={icons.x} className="h-3.5 w-3.5" />
    </span>
  );
}

function Comparison() {
  return (
    <section id="compare" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-4xl px-6 py-24">
        <div className="text-center">
          <Overline>Compare</Overline>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you use Loom for, without the lock-in
          </h2>
        </div>
        <div className="mt-12 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[480px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-sm">
                <th className="px-6 py-4 font-medium text-zinc-500" />
                <th className="px-6 py-4">
                  <Logo />
                </th>
                <th className="px-6 py-4 font-semibold text-zinc-400">Loom</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([label, us, them]) => (
                <tr
                  key={label}
                  className="border-b border-white/[0.04] last:border-0"
                >
                  <td className="px-6 py-4 text-sm font-medium text-zinc-300">
                    {label}
                  </td>
                  <td className="px-6 py-4">
                    <CompareCell v={us} />
                  </td>
                  <td className="px-6 py-4">
                    <CompareCell v={them} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Is it really free?",
    a: "The software is free and open source under AGPL-3.0. Run it yourself and your only costs are your own hosting and storage. A managed cloud offering is on the roadmap for teams that don't want to operate infrastructure.",
  },
  {
    q: "Where do my recordings live?",
    a: "In whatever S3-compatible bucket you configure — Cloudflare R2, AWS S3, MinIO, and others. Uploads go directly from the browser to your bucket via presigned URLs, so video bytes never pass through the application server.",
  },
  {
    q: "Do viewers need an account?",
    a: "No. Share links are unlisted URLs anyone can watch. Only recording and managing videos requires an account.",
  },
  {
    q: "How does the camera bubble work?",
    a: "In the web recorder, your camera is composited into the recording in real time. With the Chrome extension, the bubble is placed inside the page you're recording, so it appears exactly where you positioned it — the same approach Loom uses.",
  },
  {
    q: "What's on the roadmap?",
    a: "Upload-while-recording for truly instant links, MP4 export and thumbnails, transcripts, comments on share pages, team workspaces, and a native desktop app for 4K capture with full system audio.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <Overline>FAQ</Overline>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Questions, answered
          </h2>
        </div>
        <div className="mt-12 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-zinc-500 transition group-open:rotate-45">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 pr-8 text-sm leading-relaxed text-zinc-400">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="open-source" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] px-8 py-16 text-center sm:px-16">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(500px 200px at 50% 0%, rgba(16,185,129,0.12), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Your next status meeting is a two-minute link
            </h2>
            <p className="mx-auto mt-4 max-w-md text-zinc-400">
              Record something right now — no install, no credit card, no sales
              call.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/record"
                className="rounded-lg bg-emerald-500 px-6 py-3 text-[15px] font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                Start recording
              </Link>
              <a
                href={GITHUB_URL}
                className="flex items-center gap-2 rounded-lg border border-white/[0.1] px-6 py-3 text-[15px] font-semibold text-zinc-200 transition hover:border-white/25"
              >
                <Icon d={icons.github} className="h-4 w-4" />
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col justify-between gap-10 sm:flex-row">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              Open source video messaging. Record, share, and own every byte.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12 text-sm sm:grid-cols-3">
            <div>
              <p className="font-medium text-zinc-300">Product</p>
              <ul className="mt-3 space-y-2.5 text-zinc-500">
                <li>
                  <Link href="/record" className="transition hover:text-zinc-200">
                    Recorder
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="transition hover:text-zinc-200"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <a href="#compare" className="transition hover:text-zinc-200">
                    Compare
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-zinc-300">Open source</p>
              <ul className="mt-3 space-y-2.5 text-zinc-500">
                <li>
                  <a href={GITHUB_URL} className="transition hover:text-zinc-200">
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href={`${GITHUB_URL}/blob/main/ARCHITECTURE.md`}
                    className="transition hover:text-zinc-200"
                  >
                    Architecture
                  </a>
                </li>
                <li>
                  <a
                    href={`${GITHUB_URL}/issues`}
                    className="transition hover:text-zinc-200"
                  >
                    Issues
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-zinc-300">Account</p>
              <ul className="mt-3 space-y-2.5 text-zinc-500">
                <li>
                  <Link href="/login" className="transition hover:text-zinc-200">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="transition hover:text-zinc-200">
                    Create account
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 text-[13px] text-zinc-600 sm:flex-row">
          <span>© {new Date().getFullYear()} Capca. Licensed AGPL-3.0.</span>
          <span>Built in the open, inspired by Cap.</span>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <ProductSections />
        <FeatureGrid />
        <Comparison />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
