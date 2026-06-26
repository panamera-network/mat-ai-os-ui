import { useRef, useState } from 'react'
import { API_BASE_URL } from '../config'
import { useToast } from '../context/ToastContext'
import './ExportImportMenu.css'

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

export default function ExportImportMenu() {
  const { showToast } = useToast()
  const [exportOpen, setExportOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = async (option: ExportOption) => {
    setExportOpen(false)
    await downloadBlob(option.path, option.filename, showToast)
  }

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
    <div className="export-import-menu">
      <div className="export-dropdown-wrap">
        <button type="button" className="profile-btn" onClick={() => setExportOpen((open) => !open)}>
          Export ▾
        </button>
        {exportOpen && (
          <>
            <div className="export-dropdown-backdrop" onClick={() => setExportOpen(false)} />
            <div className="export-dropdown">
              {EXPORT_OPTIONS.map((option) => (
                <button key={option.path} type="button" onClick={() => handleExport(option)}>
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button type="button" className="profile-btn" onClick={() => fileInputRef.current?.click()}>
        Import
      </button>
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
    </div>
  )
}
