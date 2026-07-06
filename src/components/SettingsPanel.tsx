import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../config'
import { useBackend } from '../context/BackendContext'
import { useToast } from '../context/ToastContext'
import './SettingsPanel.css'

interface SettingsPanelProps {
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

interface ExportOption {
  label: string
  path: string
  filename: string
}

const EXPORT_OPTIONS: ExportOption[] = [
  { label: 'Export Agents', path: '/export/agents', filename: 'agents.json' },
  { label: 'Export Skills', path: '/export/skills', filename: 'skills.json' },
  { label: 'Export Soul', path: '/export/soul', filename: 'soul.json' },
  { label: 'Export All', path: '/export/all', filename: 'mat-ai-os-export.zip' },
]

async function downloadBlob(path: string, fallbackFilename: string, showToast: (m: string, k?: 'success' | 'error' | 'info') => void) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`)
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fallbackFilename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast(`Downloaded ${fallbackFilename}`, 'success')
  } catch {
    showToast(`Could not download ${fallbackFilename}`, 'error')
  }
}

function detectImportEndpoint(filename: string, parsed: unknown): string | null {
  if (filename.toLowerCase().endsWith('.zip')) return '/import/all'
  if (Array.isArray(parsed)) {
    const first = parsed[0]
    if (first && typeof first === 'object') {
      if ('agent_id' in first) return '/import/agents'
      if ('prompt_fragment' in first) return '/import/skills'
    }
    return null
  }
  if (parsed && typeof parsed === 'object' && 'soul_prompt' in parsed) return '/import/soul'
  return null
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { identity, refreshIdentity, updateIdentity } = useBackend()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleSaveProfile = async () => {
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

  const handleExport = (option: ExportOption) => downloadBlob(option.path, option.filename, showToast)

  const handleImportFile = async (file: File) => {
    const isZip = file.name.toLowerCase().endsWith('.zip')
    let parsed: unknown = null
    if (!isZip) {
      try {
        parsed = JSON.parse(await file.text())
      } catch {
        showToast('Selected file is not valid JSON.', 'error')
        return
      }
    }
    const endpoint = detectImportEndpoint(file.name, parsed)
    if (!endpoint) {
      showToast('Could not detect what kind of export this file is.', 'error')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Request failed: ${res.status}`)
      }
      showToast(`Imported ${file.name} successfully.`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed.', 'error')
    }
  }

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-panel-header">
          <h3>Settings</h3>
          <button type="button" className="settings-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h4>Profile</h4>
            <label className="settings-field">
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="settings-field">
              <span>Nickname</span>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </label>
            <label className="settings-field">
              <span>Profession (comma-separated)</span>
              <input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="trader, developer" />
            </label>
            <label className="settings-field">
              <span>Active projects (comma-separated)</span>
              <input value={projects} onChange={(e) => setProjects(e.target.value)} placeholder="MAT-AI-OS, ..." />
            </label>
            <label className="settings-field">
              <span>Short-term goals (comma-separated)</span>
              <textarea value={shortGoals} onChange={(e) => setShortGoals(e.target.value)} rows={2} />
            </label>
            <label className="settings-field">
              <span>Long-term goals (comma-separated)</span>
              <textarea value={longGoals} onChange={(e) => setLongGoals(e.target.value)} rows={2} />
            </label>
            <label className="settings-field">
              <span>Communication style</span>
              <input value={commsStyle} onChange={(e) => setCommsStyle(e.target.value)} placeholder="casual, direct, no fluff" />
            </label>
            <label className="settings-field">
              <span>Work hours</span>
              <input value={workHours} onChange={(e) => setWorkHours(e.target.value)} placeholder="e.g. 9am-6pm" />
            </label>

            <div className="settings-actions">
              <button type="button" className="settings-save-btn" disabled={saving} onClick={handleSaveProfile}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              {savedAt && <span className="settings-saved-note">Saved.</span>}
            </div>
          </section>

          <section className="settings-section">
            <h4>Data</h4>
            <div className="settings-data-row">
              {EXPORT_OPTIONS.map((option) => (
                <button key={option.path} type="button" className="settings-data-btn" onClick={() => handleExport(option)}>
                  {option.label}
                </button>
              ))}
              <button type="button" className="settings-data-btn" onClick={() => fileInputRef.current?.click()}>
                Import
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.zip"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) handleImportFile(file)
              }}
            />
          </section>
        </div>
      </div>
    </>
  )
}
