# WebDJ

Personal browser-based DJ playground built with React, TypeScript and the Web Audio API.

## Current scope

The project starts with a desktop-first dual-deck architecture:

- Deck A and Deck B
- channel volume state
- crossfader state
- audio engine scaffold
- mixer UI foundation
- local-file-first source strategy

Scratch support is intentionally out of scope.

## Planned order

1. Local audio loading and real playback
2. Per-deck gain and three-band EQ
3. Channel faders and equal-power crossfader
4. Master output and cue routing
5. Waveform and seek controls
6. Echo, delay and reverb
7. BPM analysis and basic sync
8. Audius and Jamendo source adapters

## Run locally

```bash
npm install
npm run dev
```

## Architecture

```text
src/
├── audio/        Web Audio engine and DSP graph
├── state/        UI and mixer state
├── App.tsx       Initial application shell
└── styles.css    Design tokens and layout
```

The audio engine remains separate from React state. React describes controls and session state; Web Audio owns timing, routing and DSP.
