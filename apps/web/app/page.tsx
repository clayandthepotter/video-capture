import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const GITHUB_URL = "https://github.com/clayandthepotter/capca";

function Icon({
  children,
  className = "h-5 w-5",
}: {
  children: React.ReactNode;
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
      {children}
    </svg>
  );
}

const icons = {
  screen: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  drive: (
    <>
      <path d="M8.2 4.5h7.6l5 8.7-3.8 6.3H7L3.2 13.2z" />
      <path d="m8.2 4.5 5.1 8.7" />
      <path d="M3.2 13.2h10.1" />
      <path d="m15.8 4.5-5 8.7" />
    </>
  ),
  link: (
    <>
      <path d="M9 17H7a5 5 0 0 1 0-10h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <path d="M8 12h8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  github: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.34.96.11-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.15c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
    />
  ),
};

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white shadow-sm">
        <span className="h-3 w-3 rounded-full border-2 border-white" />
      </span>
      <span className="text-[18px] font-semibold tracking-tight text-slate-950">
        Capca
      </span>
    </span>
  );
}

async function Header() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
        <Link href="/" aria-label="Capca home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#product" className="hover:text-slate-950">
            Product
          </a>
          <a href="#ownership" className="hover:text-slate-950">
            Ownership
          </a>
          <a href="#roadmap" className="hover:text-slate-950">
            Roadmap
          </a>
          <a href={GITHUB_URL} className="hover:text-slate-950">
            Open source
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={session ? "/dashboard" : "/login"}
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 sm:block"
          >
            {session ? "Dashboard" : "Sign in"}
          </Link>
          <Link
            href="/record"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Start recording
          </Link>
        </div>
      </nav>
    </header>
  );
}

function RecorderMockup() {
  const rows = [
    ["Screen", "Ready"],
    ["Camera", "On"],
    ["Microphone", "Ready"],
    ["Destination", "Google Drive"],
  ];

  return (
    <div className="relative mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Recorder</p>
            <p className="mt-1 text-xs text-slate-500">
              Check permissions before capture starts.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            Free with Drive
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-blue-600 shadow-sm">
                  <Icon className="h-4 w-4">
                    {label === "Destination" ? icons.drive : icons.screen}
                  </Icon>
                </span>
                <span className="text-sm font-medium text-slate-800">
                  {label}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-950">
                {value}
              </span>
            </div>
          ))}
        </div>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm">
          Start recording
          <Icon className="h-4 w-4">{icons.arrow}</Icon>
        </button>

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
            <span>Saving to Drive</span>
            <span>68%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-blue-100">
            <div className="h-2 w-[68%] rounded-full bg-blue-600" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.65)]">
        <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-slate-900 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <div className="ml-3 flex h-6 flex-1 items-center rounded-md bg-white/7 px-3 text-xs text-slate-400">
            app.capca.local/record
          </div>
        </div>
        <div className="relative min-h-[320px] p-5">
          <div className="grid h-full min-h-[280px] grid-cols-[160px_1fr] overflow-hidden rounded-lg border border-white/10 bg-slate-900">
            <div className="hidden border-r border-white/10 p-4 sm:block">
              <div className="h-2 w-20 rounded bg-white/20" />
              <div className="mt-5 space-y-3">
                <div className="h-2 w-24 rounded bg-white/10" />
                <div className="h-2 w-16 rounded bg-white/10" />
                <div className="h-2 w-28 rounded bg-white/10" />
              </div>
            </div>
            <div className="p-5">
              <div className="h-3 w-52 rounded bg-white/20" />
              <div className="mt-3 h-2 w-72 max-w-full rounded bg-white/10" />
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="h-2 w-12 rounded bg-white/20" />
                    <div className="mt-3 h-8 rounded bg-blue-400/20" />
                  </div>
                ))}
              </div>
              <div className="mt-4 h-24 rounded-lg border border-white/10 bg-white/[0.03]" />
            </div>
          </div>
          <div className="absolute bottom-8 left-8 h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-700 shadow-xl">
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-600 to-slate-800 text-slate-300">
              <svg viewBox="0 0 24 24" className="h-12 w-12" fill="currentColor">
                <circle cx="12" cy="9" r="4" />
                <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-8 right-8 rounded-lg border border-white/10 bg-white px-4 py-3 text-left shadow-xl">
            <p className="text-xs font-semibold text-slate-950">
              Recording saved
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Stored in Google Drive
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="px-5 pb-20 pt-20 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-7xl text-center">
        <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-7xl">
          Record. Own. Share.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Record your screen, save every video to your Google Drive, and share a
          polished link in seconds.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/record"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Start recording
          </Link>
          <a
            href={GITHUB_URL}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
          >
            <Icon className="h-4 w-4">{icons.github}</Icon>
            View source
          </a>
        </div>
        <p className="mt-5 text-sm text-slate-500">
          Unlimited free recordings when files are saved to your Drive. Paid
          tiers are for Capca-hosted storage, AI processing Capca pays for,
          teams, and automation.
        </p>
        <RecorderMockup />
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Record",
    body: "Start from the web app or extension. Capca shows screen, camera, microphone, and audio state before capture starts.",
    icon: icons.screen,
  },
  {
    title: "Save to Drive",
    body: "Your source video is uploaded to your Google Drive, not locked inside another storage silo.",
    icon: icons.drive,
  },
  {
    title: "Search later",
    body: "Transcripts, summaries, and action items turn recordings into useful knowledge when AI processing is enabled.",
    icon: icons.search,
  },
];

