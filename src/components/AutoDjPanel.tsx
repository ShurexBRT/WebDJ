import { Bot, Radio, ShieldAlert, Sparkles, Square } from 'lucide-react'
import { takeOverAutoDj } from '../ai/autoDjControl'
import { AUTO_DJ_PROFILE_IDS, mixProfile, type AutoDjMixProfileId } from '../ai/mixProfiles'
import { useAutoDjStore } from '../state/autoDjStore'
import { useAutoTransitionStore } from '../state/autoTransitionStore'
import { useLibraryAnalysisStore } from '../state/libraryAnalysisStore'
import { useLibraryStore } from '../state/libraryStore'
import { useMixerStore } from '../state/mixerStore'
import './autoDj.css'

const statusLabels = {
  off: 'OFF',
  armed: 'ARMED',
  'analyzing-library': 'ANALYZING',
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
  const mixProfileId = useAutoDjStore((state) => state.mixProfileId)
  const error = useAutoDjStore((state) => state.error)
  const enable = useAutoDjStore((state) => state.enable)
  const setMinimumScore = useAutoDjStore((state) => state.setMinimumScore)
  const setMixProfile = useAutoDjStore((state) => state.setMixProfile)
  const transitionProgress = useAutoTransitionStore((state) => state.progress)
  const tracks = useLibraryStore((state) => state.tracks)
  const analysisItems = useLibraryAnalysisStore((state) => state.items)
  const decks = useMixerStore((state) => state.decks)
  const hasPlayingDeck = decks.A.isPlaying || decks.B.isPlaying
  const canEnable = tracks.length >= 2 && hasPlayingDeck
  const profile = mixProfile(mixProfileId)
  const analyzedCount = tracks.filter((track) => analysisItems[track.id]?.status === 'ready').length
  const waitingForAnalysis = status === 'analyzing-library'

  return (
    <section className={`full-autodj-panel${enabled ? ' enabled' : ''} status-${status}`} aria-label="Full AutoDJ control">
      <div className="full-autodj-brand">
        <Bot size={20} />
        <span><strong>FULL AUTODJ</strong><small>continuous local selection + phrase-sized transition engine</small></span>
      </div>

      <div className="full-autodj-state">
        <Radio size={13} />
        <span>STATUS</span>
        <strong>{statusLabels[status]}</strong>
      </div>

      <div className="full-autodj-next">
        <span>NEXT TRACK</span>
        <strong>{nextTrackTitle || (waitingForAnalysis ? 'Building analyzed candidate pool…' : enabled ? 'Waiting for a playable master deck…' : 'Manual control')}</strong>
        <small>{nextTrackTitle ? `${nextScore}% match` : waitingForAnalysis ? `${analyzedCount}/${tracks.length} library tracks analyzed` : `${tracks.length} library tracks`}</small>
      </div>

      <label className="full-autodj-profile" title={profile.shortDescription}>
        <span>MIX STYLE</span>
        <select
          aria-label="AutoDJ mix style"
          value={mixProfileId}
          disabled={enabled}
          onChange={(event) => setMixProfile(event.target.value as AutoDjMixProfileId)}
        >
          {AUTO_DJ_PROFILE_IDS.map((profileId) => <option key={profileId} value={profileId}>{mixProfile(profileId).label}</option>)}
        </select>
      </label>

      <label className="full-autodj-threshold">
        <span>MIN MATCH <b>{minimumScore}</b></span>
        <input aria-label="AutoDJ minimum match score" type="range" min="0" max="80" step="5" value={minimumScore} disabled={enabled} onChange={(event) => setMinimumScore(Number(event.target.value))} />
      </label>

      <div className="full-autodj-progress" aria-label="Full AutoDJ transition progress">
        <span style={{ width: `${Math.round(transitionProgress * 100)}%` }} />
      </div>

      <div className="full-autodj-count" aria-label="Completed AutoDJ mixes"><Sparkles size={12} /><span>MIXES</span><strong>{completedTransitions}</strong></div>

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
