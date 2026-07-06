import { useEffect, useState } from 'react'
import { useDev, type DevCard } from '../../context/DevContext'
import './Dev.css'

function logLine(card: DevCard): string {
  if (card.kind === 'response') {
    const preview = card.text.length > 60 ? `${card.text.slice(0, 60)}…` : card.text
    return `💬 ${preview}`
  }
  if (card.status === 'pending') return `⏳ ${card.tool} — awaiting approval`
  if (card.status === 'executed') return `✅ ${card.tool} ran`
  if (card.status === 'failed') return `❌ ${card.tool} failed — ${card.error ?? 'unknown error'}`
  return `🚫 ${card.tool} denied`
}

export default function DevActionPanel() {
  const { selectedProject, running, runProject } = useDev()
  const [goal, setGoal] = useState('')

  // Seed the goal draft from the project whenever the selection changes.
  useEffect(() => {
    setGoal(selectedProject?.goal ?? '')
  }, [selectedProject?.project_id])

  const run = () => {
    if (!selectedProject || running || !goal.trim()) return
    void runProject(goal.trim())
  }

  const feed = selectedProject
    ? [...selectedProject.cards].reverse().map((c, idx) => ({ key: `${idx}-${c.created_at}`, text: logLine(c) }))
    : []

  return (
    <aside className="right-panel dev-action-panel">
      <div className="panel-card">
        <h3>Run Goal</h3>

        {!selectedProject && <div className="empty-hint">Select a project on the left to run it.</div>}

        {selectedProject && (
          <>
            <textarea
              className="dev-goal-input"
              placeholder="What do you want MAT to build or fix? e.g. Add input validation to the login form"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={running}
            />

            <button
              type="button"
              className="expand-action-btn solid dev-run-btn"
              onClick={run}
              disabled={running || !goal.trim()}
            >
              {running ? 'Running…' : '▶ Run'}
            </button>
          </>
        )}
      </div>

      {selectedProject && (
        <div className="panel-card dev-feed-card">
          <h3>Activity</h3>
          {feed.length === 0 && <div className="empty-hint">No activity yet.</div>}
          {feed.map((entry) => (
            <div className="dev-feed-line" key={entry.key}>
              {entry.text}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
