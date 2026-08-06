# Musical key detection design

WebDJ will estimate a global musical key from offline chroma features and map the result to standard notation plus the Camelot wheel.

## Constraints

- Analysis must run locally in the browser.
- Track audio must never be uploaded.
- Results must be cached in the existing IndexedDB track profile.
- The detector must expose a confidence value and allow a manual override.
- Low-confidence results must be labelled as estimates rather than presented as fact.
- The implementation must use permissively licensed dependencies only.

## Planned pipeline

1. Decode the local file through the existing Web Audio analysis path.
2. Down-mix to mono and sample representative windows from the track.
3. Extract 12-band chroma vectors with Meyda.
4. Weight and average chroma frames while ignoring near-silent frames.
5. Compare the aggregate chroma against rotated Krumhansl major and minor profiles.
6. Return the best key, runner-up margin and normalized confidence.
7. Map major/minor keys to Camelot notation.
8. Store the result in the track profile and display harmonic compatibility for loaded decks.
