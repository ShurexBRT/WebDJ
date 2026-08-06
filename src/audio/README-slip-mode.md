# Slip mode transport ownership

Slip mode keeps a hidden AudioContext-based timeline while audible transport actions temporarily seek or loop elsewhere.

- `loop` owns the hidden timeline while an active Slip loop is engaged.
- `hot-cue-N` owns it while a loaded hot cue is held.
- `beat-jump` owns it while a beat-jump control is held.
- The deck returns only after the final owner releases.
- Loading or pausing a deck clears transient Slip activity.
- The enabled preference remains independent for Deck A and Deck B.
