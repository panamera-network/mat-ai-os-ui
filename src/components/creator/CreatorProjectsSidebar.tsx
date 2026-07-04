import { useState } from 'react'
import { useCreator, type ProjectType } from '../../context/CreatorContext'
import './Creator.css'

const PROJECT_TYPES: { id: ProjectType; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'shorts', label: 'Shorts' },
]

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'Running',
  ready: 'Ready',
  published: 'Published',
}

export default function CreatorProjectsSidebar() {
  const { projects, selectedProjectId, selectProject, createProject, loadingProjects, error } = useCreator()
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ProjectType>('general')
  const [goal, setGoal] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    const project = await createProject(title.trim(), type, goal.trim())
    setSubmitting(false)
    if (project) {
      setTitle('')
      setGoal('')
      setType('general')
      setFormOpen(false)
    }
  }

  return (
    <aside className="left-panel creator-sidebar">
      <div className="panel-card">
        <h3>Creator Projects</h3>

        {error && <div className="form-error">{error}</div>}
        {loadingProjects && projects.length === 0 && <div className="empty-hint">Loading projects…</div>}
        {!loadingProjects && projects.length === 0 && !formOpen && (
          <div className="empty-hint">No projects yet — create one to get started.</div>
        )}

        <div className="creator-project-list">
          {projects.map((project) => (
            <button
              key={project.project_id}
              type="button"
              className={`creator-project-row ${project.project_id === selectedProjectId ? 'active' : ''}`}
              onClick={() => selectProject(project.project_id)}
            >
              <span className="creator-project-title">{project.title}</span>
              <div className="creator-project-meta">
                <span className={`creator-status-badge status-${project.status}`}>
                  {STATUS_LABEL[project.status] ?? project.status}
                </span>
                <span className="creator-project-type">{project.type}</span>
              </div>
            </button>
          ))}
        </div>

        {!formOpen && (
          <button type="button" className="expand-action-btn solid creator-new-btn" onClick={() => setFormOpen(true)}>
            + New Project
          </button>
        )}

        {formOpen && (
          <div className="inline-form">
            <input placeholder="Project title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <select value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
              {PROJECT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
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