function ProductFlow() {
  return (
    <section id="product" className="border-y border-slate-200 bg-white px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            A recording workflow built around certainty.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Every step has a visible state, a clear next action, and a recovery
            path. Users should never wonder whether a recording is safe.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-6"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-blue-600 shadow-sm">
                <Icon className="h-5 w-5">{step.icon}</Icon>
              </span>
              <h3 className="mt-5 text-lg font-semibold text-slate-950">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ownership() {
  return (
    <section id="ownership" className="px-5 py-20 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Free stays generous because storage stays yours.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Capca's free tier should not punish people for recording more. When
            users bring Google Drive, they bring the storage and keep ownership
            of the source files.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Free with Drive", "Unlimited recordings and length, subject to browser and Drive limits."],
              ["Paid by Capca", "Hosted storage, streaming bandwidth, AI processing Capca pays for, teams, and automation."],
              ["Always clear", "The UI explains where files live and what actions may cost money."],
              ["Open source", "Self-hosters can bring their own storage and providers."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <Icon className="h-3 w-3">{icons.check}</Icon>
                  </span>
                  <h3 className="text-sm font-semibold text-slate-950">
                    {title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <section id="roadmap" className="border-t border-slate-200 bg-slate-950 px-5 py-20 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            The complete-product path.
          </h2>
          <p className="mt-4 leading-7 text-slate-300">
            Reliability comes before feature volume. The first milestones are
            capture state, Drive upload recovery, library clarity, and polished
            share pages.
          </p>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-4">
          {["Capture", "Drive", "Library", "Knowledge"].map((item, index) => (
            <div key={item} className="bg-slate-950 p-5">
              <p className="text-xs font-semibold text-blue-300">
                P{index}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{item}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {index === 0 &&
                  "Start, stop, repeat, recover, and explain browser limits clearly."}
                {index === 1 &&
                  "Connect Drive, create a folder, upload resumably, and show progress."}
                {index === 2 &&
                  "Search, filter, rename, share, delete metadata, and open source files."}
                {index === 3 &&
                  "Transcripts, summaries, chapters, action items, and searchable memory."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-5 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 text-sm text-slate-500 sm:flex-row">
        <div>
          <Logo />
          <p className="mt-3 max-w-md">
            Browser-first recording with user-owned storage and open-source
            foundations.
          </p>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="hover:text-slate-950">
            Dashboard
          </Link>
          <Link href="/privacy" className="hover:text-slate-950">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-950">
            Terms
          </Link>
          <a href={GITHUB_URL} className="hover:text-slate-950">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <Header />
      <main>
        <Hero />
        <ProductFlow />
        <Ownership />
        <Roadmap />
      </main>
      <Footer />
    </div>
  );
}
