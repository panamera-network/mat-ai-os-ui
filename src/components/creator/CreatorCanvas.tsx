import { API_BASE_URL } from '../../config'
import { useCreator, type CreatorOutput, type CreatorPendingJob, type OutputKind } from '../../context/CreatorContext'
import './Creator.css'

const CARD_ORDER: { kind: OutputKind; label: string; icon: string }[] = [
  { kind: 'script', label: 'Script', icon: '📝' },
  { kind: 'image', label: 'Thumbnail / Image', icon: '🖼️' },
  { kind: 'voice', label: 'Voice', icon: '🎙️' },
  { kind: 'video', label: 'Video', icon: '🎬' },
  { kind: 'music', label: 'Music', icon: '🎵' },
]

function outputFileUrl(jobId: string): string {
  return `${API_BASE_URL}/capabilities/output/${jobId}`
}

function OutputPreview({ kind, output }: { kind: OutputKind; output: CreatorOutput }) {
  if (output.status === 'failed') {
    return <div className="creator-card-error">{output.error ?? 'Generation failed.'}</div>
  }
  if (kind === 'script') {
    return <div className="creator-card-script">{output.result_text || '(empty script)'}</div>
  }
  if (!output.output_path) {
    return output.output_url ? (
      <div className="creator-card-note">Saved to an external URL (local download failed).</div>
    ) : (
      <div className="creator-card-note">Completed, but no output file was recorded.</div>
    )
  }
  const src = outputFileUrl(output.job_id)
  if (kind === 'image') return <img className="creator-card-media" src={src} alt={kind} />
  if (kind === 'video') return <video className="creator-card-media" src={src} controls />
  return <audio className="creator-card-audio" src={src} controls />
}

function CreatorOutputCard({
  kind,
  label,
  icon,
  output,
  pendingJob,
  requested,
}: {
  kind: OutputKind
  label: string
  icon: string
  output: CreatorOutput | undefined
  pendingJob: CreatorPendingJob | undefined
  requested: boolean
}) {
  return (
    <div className={`creator-output-card ${output ? `state-${output.status}` : pendingJob ? 'state-pending' : 'state-empty'}`}>
      <div className="creator-card-head">
        <span className="creator-card-icon">{icon}</span>
        <span className="creator-card-label">{label}</span>
        {output && <span className={`creator-card-status status-${output.status}`}>{output.status}</span>}
        {!output && pendingJob && <span className="creator-card-status status-pending">pending</span>}
      </div>

      {output && <OutputPreview kind={kind} output={output} />}

      {!output && pendingJob && (
        <div className="creator-card-note">
          ⏳ Generating — video/music can take a few minutes. This card updates automatically.
        </div>
      )}

      {!output && !pendingJob && (
        <div className="creator-card-empty">{requested ? 'Queued…' : 'Not requested for this run.'}</div>
      )}
    </div>
  )
}

export default function CreatorCanvas() {
  const { selectedProject } = useCreator()

  if (!selectedProject) {
    return (
      <div className="center-panel creator-canvas">
        <div className="empty-hint creator-canvas-empty">Select or create a project to see its outputs here.</div>
      </div>
    )
  }

  const latestOutputByKind = new Map<OutputKind, CreatorOutput>()
  for (const output of selectedProject.outputs) {
    latestOutputByKind.set(output.output, output) // outputs are appended in run order — last write wins
  }
  const pendingByKind = new Map<OutputKind, CreatorPendingJob>()
  for (const job of selectedProject.jobs) {
    pendingByKind.set(job.output, job)
  }

  return (
    <div className="center-panel creator-canvas">
      <div className="creator-canvas-header">
        <h2>{selectedProject.title}</h2>
        {selectedProject.goal && <p className="creator-canvas-goal">{selectedProject.goal}</p>}
      </div>

      <div className="creator-card-grid">
        {CARD_ORDER.map(({ kind, label, icon }) => (
          <CreatorOutputCard
            key={kind}
            kind={kind}
            label={label}
            icon={icon}
            output={latestOutputByKind.get(kind)}
            pendingJob={pendingByKind.get(kind)}
            requested={selectedProject.requested_outputs.includes(kind)}
          />
        ))}
      </div>
    </div>
  )
}
