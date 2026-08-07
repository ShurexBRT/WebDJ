# WebDJ Stable Core QA Plan

This plan defines the stability gate for WebDJ before the next major feature family is started.

The goal is not to prove that every mix sounds perfect. The goal is to prove that the current two-deck engine can run for meaningful real-world sessions without transport corruption, runaway memory growth, broken automation state or unrecoverable audio failures.

## Exit criteria

Stable Core is considered complete when all of the following are true:

- CI is green from a clean `npm ci` install.
- A 60-minute continuous local-library session completes without a crash, frozen UI or unrecoverable AudioContext state.
- Full AutoDJ completes at least 20 consecutive transitions in a mixed test library without getting stuck in a retry loop or invalid lifecycle state.
- Manual `TAKE OVER` works from every AutoDJ transition phase tested and leaves the mixer in a usable manual state.
- No known P0 or P1 transport/audio defects remain open.
- Memory profiling does not show clearly unbounded growth caused by tracks that are no longer needed by either deck or the active preparation cycle.
- Reload/PWA/update flows do not corrupt persisted session or track-analysis data.
- The results of the AutoDJ grading run are recorded, including bad transitions and the reason each was judged bad.

## Test library

Build one reusable QA library of roughly 30-50 legally owned/test audio files. Keep the exact set stable between regression runs where possible.

Include:

- MP3 CBR files
- MP3 VBR files
- WAV files
- short tracks under 2 minutes
- long tracks over 7 minutes
- tracks with clean ID3 metadata
- tracks with missing metadata
- tracks with unusual characters in title/artist
- duplicate copies with different filenames
- BPM values covering slow, medium and fast material
- same/similar BPM tracks with compatible keys
- same/similar BPM tracks with intentionally poor harmonic compatibility
- tracks with quiet and loud masters
- tracks with long intros/outros and tracks with abrupt endings

Record the library composition in the test report so future runs can be compared.

## Gate 1 — Clean build reproducibility

### Procedure

1. Start from a clean checkout.
2. Confirm Node.js 22 is active.
3. Run `npm ci --no-audit --no-fund`.
4. Run `npm run lint`.
5. Run `npm run test:unit`.
6. Run `npm run build`.
7. Run `npm run test:e2e`.

### Pass condition

All commands complete successfully without modifying `package.json` or `package-lock.json`.

## Gate 2 — Library and analysis soak

### Procedure

1. Launch WebDJ in a fresh browser profile.
2. Import the full QA library in one operation.
3. Allow initial analysis to complete.
4. Search by title, artist, album, genre and filename.
5. Load tracks repeatedly to both decks.
6. Remove and re-add several tracks.
7. Add a byte-identical duplicate with a different filename and verify deduplication behavior.
8. Reload the application and re-select several previously analysed files.

### Watch for

- duplicate library rows
- metadata parser crashes
- analysis jobs that never leave a loading state
- stale BPM/key/waveform data appearing on the wrong track
- UI stalls while several tracks are being analysed
- failed persistence restoration

## Gate 3 — Manual transport torture matrix

Run the following combinations on both decks, not only Deck A.

| Scenario | Expected result |
| --- | --- |
| Play → seek repeatedly | Position changes cleanly; no duplicate audio source remains audible |
| Play → pause → seek → play | Resumes from requested position |
| Change pitch while playing | Audible tempo changes; transport remains coherent |
| SYNC paused slave to playing MASTER | Slave starts quantized on the master beat |
| SYNC two already-playing decks | Phase correction occurs without transport reset |
| Loop → resize active loop | Loop stays active and position remains valid |
| Loop → beat jump | Whole loop relocates while preserving its length |
| Slip → held hot cue → release | Audible action ends and hidden timeline is restored |
| Slip → beat jump → release | Hidden timeline restoration is correct |
| Jog while paused | Scrubs without starting playback |
| Jog while playing | Temporary rate bend ends at the original base pitch |
| Pitch change during jog bend | Bend is cleared safely and new base pitch remains |
| Load a new track during transient transport state | Old loop/slip/jog state cannot leak to the new track |

### Failure severity

- **P0:** crash, corrupted/unrecoverable audio engine, destructive data loss.
- **P1:** wrong deck plays, duplicate audio source, stuck loop/slip/sync, AutoDJ cannot recover, takeover fails.
- **P2:** visible state mismatch, recoverable timing glitch, misleading status or warning.
- **P3:** cosmetic/spacing/copy issue with no meaningful workflow impact.

