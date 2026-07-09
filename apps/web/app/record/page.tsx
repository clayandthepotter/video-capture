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
  const [pipOpen, setPipOpen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  // What the user chose in the picker: "monitor" | "window" | "browser" (tab)
  const [surface, setSurface] = useState<string | null>(null);

  const { data: session } = authClient.useSession();
  const bubbleRef = useRef<BubbleState>({ ...INITIAL_BUBBLE });
  const pipWindowRef = useRef<Window | null>(null);
  const surfaceRef = useRef<string | null>(null);
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
    setPipSupported("documentPictureInPicture" in window);
    return () => {
      cleanupStreams();
      pipWindowRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cleanupStreams]);

  /**
   * Loom-style floating bubble: an always-on-top Document Picture-in-Picture
   * window showing the camera. When recording the entire screen the bubble is
   * physically on it, so the capture picks it up wherever the user drags it.
   * In that case we stop compositing to avoid a double bubble. For window/tab
   * recordings the PiP window isn't captured, so compositing stays on and the
   * bubble serves as a live self-view.
   */
  const popOutBubble = useCallback(async () => {
    const camera = cameraRef.current;
    const dpp = (
      window as Window & {
        documentPictureInPicture?: {
          requestWindow(opts: { width: number; height: number }): Promise<Window>;
        };
      }
    ).documentPictureInPicture;
    if (!camera || !dpp) return;

    const pip = await dpp.requestWindow({ width: 240, height: 240 });
    pipWindowRef.current = pip;
    pip.document.body.style.cssText =
      "margin:0;background:#09090b;overflow:hidden;display:grid;place-items:center;";
    const video = pip.document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream(camera.getVideoTracks());
    video.style.cssText =
      "width:96vmin;height:96vmin;object-fit:cover;border-radius:50%;transform:scaleX(-1);border:3px solid rgba(255,255,255,.9);box-sizing:border-box;";
    pip.document.body.appendChild(video);
    setPipOpen(true);

    if (surfaceRef.current === "monitor") {
      bubbleRef.current.visible = false; // captured physically; don't composite too
    }
    pip.addEventListener("pagehide", () => {
      pipWindowRef.current = null;
      setPipOpen(false);
      bubbleRef.current.visible = true; // resume composited bubble
    });
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);

    pipWindowRef.current?.close();
    pipWindowRef.current = null;
    setPipOpen(false);

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

      const displaySurface =
        screen.getVideoTracks()[0]?.getSettings().displaySurface ?? null;
      surfaceRef.current = displaySurface;
      setSurface(displaySurface);

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
        setError("Permission denied. Allow camera/mic/screen access to record.");
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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-blue-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          Capca
        </Link>
        {phase === "recording" && (
          <span className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {minutes}:{seconds}
          </span>
        )}
      </header>

      {phase === "idle" || phase === "starting" ? (
        <section className="grid flex-1 items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              Recorder
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
              Record with confidence.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
              Choose your screen in Chrome's picker, keep audio permission
              explicit, and see exactly what Capca is capturing before you
              share.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-800">
                <span>Camera bubble</span>
                <input
                  type="checkbox"
                  checked={withCamera}
                  onChange={(e) => setWithCamera(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-800">
                <span>Microphone</span>
                <input
                  type="checkbox"
                  checked={withMic}
                  onChange={(e) => setWithMic(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
              </label>
              <div className="rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                For Google Meet, choose the Meet tab and keep "Also share tab
                audio" enabled in Chrome's picker.
              </div>
            </div>
            <button
              onClick={startRecording}
              disabled={phase === "starting"}
              className="mt-5 w-full rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {phase === "starting" ? "Requesting permissions..." : "Start recording"}
            </button>
            {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
          </div>
        </section>
      ) : null}

      {phase === "recording" && (
        <section className="flex flex-col gap-4">
          <div
            ref={previewBoxRef}
            className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-200 bg-black shadow-sm"
          >
            <video
              ref={screenPreviewRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain"
            />
            {withCamera && !(pipOpen && surface === "monitor") && (
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
          <p className="text-center text-xs font-medium text-zinc-500">
            {pipOpen && surface === "monitor"
              ? "Your floating bubble is being captured right on the screen. Drag it wherever you like."
              : pipOpen
                ? "Floating self-view is up. The bubble in this preview is what gets recorded. Drag it to reposition."
                : "Drag the bubble to reposition it. The recording follows."}
          </p>
          <div className="flex justify-center gap-4">
            {withCamera && pipSupported && !pipOpen && (
              <button
                onClick={() => void popOutBubble()}
                className="rounded-lg border border-blue-200 bg-white px-6 py-3 font-semibold text-blue-700 transition hover:border-blue-400"
              >
                Pop out camera bubble
              </button>
            )}
            <button
              onClick={() => void stopRecording()}
              className="rounded-lg bg-red-500 px-8 py-3 font-semibold text-white transition hover:bg-red-400"
            >
              Stop recording
            </button>
          </div>
          {withCamera && pipSupported && !pipOpen && (
            <p className="text-center text-xs font-medium text-zinc-500">
              Pop the bubble out to see yourself while you present in other
              windows{surface === "monitor" ? " - it will appear in the recording exactly where you place it." : "."}
            </p>
          )}
        </section>
      )}

      {phase === "preview" && resultUrl && (
        <section className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Your recording</h1>
          <video
            src={resultUrl}
            controls
            className="aspect-video w-full rounded-2xl border border-zinc-200 bg-black shadow-sm"
          />

          {shareUrl ? (
            <div className="flex w-full max-w-lg items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-sm font-medium text-blue-900 outline-none"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
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
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <button
                onClick={() => void uploadRecording()}
                disabled={uploadState === "uploading"}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadState === "uploading"
                  ? "Uploading..."
                  : "Upload & get share link"}
              </button>
              {uploadState === "error" && (
                <p className="text-center text-sm font-medium text-red-600">
                  Upload failed. Check that Postgres/MinIO are running, then try again.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-600">
              <Link href="/login" className="font-semibold text-blue-700 hover:underline">
                Sign in
              </Link>{" "}
              to upload and get a share link.
            </p>
          )}

          <div className="flex gap-4">
            <a
              href={resultUrl}
              download={`recording-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.webm`}
              className="rounded-lg border border-zinc-200 bg-white px-6 py-3 font-semibold text-zinc-700 transition hover:border-blue-300 hover:text-blue-700"
            >
              Download WebM
            </a>
            <button
              onClick={() => setPhase("idle")}
              className="rounded-lg border border-zinc-200 bg-white px-6 py-3 font-semibold text-zinc-700 transition hover:border-blue-300 hover:text-blue-700"
            >
              Record again
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
