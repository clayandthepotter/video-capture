"use client";

import { useMemo, useState } from "react";

type Destination = "capca" | "drive" | "local";
type Phase = "ready" | "recording" | "paused" | "uploading" | "saved";

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
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  camera: (
    <>
      <path d="m16 13 5.2 3.1a.6.6 0 0 0 .8-.5V8.4a.6.6 0 0 0-.8-.5L16 11" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  drive: (
    <>
      <path d="M8.2 4.5h7.6l5 8.7-3.8 6.3H7L3.2 13.2z" />
      <path d="m8.2 4.5 5.1 8.7" />
      <path d="M3.2 13.2h10.1" />
      <path d="m15.8 4.5-5 8.7" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  screen: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />,
};

const DESTINATION_LABEL: Record<Destination, string> = {
  capca: "Capca Cloud",
  drive: "Google Drive",
  local: "This device",
};

function Row({
  icon,
  label,
  value,
  onClick,
  off = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  off?: boolean;
}) {
  const content = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-blue-600 shadow-sm">
        <Icon className="h-5 w-5">{icon}</Icon>
      </span>
      <span className="flex-1 text-left text-sm font-semibold text-slate-700">
        {label}
      </span>
      <span
        className={`text-sm font-bold ${off ? "text-slate-400" : "text-slate-950"}`}
      >
        {value}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-[62px] w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition hover:bg-slate-100"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex h-[62px] w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4">
      {content}
    </div>
  );
}

function BrowserPreview({
  cameraOn,
  controlsVisible,
  phase,
}: {
  cameraOn: boolean;
  controlsVisible: boolean;
  phase: Phase;
}) {
  return (
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

        {cameraOn && (
          <div className="absolute bottom-8 left-8 grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-white bg-slate-700 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-slate-800" />
            <svg
              viewBox="0 0 24 24"
              className="relative h-12 w-12 text-slate-300"
              fill="currentColor"
              aria-hidden
            >
              <circle cx="12" cy="9" r="4" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
            </svg>
          </div>
        )}

        {controlsVisible && (
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-white shadow-2xl backdrop-blur">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-white" />
            </span>
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold">
              {phase === "recording" ? "0:07" : phase === "paused" ? "Paused" : "Ready"}
            </span>
            <span className="h-6 w-px bg-white/15" />
            <Icon className="h-4 w-4">{phase === "paused" ? icons.play : icons.pause}</Icon>
            <Icon className="h-4 w-4">{icons.mic}</Icon>
            <Icon className="h-4 w-4">{icons.camera}</Icon>
          </div>
        )}

        {phase === "saved" && (
          <div className="absolute bottom-8 right-8 rounded-lg border border-white/10 bg-white px-4 py-3 text-left shadow-xl">
            <p className="text-xs font-semibold text-slate-950">
              Recording saved
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Stored in Google Drive
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MarketingRecorderWidget() {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [keepLocal, setKeepLocal] = useState(false);
  const [destination, setDestination] = useState<Destination>("capca");
  const [menuOpen, setMenuOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");

  const badge = useMemo(() => {
    if (destination === "drive") return "Free with Drive";
    if (destination === "local") return "Saved to your device";
    return "0.0 of 5.0 GB used";
  }, [destination]);

  const primaryLabel =
    phase === "recording" || phase === "paused"
      ? "Stop recording"
      : phase === "saved"
        ? "Start another"
        : "Start recording";

  function primaryAction() {
    if (phase === "recording" || phase === "paused") {
      setPhase("uploading");
      window.setTimeout(() => setPhase("saved"), 800);
      return;
    }
    setPhase("recording");
    setControlsVisible(true);
  }

  return (
    <div className="relative mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="rounded-[18px] border border-slate-200 bg-white p-5 text-left shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)]">
        <header className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600">
            <span className="h-3 w-3 rounded-full border-2 border-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-slate-950">
              Capca
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {phase === "recording"
                ? "Recording"
                : phase === "paused"
                  ? "Paused"
                  : phase === "uploading"
                    ? "Uploading in background"
                    : "Ready to record"}
            </p>
          </div>
          <span className="max-w-[150px] truncate rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            {badge}
          </span>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close preview"
          >
            <Icon className="h-4 w-4">{icons.close}</Icon>
          </button>
        </header>

        <div className="space-y-3">
          <Row icon={icons.screen} label="Screen" value={phase === "recording" ? "Recording" : "Ready"} />
          <Row
            icon={icons.mic}
            label="Microphone"
            value={micOn ? "On" : "Off"}
            off={!micOn}
            onClick={() => setMicOn((value) => !value)}
          />
          <Row
            icon={icons.camera}
            label="Camera"
            value={cameraOn ? "On" : "Off"}
            off={!cameraOn}
            onClick={() => setCameraOn((value) => !value)}
          />
          <div className="flex h-[62px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-blue-600 shadow-sm">
              <Icon>{icons.drive}</Icon>
            </span>
            <span className="flex-1 text-sm font-semibold text-slate-700">
              Destination
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="inline-flex min-w-[150px] items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-bold text-slate-950 transition hover:bg-blue-50"
                aria-expanded={menuOpen}
                aria-haspopup="listbox"
              >
                <span>{DESTINATION_LABEL[destination]}</span>
                <Icon className="h-4 w-4 text-slate-500">{icons.chevron}</Icon>
              </button>
              {menuOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 top-[calc(100%+8px)] z-20 grid min-w-[190px] gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl"
                >
                  {(Object.keys(DESTINATION_LABEL) as Destination[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={destination === item}
                      onClick={() => {
                        setDestination(item);
                        setMenuOpen(false);
                      }}
                      className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                        destination === item
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {DESTINATION_LABEL[item]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-zinc-800">
          <input
            type="checkbox"
            checked={keepLocal}
            onChange={(event) => setKeepLocal(event.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          <span>Always save a local copy</span>
        </label>

        <p className="mt-3 truncate text-xs font-bold text-slate-500">
          Signed in as: Alex Rivera
        </p>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={primaryAction}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition ${
              phase === "recording" || phase === "paused"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {phase === "recording" || phase === "paused" ? (
              <Icon className="h-4 w-4">{icons.stop}</Icon>
            ) : null}
            <span>{primaryLabel}</span>
            {phase !== "recording" && phase !== "paused" ? (
              <Icon className="h-4 w-4">{icons.arrow}</Icon>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setControlsVisible((value) => !value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-zinc-900 transition hover:border-slate-400"
          >
            {controlsVisible ? "Hide controls" : "Show controls"}
          </button>
        </div>

        {(phase === "recording" || phase === "paused") && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setPhase((value) => (value === "paused" ? "recording" : "paused"))
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              <Icon className="h-4 w-4">{phase === "paused" ? icons.play : icons.pause}</Icon>
              {phase === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => setPhase("saved")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              Finish
            </button>
          </div>
        )}

        {phase === "uploading" && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <span>Saving to {DESTINATION_LABEL[destination]}</span>
              <span>68%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
              <div className="h-2 w-[68%] rounded-full bg-blue-600" />
            </div>
          </div>
        )}
      </section>

      <BrowserPreview cameraOn={cameraOn} controlsVisible={controlsVisible} phase={phase} />
    </div>
  );
}