## Gate 4 — Mixer and FX torture matrix

While both decks are playing:

- sweep crossfader repeatedly from edge to edge
- adjust trim and channel levels rapidly
- sweep LOW/MID/HIGH EQ controls
- sweep filter across the neutral centre in both directions
- enable/disable echo at every supported beat division
- switch echo between beat-sync and FREE mode
- adjust reverb while transport is active
- trigger limiter activity with intentionally hot gain staging
- enable/disable auto-gain estimates per deck
- switch headphone cue routing repeatedly

### Pass condition

No control leaves an unexpected persistent gain/filter/FX state after returning to its documented neutral/default position. Audio remains finite and the limiter/feedback paths do not self-oscillate into an unrecoverable state.

## Gate 5 — Full AutoDJ 60-minute soak

### Setup

- Import the complete QA library.
- Start one valid track manually.
- Select/confirm the MASTER deck.
- Enable Full AutoDJ with the normal production threshold.
- Do not keep the AI Assistant panel open unless the workflow requires it.

### During the run

Record each transition with:

- outgoing track
- incoming track
- candidate score
- selected transition family
- whether preparation reached READY
- whether transition started in the intended window
- whether MASTER transferred correctly
- subjective grade: Good / Acceptable / Bad
- short failure reason when grade is Bad

### Hard failures

The run fails immediately if:

- automation enters a repeating guarded-error loop
- both decks become stopped unexpectedly
- both decks incorrectly become MASTER or neither can become the usable master after transition
- prepared track state belongs to the wrong track
- a completed transition leaves the outgoing deck audibly running when it should be stopped
- AutoDJ cannot continue to the next preparation cycle

## Gate 6 — TAKE OVER matrix

Invoke `TAKE OVER` during each reachable automation phase:

1. candidate selection
2. candidate loading / analysis
3. READY / waiting for transition window
4. scheduled transition before incoming audio starts
5. early transition
6. mid transition
7. late transition before completion

Verify:

- automation is cancelled
- no new automated transition begins afterward
- current manual MASTER state is coherent
- crossfader/EQ/filter/echo controls are usable
- a target deck started only by automation is handled according to the documented takeover behavior
- manual playback can continue without a page reload

## Gate 7 — Memory profiling

Decoded PCM is expected to consume substantially more memory than compressed source files, so the important signal is lifecycle behavior rather than a tiny absolute memory number.

### Procedure

1. Record browser memory after startup.
2. Import the full QA library and allow analysis to settle.
3. Record memory after analysis.
4. Run manual deck loading for 20 track changes.
5. Record memory after the browser has had time to collect garbage.
6. Run Full AutoDJ for at least 30 minutes.
7. Record memory again after a settled period.
8. Remove tracks from the library and repeat a settled-memory observation.

### Investigate if

- memory rises continuously with every track change and never meaningfully settles
- decoded buffers remain retained for tracks that are no longer loaded/prepared
- waveform/analysis caches duplicate large data unnecessarily
- stopping AutoDJ fails to release preparation-only audio resources

Do not classify normal browser heap fluctuation as a leak without retained-object evidence.

## Gate 8 — Persistence / PWA regression

Verify:

- install prompt behavior when supported
- standalone launch
- offline application shell after a successful online load
- local audio/range requests are not incorrectly served from the service-worker cache
- update notification appears only when relevant
- accepting an update loads the new shell successfully
- track analysis profiles survive application reload
- user mixer/controller preferences restore correctly
- MIDI learned mappings survive reload

## Test report template

For every Stable Core run record:

- WebDJ commit SHA
- browser and version
- operating system
- test library version/count
- session duration
- number of manual track loads
- number of AutoDJ transitions attempted/completed
- transition grade counts: Good / Acceptable / Bad
- starting and settled memory observations
- defects found by severity
- screenshots/video/console logs where relevant
- final gate result: PASS / FAIL

## After Stable Core

Do not use a successful build alone as justification to start the next feature milestone. Stable Core exits only after the real-audio gates above have been exercised.

When the gate is green, the preferred next product work is:

1. editable AutoDJ queue
2. better phrase / intro / outro awareness and transition-point selection

Stems and four-deck workflows remain later milestones because they multiply audio-engine and memory complexity.
