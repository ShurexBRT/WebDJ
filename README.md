# WebDJ

WebDJ is a desktop-first, browser-based DJ workstation built with React, TypeScript and the Web Audio API. Audio analysis, playback, mixing and AutoDJ orchestration run locally in the browser; local music files are not uploaded by the application.

## Current status

WebDJ has moved beyond the initial dual-deck prototype. The current `main` branch includes a working two-deck audio engine, precision transport, local music library, harmonic and gain analysis, controller support, recording, PWA support and an explainable Full AutoDJ v1.

The next project milestone is **Stable Core**: reproducible builds, long-running real-world audio QA, memory profiling and AutoDJ transition validation before more large features are added.

## Features

### Decks and transport

- Deck A and Deck B with independent transport state
- decoded `AudioBuffer` playback driven by `AudioContext` timing
- play, pause, seek and precision transport clock
- BPM detection with confidence and manual override
- pitch control with tempo changes and pitch lock
- MASTER deck selection and phase-aware SYNC
- quantized starts on the next master beat
- beat nudge and interactive jog-wheel scrub / temporary rate bend
- cue point and hot cues
- sample-accurate 1/2/4/8/16-beat loops
- 1/4/8/16-beat phrase jumps
- per-deck Slip mode
- quantized waveform, cue, hot-cue and loop interactions
- beat-grid and downbeat offset adjustment

### Mixer and audio processing

- per-deck trim and channel level
- three-band EQ
- equal-power crossfader
- independent filter
- echo with FREE and beat-synchronised timing
- convolution reverb
- master volume
- deck and master VU metering
- master dynamics limiter and clip-risk feedback
- conservative optional auto-gain estimates from local RMS / peak analysis
- headphone cue / master monitoring

### Library and analysis

- multi-file local import and drag-and-drop
- ID3v1 / ID3v2 metadata parsing with filename fallback
- search by title, artist, album, genre or filename
- duplicate detection by content fingerprint
- recent-track history
- waveform analysis and caching
- BPM and downbeat profile persistence
- musical-key estimation using browser-local chroma analysis
- Camelot notation and compatibility guidance
- manual key override
- IndexedDB persistence for reusable track analysis, cues and performance data

Browser security still requires the user to re-select local files after a full reload. Persisted analysis is restored when the same file is selected again.

### AI Assistant and Full AutoDJ v1

The AI Assistant is local and explainable. It ranks library candidates using deterministic signals rather than a remote LLM.

Candidate scoring currently considers:

- BPM compatibility
- Camelot / harmonic compatibility
- RMS / gain energy proxy
- genre
- duration
- analysis confidence
- recent-play penalty

The assistant reports concrete reasons and warnings for recommendations.

Full AutoDJ builds on that scoring engine and the shared transition executor. It can:

1. use the currently playing MASTER deck as the reference
2. rank available library tracks
3. select a candidate above a configurable minimum-match threshold
4. preload and analyse it on the free deck
5. mark the prepared deck READY
6. start an automatic transition in the end-of-track beat window
7. execute the selected deterministic transition plan
8. transfer MASTER to the incoming deck
9. continue preparing the next cycle

Supported transition families include long blend, bass swap, filter blend, echo out and hard cut. `TAKE OVER` cancels automation while preserving manual control of the current session.

### Controllers

- global keyboard shortcuts
- explicit Web MIDI connection
- model-agnostic MIDI learn
- channel-aware learned MIDI signatures
- persistent MIDI mappings

### Recording

The processed master bus can be recorded locally with `MediaRecorder`, including mixer, EQ, FX and crossfader processing. Supported browsers can export the completed recording as WebM or Ogg/Opus without uploading the mix.

### Online sources

WebDJ includes official source adapters for:

- Audius
- Jamendo

The user provides their own frontend-safe Audius API key and Jamendo Client ID. Selected streams are passed through the existing WebDJ analysis and deck pipeline in browser memory. YouTube extraction is intentionally not included.

### PWA

- installable application manifest
- standalone landscape presentation
- offline application shell
- production service worker under the GitHub Pages base path
- user-controlled update flow
- audio and range requests intentionally excluded from service-worker caching

The PWA does not persist or duplicate local music files.

## Development

### Requirements

- Node.js 22
- npm

### Run locally

```bash
npm install
npm run dev
```

Once the Stable Core dependency-lock milestone is merged, fresh CI and release installs should use `npm ci`.

### Validation

```bash
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Additional commands:

```bash
npm run test
npm run test:coverage
npm run test:e2e:ui
npm run preview
```

## Architecture

The project keeps timing-critical audio work separate from React rendering and UI state.

```text
src/
├── audio/        Web Audio engine, transport and DSP graph
├── features/     deck, mixer, library, controller and automation UI/workflows
├── state/        session, deck and mixer state
├── App.tsx       application shell and orchestration entry points
└── styles.css    shared design tokens and workstation layout
```

High-level rule:

> React describes controls and session state. Web Audio owns audio timing, routing and DSP.

Timing-sensitive features such as playback position, looping, quantized starts and automatic transitions are based on the shared `AudioContext` timeline rather than React timers.

## Stable Core milestone

Before adding another major feature family, the project is focusing on:

1. locking dependencies and making CI / Pages builds reproducible
2. validating 30-60 minute continuous sessions with real MP3/WAV libraries
3. testing transport interactions under loops, Slip, pitch changes and takeover scenarios
4. profiling decoded-audio memory usage with larger libraries
5. manually grading AutoDJ transitions and recording failure reasons
6. addressing reliability findings before expanding AutoDJ or adding stems / four-deck workflows

## Product direction after Stable Core

High-value follow-ups include an editable AutoDJ queue and better phrase / intro / outro awareness. Large additions such as stem separation or four-deck workflows should wait until the two-deck core has passed the stability milestone.
