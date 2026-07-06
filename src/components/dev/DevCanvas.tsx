import { useState } from 'react'
import { useDev, type DevCard, type DevCommandCard } from '../../context/DevContext'
import { useMcpApprovals } from '../../hooks/useMcpApprovals'
import './Dev.css'

function ResponseCard({ card }: { card: Extract<DevCard, { kind: 'response' }> }) {
  return (
    <div className="dev-output-card dev-card-response">
      <div className="dev-card-head">
        <span className="dev-card-icon">💬</span>
        <span className="dev-card-label">Response</span>
      </div>
      <div className="dev-card-text">{card.text}</div>
    </div>
  )
}

function CommandCard({ card }: { card: DevCommandCard }) {
  const { approve, deny } = useMcpApprovals()
  const [acting, setActing] = useState(false)
  const pending = card.status === 'pending'

  const handleApprove = async () => {
    setActing(true)
    await approve(card.approval_id)
    setActing(false)
  }

  const handleDeny = async () => {
    setActing(true)
    await deny(card.approval_id)
    setActing(false)
  }

  return (
    <div className={`dev-output-card dev-card-command state-${card.status}`}>
      <div className="dev-card-head">
        <span className="dev-card-icon">⚡</span>
        <span className="dev-card-label">
          {card.server} · {card.tool}
        </span>
        <span className={`dev-card-status status-${card.status}`}>{card.status}</span>
      </div>

      <pre className="dev-card-params">{JSON.stringify(card.params, null, 2)}</pre>

      {card.result && <div className="dev-card-result">{card.result}</div>}
      {card.error && <div className="dev-card-error">{card.error}</div>}

      {pending && (
        <div className="dev-card-actions">
          <button type="button" className="dev-approve-btn" onClick={handleApprove} disabled={acting}>
            {acting ? '…' : '✓ Approve'}
          </button>
          <button type="button" className="dev-deny-btn" onClick={handleDeny} disabled={acting}>
            {acting ? '…' : '✕ Deny'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function DevCanvas() {
  const { selectedProject } = useDev()

  if (!selectedProject) {
    return (
      <div className="center-panel dev-canvas">
        <div className="empty-hint dev-canvas-empty">Select or create a project to see its activity here.</div>
      </div>
    )
  }

  return (
    <div className="center-panel dev-canvas">
      <div className="dev-canvas-header">
        <h2>{selectedProject.title}</h2>
        {selectedProject.goal && <p className="dev-canvas-goal">{selectedProject.goal}</p>}
      </div>

      <div className="dev-card-feed">
        {selectedProject.cards.length === 0 && (
          <div className="empty-hint dev-canvas-empty">No activity yet — run a goal to get started.</div>
        )}
        {selectedProject.cards.map((card, idx) =>
          card.kind === 'response' ? (
            <ResponseCard key={`${idx}-${card.created_at}`} card={card} />
          ) : (
            <CommandCard key={`${idx}-${card.approval_id}`} card={card} />
          ),
        )}
      </div>
    </div>
  )
}
