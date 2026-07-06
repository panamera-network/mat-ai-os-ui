import { useState } from 'react'
import { useDev } from '../../context/DevContext'
import './Dev.css'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'Running',
  ready: 'Ready',
}

export default function DevProjectsSidebar() {
  const {
    projects,
    selectedProjectId,
    selectProject,
    createProject,
    loadingProjects,
    error,
    errors,
    investigatingErrorId,
    investigateError,
    resolveError,
  } = useDev()
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    const project = await createProject(title.trim(), goal.trim())
    setSubmitting(false)
    if (project) {
      setTitle('')
      setGoal('')
      setFormOpen(false)
    }
  }

  return (
    <aside className="left-panel dev-sidebar">
      {errors.length > 0 && (
        <div className="panel-card dev-bugs-card">
          <h3>Bugs</h3>
          <div className="dev-bug-list">
            {errors.map((err) => (
              <div className="dev-bug-row" key={err.id}>
                <div className="dev-bug-text">
                  <span className="dev-bug-logger">{err.logger_name}</span>
                  <span className="dev-bug-message">{err.message}</span>
                </div>
                <div className="dev-bug-actions">
                  <button
                    type="button"
                    className="dev-bug-investigate-btn"
                    onClick={() => investigateError(err)}
                    disabled={investigatingErrorId === err.id}
                  >
                    {investigatingErrorId === err.id ? '…' : 'Investigate'}
                  </button>
                  <button type="button" className="dev-bug-dismiss-btn" onClick={() => resolveError(err.id)}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel-card">
        <h3>Dev Projects</h3>

        {error && <div className="form-error">{error}</div>}
        {loadingProjects && projects.length === 0 && <div className="empty-hint">Loading projects…</div>}
        {!loadingProjects && projects.length === 0 && !formOpen && (
          <div className="empty-hint">No projects yet — create one to get started.</div>
        )}

        <div className="dev-project-list">
          {projects.map((project) => (
            <button
              key={project.project_id}
              type="button"
              className={`dev-project-row ${project.project_id === selectedProjectId ? 'active' : ''}`}
              onClick={() => selectProject(project.project_id)}
            >
              <span className="dev-project-title">{project.title}</span>
              <span className={`dev-status-badge status-${project.status}`}>
                {STATUS_LABEL[project.status] ?? project.status}
              </span>
            </button>
          ))}
        </div>

        {!formOpen && (
          <button type="button" className="expand-action-btn solid dev-new-btn" onClick={() => setFormOpen(true)}>
            + New Project
          </button>
        )}

        {formOpen && (
          <div className="inline-form">
            <input placeholder="Project title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <textarea
              placeholder="Goal (optional — you can set this when you run it)"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <div className="inline-form-actions">
              <button type="button" onClick={submit} disabled={submitting || !title.trim()}>
                {submitting ? 'Creating…' : 'Create'}
              </button>
              <button type="button" className="ghost" onClick={() => setFormOpen(false)} disabled={submitting}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
