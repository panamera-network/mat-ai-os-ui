import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../config'
import './GoalsPanel.css'

interface Milestone {
  id: string
  title: string
  done: boolean
  created_at: string
}

interface Goal {
  id: string
  title: string
  type: 'short_term' | 'long_term'
  status: 'active' | 'completed' | 'paused'
  milestones: Milestone[]
  progress: number
  created_at: string
  target_date: string | null
}

interface GoalsPanelProps {
  onClose: () => void
}

export default function GoalsPanel({ onClose }: GoalsPanelProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'short_term' | 'long_term'>('short_term')
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({})

  const fetchGoals = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/goals`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data: { goals: Goal[] } = await res.json()
        setGoals(data.goals)
      }
    } catch {
      // leave whatever goals are already shown
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const addGoal = async () => {
    const title = newTitle.trim()
    if (!title) return
    setNewTitle('')
    try {
      const res = await fetch(`${API_BASE_URL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: newType }),
      })
      if (res.ok) await fetchGoals()
    } catch {
      // leave the input cleared; user can retry
    }
  }

  const completeGoal = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/goals/${id}/complete`, { method: 'POST' })
      if (res.ok) await fetchGoals()
    } catch {
      // no-op
    }
  }

  const pauseGoal = async (id: string, status: Goal['status']) => {
    const nextStatus = status === 'paused' ? 'active' : 'paused'
    try {
      const res = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) await fetchGoals()
    } catch {
      // no-op
    }
  }

  const deleteGoal = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/goals/${id}`, { method: 'DELETE' })
      if (res.ok) await fetchGoals()
    } catch {
      // no-op
    }
  }

  const addMilestone = async (goalId: string) => {
    const title = (milestoneDrafts[goalId] ?? '').trim()
    if (!title) return
    setMilestoneDrafts((prev) => ({ ...prev, [goalId]: '' }))
    try {
      const res = await fetch(`${API_BASE_URL}/goals/${goalId}/milestone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.ok) await fetchGoals()
    } catch {
      // no-op
    }
  }

  const completeMilestone = async (goalId: string, milestoneId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/goals/${goalId}/milestone/${milestoneId}/complete`, { method: 'POST' })
      if (res.ok) await fetchGoals()
    } catch {
      // no-op
    }
  }

  return (
    <>
      <div className="goals-backdrop" onClick={onClose} />
      <div className="goals-panel">
        <div className="goals-panel-header">
          <h3>Goals</h3>
          <button type="button" className="goals-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="goals-add-row">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            placeholder="New goal..."
          />
          <select value={newType} onChange={(e) => setNewType(e.target.value as 'short_term' | 'long_term')}>
            <option value="short_term">Short term</option>
            <option value="long_term">Long term</option>
          </select>
          <button type="button" className="goals-add-btn" onClick={addGoal}>
            Add
          </button>
        </div>

        <div className="goals-list">
          {!loading && goals.length === 0 && <div className="goals-empty">No goals yet — add one above.</div>}
          {goals.map((goal) => (
            <div className={`goal-card status-${goal.status}`} key={goal.id}>
              <div className="goal-card-top">
                <span className="goal-type-badge">{goal.type === 'short_term' ? 'Short' : 'Long'}</span>
                <span className="goal-title">{goal.title}</span>
                <span className="goal-status-badge">{goal.status}</span>
              </div>

              <div className="goal-progress-track">
                <div className="goal-progress-fill" style={{ width: `${goal.progress}%` }} />
              </div>
              <div className="goal-progress-label">{goal.progress}%</div>

              {goal.milestones.length > 0 && (
                <div className="goal-milestones">
                  {goal.milestones.map((m) => (
                    <label className={`goal-milestone ${m.done ? 'done' : ''}`} key={m.id}>
                      <input
                        type="checkbox"
                        checked={m.done}
                        disabled={m.done}
                        onChange={() => completeMilestone(goal.id, m.id)}
                      />
                      <span>{m.title}</span>
                    </label>
                  ))}
                </div>
              )}

              {goal.status === 'active' && (
                <div className="goal-milestone-add">
                  <input
                    value={milestoneDrafts[goal.id] ?? ''}
                    onChange={(e) => setMilestoneDrafts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addMilestone(goal.id)}
                    placeholder="Add milestone..."
                  />
                  <button type="button" onClick={() => addMilestone(goal.id)}>
                    +
                  </button>
                </div>
              )}

              <div className="goal-actions">
                {goal.status !== 'completed' && (
                  <>
                    <button type="button" className="goal-complete-btn" onClick={() => completeGoal(goal.id)}>
                      Complete
                    </button>
                    <button type="button" className="goal-pause-btn" onClick={() => pauseGoal(goal.id, goal.status)}>
                      {goal.status === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                  </>
                )}
                <button type="button" className="goal-delete-btn" onClick={() => deleteGoal(goal.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
