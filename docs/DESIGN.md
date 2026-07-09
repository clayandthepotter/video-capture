# Capca Design Principles

Updated: 2026-07-09

Capca should feel like a calm, highly competent recording system. The interface
must reduce uncertainty before, during, and after recording.

## Brand Promise

> Record. Own. Share.

The product should constantly reinforce that recordings belong to the user.

## UX Principles

Every product surface must follow this branding system. That includes the
marketing page, auth screens, dashboard, recorder, share pages, browser
extension popup, in-page toolbar, empty states, loading states, errors, and
future admin/billing surfaces. If a page cannot follow the system yet, it
should be treated as unfinished.

1. **Reliability feels like speed.** Users can wait if they know what is
   happening. They will not forgive uncertainty.
2. **Ownership is visible.** Google Drive is not a hidden integration. It is the
   default storage story.
3. **One obvious next step.** Every screen should have a single primary action.
4. **Every state has language.** Loading, permission, upload, processing, ready,
   and failed states need plain copy and recovery actions.
5. **Paid boundaries are honest.** If Capca pays for storage, bandwidth, AI, or
   automation, the UI should say so clearly before the user depends on it.

## Visual Direction

- Modern productivity, not playful consumer social.
- Off-white or near-black surfaces depending on context.
- Trust blue as the primary accent.
- Neutral grays and soft charcoal for structure.
- Green, amber, red, and purple only for semantic states.
- Simple line icons with consistent stroke widths.
- 8px card and control radius unless a component has a strong functional reason.
- Subtle motion that clarifies state; no decorative motion.

## Core Surfaces

### Landing

The first viewport should communicate:

- Record your screen.
- Store it in your Google Drive.
- Share instantly.

The product UI should be the hero. Avoid abstract marketing art.

### Recorder

The recorder must show:

- Capture source.
- Camera state.
- Microphone state.
- Audio source.
- Destination.
- Permission state.
- Primary recording action.

### Upload Queue

The upload queue should never disappear until a recording is saved, failed, or
discarded. If upload fails, the UI must say whether the recording is still safe
locally.

### Library

The library should show:

- Title.
- Thumbnail.
- Duration.
- Storage destination.
- Upload/AI status.
- Share state.
- Source file actions.

### Share Page

The share page should feel clean and trustworthy:

- Large player.
- Clear title and owner.
- Copy link.
- Privacy state.
- Transcript, summary, and comments.
- "Stored in Google Drive" when Drive-backed.

## Microcopy Rules

- Use plain English.
- Use action-specific buttons: "Save changes", "Copy link", "Open in Drive".
- Do not use vague labels like "OK", "Submit", or "Something went wrong".
- Explain browser limitations directly.
- Never joke in error states.

## Accessibility

- Keyboard navigation.
- Visible focus states.
- Color-independent status indicators.
- Reduced-motion support.
- High contrast for all controls and text.
- ARIA labels for icon-only buttons.
