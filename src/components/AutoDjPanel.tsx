import { Bot, Radio, ShieldAlert, Sparkles, Square } from 'lucide-react'
import { takeOverAutoDj } from '../ai/AutoDjController'
import { useAutoDjStore } from '../state/autoDjStore'
import { useAutoTransitionStore } from '../state/autoTransitionStore'
import { useLibraryStore } from '../state/libraryStore'
import { useMixerStore } from '../state/mixerStore'
import './autoDj.css'

const statusLabels = {
  off: 'OFF',
  armed: 'ARMED',
  selecting: 'SELECTING',
  preparing: 'PREPARING',
  ready: 'READY',
  transitioning: 'MIXING',
  error: 'ATTENTION',
} as const

export function AutoDjPanel() {
  const enabled = useAutoDjStore((state) => state.enabled)
  const status = useAutoDjStore((state) => state.status)
  const nextTrackTitle = useAutoDjStore((state) => state.nextTrackTitle)
  const nextScore = useAutoDjStore((state) => state.nextScore)
  const completedTransitions = useAutoDjStore((state) => state.completedTransitions)
  const minimumScore = useAutoDjStore((state) => state.minimumScore)
  const error = useAutoDjStore((state) => state.error)
  const enable = useAutoDjStore((state) => state.enable)
  const setMinimumScore = useAutoDjStore((state) => state.setMinimumScore)
  const transitionProgress = useAutoTransitionStore((state) => state.progress)
  const tracks = useLibraryStore((state) => state.tracks)
  const decks = useMixerStore((state) => state.decks)
  const hasPlayingDeck = decks.A.isPlaying || decks.B.isPlaying
  const canEnable = tracks.length >= 2 && hasPlayingDeck

  return (
    <section className={`full-autodj-panel${enabled ? ' enabled' : ''} status-${status}`} aria-label="Full AutoDJ control">
      <div className="full-autodj-brand">
        <Bot size={20} />
        <span><strong>FULL AUTODJ</strong><small>continuous local selection + confirmed transition engine</small></span>
      </div>

      <div className="full-autodj-state">
        <Radio size={13} />
        <span>STATUS</span>
        <strong>{statusLabels[status]}</strong>
      </div>

      <div className="full-autodj-next">
        <span>NEXT TRACK</span>
        <strong>{nextTrackTitle || (enabled ? 'Waiting for a playable master deck…' : 'Manual control')}</strong>
        <small>{nextTrackTitle ? `${nextScore}% match` : `${tracks.length} library tracks`}</small>
      </div>

      <label className="full-autodj-threshold">
        <span>MIN MATCH <b>{minimumScore}</b></span>
        <input aria-label="AutoDJ minimum match score" type="range" min="0" max="80" step="5" value={minimumScore} disabled={enabled} onChange={(event) => setMinimumScore(Number(event.target.value))} />
      </label>

      <div className="full-autodj-progress" aria-label="Full AutoDJ transition progress">
        <span style={{ width: `${Math.round(transitionProgress * 100)}%` }} />
      </div>

      <div className="full-autodj-count"><Sparkles size={12} /><span>MIXES</span><strong>{completedTransitions}</strong></div>

      {!enabled ? (
        <button className="full-autodj-toggle" type="button" aria-label="Enable Full AutoDJ" disabled={!canEnable} onClick={enable}><Bot size={14} /> ENABLE</button>
      ) : (
        <button className="full-autodj-toggle takeover" type="button" aria-label="Take over from Full AutoDJ" onClick={takeOverAutoDj}><Square size={12} /> TAKE OVER</button>
      )}

      {!enabled && !canEnable && <div className="full-autodj-message"><ShieldAlert size={12} /> Add two library tracks and start one deck.</div>}
      {enabled && error && <div className="full-autodj-message error"><ShieldAlert size={12} /> {error}</div>}
    </section>
  )
}
