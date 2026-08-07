import { FolderOpen, RefreshCw, Unlink } from 'lucide-react'
import { useMusicFolder } from '../library/useMusicFolder'

export function MusicFolderControl() {
  const {
    status,
    folderName,
    message,
    linkFolder,
    reconnectFolder,
    refreshFolder,
    forgetFolder,
  } = useMusicFolder()

  const busy = status === 'restoring' || status === 'linking'
  const unsupported = status === 'unsupported'
  const primaryLabel = unsupported
    ? 'FOLDER UNSUPPORTED'
    : busy
      ? 'SCANNING…'
      : status === 'permission-required'
        ? 'RECONNECT'
        : status === 'ready'
          ? 'REFRESH FOLDER'
          : folderName
            ? 'RECONNECT'
            : 'LINK FOLDER'

  const runPrimaryAction = () => {
    if (unsupported || busy) return
    if (status === 'ready') {
      void refreshFolder()
      return
    }
    if (status === 'permission-required' || folderName) {
      void reconnectFolder()
      return
    }
    void linkFolder()
  }

  return (
    <div className={`music-folder-control status-${status}`} title={message || folderName || 'Link a local music folder'}>
      <button
        className="music-folder-primary"
        type="button"
        aria-label={primaryLabel === 'LINK FOLDER' ? 'Link music folder' : primaryLabel.toLowerCase()}
        disabled={unsupported || busy}
        onClick={runPrimaryAction}
      >
        {status === 'ready' || status === 'restoring' ? <RefreshCw size={11} /> : <FolderOpen size={11} />}
        {primaryLabel}
      </button>
      {folderName && (
        <span className="music-folder-name">
          <b>{folderName}</b>
          <small>{message}</small>
        </span>
      )}
      {folderName && !busy && (
        <button className="music-folder-forget" type="button" aria-label="Forget linked music folder" title="Forget linked folder" onClick={() => void forgetFolder()}>
          <Unlink size={11} />
        </button>
      )}
    </div>
  )
}
