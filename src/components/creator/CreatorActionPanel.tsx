import { useEffect, useState } from 'react'
import { useCreator, type OutputKind } from '../../context/CreatorContext'
import './Creator.css'

const OUTPUT_CHECKBOXES: { kind: OutputKind; label: string }[] = [
  { kind: 'script', label: 'Script' },
  { kind: 'voice', label: 'Voice' },
  { kind: 'image', label: 'Image' },
  { kind: 'video', label: 'Video' },
  { kind: 'music', label: 'Music' },
]

function logLine(output: { output: string; status: string; error: string | null; job_id: string }): string {
  if (output.status === 'completed') return `✅ ${output.output} ready`
  if (output.status === 'failed') return `❌ ${output.output} failed — ${output.error ?? 'unknown error'}`
  return `⏳ ${output.output} ${output.status}`
}

export default function CreatorActionPanel() {
  const { selectedProject, running, runProject } = useCreator()
  const [goal, setGoal] = useState('')
  const [selected, setSelected] = useState<Set<OutputKind>>(new Set(['script']))

  // Seed the goal/output draft from the project whenever the selection changes.
  useEffect(() => {
    setGoal(selectedProject?.goal ?? '')
    setSelected(
      selectedProject && selectedProject.requested_outputs.length > 0
        ? new Set(selectedProject.requested_outputs)
        : new Set(['script']),
    )
  }, [selectedProject?.project_id])

  const toggleOutput = (kind: OutputKind) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  const run = () => {
    if (!selectedProject || running || selected.size === 0 || !goal.trim()) return
    void runProject(goal.trim(), Array.from(selected))
  }

  const feed = selectedProject
    ? [...selectedProject.outputs].reverse().map((o) => ({ key: `${o.job_id}-${o.status}`, text: logLine(o) }))
    : []

  return (
    <aside className="right-panel creator-action-panel">
      <div className="panel-card">
        <h3>Run Project</h3>

        {!selectedProject && <div className="empty-hint">Select a project on the left to run it.</div>}

        {selectedProject && (
          <>
            <textarea
              className="creator-goal-input"
              placeholder="What do you want MAT to create? e.g. 5-minute intro video about MAT.ai"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={running}
            />

            <div className="creator-output-checkboxes">
              {OUTPUT_CHECKBOXES.map(({ kind, label }) => (
                <label key={kind} className="skill-checkbox">
                  <input
                    type="checkbox"
                    checked={selected.has(kind)}
                    onChange={() => toggleOutput(kind)}
                    disabled={running}
                  />
                  {label}
                </label>
              ))}
            </div>

            <button
              type="button"
              className="expand-action-btn solid creator-run-btn"
              onClick={run}
              disabled={running || selected.size === 0 || !goal.trim()}
            >
              {running ? 'Running…' : '▶ Run Project'}
            </button>
          </>
        )}
      </div>

      {selectedProject && (
        <div className="panel-card creator-feed-card">
          <h3>Activity</h3>
          {feed.length === 0 && <div className="empty-hint">No outputs generated yet.</div>}
          {feed.map((entry) => (
            <div className="creator-feed-line" key={entry.key}>
              {entry.text}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
