"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  BubbleState,
  CompositeRecorder,
  stopStream,
} from "@/lib/recorder";

type Phase = "idle" | "starting" | "recording" | "preview";
type UploadState = "idle" | "uploading" | "done" | "error";

const INITIAL_BUBBLE: BubbleState = { x: 0.14, y: 0.8, size: 0.28, visible: true };

export default function RecordPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [withCamera, setWithCamera] = useState(true);
  const [withMic, setWithMic] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Bubble position mirrored into React state so the DOM overlay re-renders on drag.
  const [bubblePos, setBubblePos] = useState({ x: INITIAL_BUBBLE.x, y: INITIAL_BUBBLE.y });

  const { data: session } = authClient.useSession();
  const bubbleRef = useRef<BubbleState>({ ...INITIAL_BUBBLE });
  const blobRef = useRef<Blob | null>(null);
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);
  const recorderRef = useRef<CompositeRecorder | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const screenPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStreams = useCallback(() => {
    stopStream(screenRef.current);
    stopStream(cameraRef.current);
    stopStream(micRef.current);
    screenRef.current = cameraRef.current = micRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupStreams();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cleanupStreams]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);

    const blob = await recorder.stop();
    cleanupStreams();
    blobRef.current = blob;
    durationRef.current = (Date.now() - startedAtRef.current) / 1000;
    setUploadState("idle");
    setShareUrl(null);
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setPhase("preview");
  }, [cleanupStreams]);

  const startRecording = useCallback(async () => {
    setError(null);
    setPhase("starting");
    try {
      // Ask for camera/mic first so permission prompts come before screen pick.
      if (withCamera || withMic) {
        const media = await navigator.mediaDevices.getUserMedia({
          video: withCamera ? { width: 1280, height: 720 } : false,
          audio: withMic
            ? { echoCancellation: true, noiseSuppression: true }
            : false,
        });
        if (withCamera) {
          cameraRef.current = new MediaStream(media.getVideoTracks());
        }
        if (withMic) {
          micRef.current = new MediaStream(media.getAudioTracks());
        }
      }

      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true, // tab/system audio when the user opts in via the picker
      });
      screenRef.current = screen;

      bubbleRef.current = {
        ...INITIAL_BUBBLE,
        x: bubblePos.x,
        y: bubblePos.y,
        visible: withCamera,
      };

      const recorder = new CompositeRecorder({
        screen,
        camera: cameraRef.current,
        mic: micRef.current,
        bubble: bubbleRef.current,
        onScreenEnded: () => void stopRecording(),
      });
      recorderRef.current = recorder;
      await recorder.start();

      if (screenPreviewRef.current) {
        screenPreviewRef.current.srcObject = screen;
      }
      if (cameraPreviewRef.current && cameraRef.current) {
        cameraPreviewRef.current.srcObject = cameraRef.current;
      }

      setElapsed(0);
      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      setPhase("recording");
    } catch (err) {
      cleanupStreams();
      recorderRef.current = null;
      setPhase("idle");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Permission denied — allow camera/mic/screen access to record.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [withCamera, withMic, bubblePos, stopRecording, cleanupStreams]);

  const onBubbleDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const box = previewBoxRef.current;
    if (!box) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      const rect = box.getBoundingClientRect();
      const x = Math.min(0.95, Math.max(0.05, (ev.clientX - rect.left) / rect.width));
      const y = Math.min(0.95, Math.max(0.05, (ev.clientY - rect.top) / rect.height));
      bubbleRef.current.x = x;
      bubbleRef.current.y = y;
      setBubblePos({ x, y });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, []);

  const uploadRecording = useCallback(async () => {
    const blob = blobRef.current;
    if (!blob) return;
    setUploadState("uploading");
    try {
      const createRes = await fetch("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || undefined, mimeType: blob.type }),
      });
      if (!createRes.ok) throw new Error(`Create failed (${createRes.status})`);
      const { id, uploadUrl, shareUrl } = await createRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      await fetch(`/api/recordings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sizeBytes: blob.size,
          durationSec: durationRef.current,
        }),
      });

      const absolute = `${window.location.origin}${shareUrl}`;
      setShareUrl(absolute);
      setUploadState("done");
      await navigator.clipboard.writeText(absolute).catch(() => {});
    } catch (err) {
      console.error(err);
      setUploadState("error");
    }
  }, [title]);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← video-capture
        </Link>
        {phase === "recording" && (
          <span className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {minutes}:{seconds}
          </span>
        )}
      </header>

      {phase === "idle" || phase === "starting" ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <h1 className="text-3xl font-bold">New recording</h1>
          <div className="flex gap-6 text-sm text-zinc-300">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={withCamera}
                onChange={(e) => setWithCamera(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Camera bubble
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={withMic}
                onChange={(e) => setWithMic(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Microphone
            </label>
          </div>
          <button
            onClick={startRecording}
            disabled={phase === "starting"}
            className="rounded-lg bg-emerald-500 px-8 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {phase === "starting" ? "Requesting permissions…" : "Start recording"}
          </button>
          <p className="max-w-md text-xs text-zinc-500">
            You&apos;ll be asked to pick a screen, window, or tab. Check
            &quot;share audio&quot; in the picker to capture tab/system sound.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </section>
      ) : null}

      {phase === "recording" && (
        <section className="flex flex-col gap-4">
          <div
            ref={previewBoxRef}
            className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
          >
            <video
              ref={screenPreviewRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain"
            />
            {withCamera && (
              <div
                onPointerDown={onBubbleDrag}
                className="absolute cursor-grab touch-none overflow-hidden rounded-full border-2 border-white/90 shadow-lg active:cursor-grabbing"
                style={{
                  width: "18%",
                  aspectRatio: "1",
                  left: `${bubblePos.x * 100}%`,
                  top: `${bubblePos.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <video
                  ref={cameraPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
          <p className="text-center text-xs text-zinc-500">
            Drag the bubble to reposition it — the recording follows.
          </p>
          <button
            onClick={() => void stopRecording()}
            className="mx-auto rounded-lg bg-red-500 px-8 py-3 font-semibold text-white transition hover:bg-red-400"
          >
            Stop recording
          </button>
        </section>
      )}

      {phase === "preview" && resultUrl && (
        <section className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">Your recording</h1>
          <video
            src={resultUrl}
            controls
            className="aspect-video w-full rounded-xl border border-zinc-800 bg-black"
          />

          {shareUrl ? (
            <div className="flex w-full max-w-lg items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-500/5 p-3">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-sm text-emerald-300 outline-none"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          ) : session ? (
            <div className="flex w-full max-w-lg flex-col gap-3">
              <input
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => void uploadRecording()}
                disabled={uploadState === "uploading"}
                className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {uploadState === "uploading"
                  ? "Uploading…"
                  : "Upload & get share link"}
              </button>
              {uploadState === "error" && (
                <p className="text-center text-sm text-red-400">
                  Upload failed — check that Postgres/MinIO are running, then try again.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              <Link href="/login" className="text-emerald-400 hover:underline">
                Sign in
              </Link>{" "}
              to upload and get a share link.
            </p>
          )}

          <div className="flex gap-4">
            <a
              href={resultUrl}
              download={`recording-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.webm`}
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500"
            >
              Download WebM
            </a>
            <button
              onClick={() => setPhase("idle")}
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500"
            >
              Record again
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
