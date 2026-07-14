// Runs on the extension origin inside the bubble iframe. Requesting camera AND
// mic here grants both permissions to the extension origin in one prompt, so
// the offscreen recorder can later open the mic without prompting.
//
// The recorder captures this bubble as part of the tab/screen video, while mic
// audio is captured separately in the offscreen document. Keep the presenter
// preview live; any artificial delay here is baked into the recorded video.

(async () => {
  const msg = document.querySelector(".msg");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 640 },
      audio: true,
    });
    // Mic is only needed at record time (in the offscreen doc); release it here.
    stream.getAudioTracks().forEach((t) => t.stop());

    const video = document.createElement("video");
    video.srcObject = new MediaStream(stream.getVideoTracks());
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    await video.play();
    msg.replaceWith(video);
  } catch (err) {
    msg.textContent =
      err && err.name === "NotAllowedError"
        ? "Camera blocked. Allow it for this extension in Chrome settings."
        : `Camera error: ${err?.message ?? err}`;
  }
})();
