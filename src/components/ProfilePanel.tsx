import { useEffect, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import './ProfilePanel.css'

interface ProfilePanelProps {
  onClose: () => void
}

function listToText(values: string[]): string {
  return values.join(', ')
}

function textToList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

export default function ProfilePanel({ onClose }: ProfilePanelProps) {
  const { identity, refreshIdentity, updateIdentity } = useBackend()

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [profession, setProfession] = useState('')
  const [projects, setProjects] = useState('')
  const [shortGoals, setShortGoals] = useState('')
  const [longGoals, setLongGoals] = useState('')
  const [commsStyle, setCommsStyle] = useState('')
  const [workHours, setWorkHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    refreshIdentity()
  }, [refreshIdentity])

  useEffect(() => {
    if (!identity) return
    setName(identity.name ?? '')
    setNickname(identity.nickname ?? '')
    setProfession(listToText(identity.profession ?? []))
    setProjects(listToText(identity.active_projects ?? []))
    setShortGoals(listToText(identity.goals?.short_term ?? []))
    setLongGoals(listToText(identity.goals?.long_term ?? []))
    setCommsStyle(identity.preferences?.communication_style ?? '')
    setWorkHours(identity.preferences?.work_hours ?? '')
  }, [identity])

  const handleSave = async () => {
    setSaving(true)
    setSavedAt(null)
    const updates: Array<[string, unknown]> = [
      ['name', name],
      ['nickname', nickname],
      ['profession', textToList(profession)],
      ['active_projects', textToList(projects)],
      ['goals', { short_term: textToList(shortGoals), long_term: textToList(longGoals) }],
      ['preferences', { communication_style: commsStyle, work_hours: workHours }],
    ]
    let ok = true
    for (const [field, value] of updates) {
      ok = (await updateIdentity(field, value)) && ok
    }
    setSaving(false)
    if (ok) setSavedAt(Date.now())
  }

  return (
    <>
      <div className="profile-backdrop" onClick={onClose} />
      <div className="profile-panel">
        <div className="profile-panel-header">
          <h3>Profile</h3>
          <button type="button" className="profile-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="profile-form">
          <label className="profile-field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="profile-field">
            <span>Nickname</span>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </label>
          <label className="profile-field">
            <span>Profession (comma-separated)</span>
            <input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="trader, developer" />
          </label>
          <label className="profile-field">
            <span>Active projects (comma-separated)</span>
            <input value={projects} onChange={(e) => setProjects(e.target.value)} placeholder="MAT-AI-OS, ..." />
          </label>
          <label className="profile-field">
            <span>Short-term goals (comma-separated)</span>
            <textarea value={shortGoals} onChange={(e) => setShortGoals(e.target.value)} rows={2} />
          </label>
          <label className="profile-field">
            <span>Long-term goals (comma-separated)</span>
            <textarea value={longGoals} onChange={(e) => setLongGoals(e.target.value)} rows={2} />
          </label>
          <label className="profile-field">
            <span>Communication style</span>
            <input value={commsStyle} onChange={(e) => setCommsStyle(e.target.value)} placeholder="casual, direct, no fluff" />
          </label>
          <label className="profile-field">
            <span>Work hours</span>
            <input value={workHours} onChange={(e) => setWorkHours(e.target.value)} placeholder="e.g. 9am-6pm" />
          </label>

          <div className="profile-actions">
            <button type="button" className="profile-save-btn" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {savedAt && <span className="profile-saved-note">Saved.</span>}
          </div>
        </div>
      </div>
    </>
  )
}
