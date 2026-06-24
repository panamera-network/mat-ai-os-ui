import { useState, type CSSProperties } from 'react'
import { DOMAINS, type Domain } from '../data/domains'
import './SkillsLibrary.css'

const DOMAIN_ICONS: Record<string, string> = {
  trading: '📈',
  coding: '🧩',
  research: '🔬',
  business: '📋',
  personal: '✅',
  legal: '⚖️',
  creative: '🎨',
  ai_automation: '🤖',
  data_analytics: '📊',
  web3_blockchain: '⛓️',
}

const COLLAPSED_PREVIEW_COUNT = 3

interface OverlayPosition {
  left: number
  bottom: number
  width: number
}

export default function SkillsLibrary() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [overlayDomain, setOverlayDomain] = useState<Domain | null>(null)
  const [overlayPos, setOverlayPos] = useState<OverlayPosition>({ left: 0, bottom: 0, width: 0 })

  const toggle = (domain: Domain, el: HTMLElement) => {
    if (expandedId === domain.id) {
      setExpandedId(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setOverlayPos({ left: rect.left, bottom: window.innerHeight - rect.top, width: rect.width })
    setOverlayDomain(domain)
    setExpandedId(domain.id)
  }

  return (
    <section className="skills-library">
      <h3>Skills Library</h3>
      <div className="skills-grid">
        {DOMAINS.map((domain) => {
          const expanded = expandedId === domain.id
          const previewSkills = domain.skills.slice(0, COLLAPSED_PREVIEW_COUNT)
          const remaining = domain.count - previewSkills.length
          return (
            <div
              className={`domain-card ${expanded ? 'expanded' : ''}`}
              key={domain.id}
              style={{ '--domain-color': domain.color } as CSSProperties}
              onClick={(e) => toggle(domain, e.currentTarget)}
              role="button"
              tabIndex={0}
            >
              <div className="domain-card-header">
                <span className="domain-card-icon">{DOMAIN_ICONS[domain.id] ?? '•'}</span>
                <span className="domain-card-name">{domain.label.toUpperCase()} SKILLS</span>
                <span className="domain-card-toggle">{expanded ? '−' : '+'}</span>
              </div>
              <ul className="domain-card-skills">
                {previewSkills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
              {remaining > 0 && <div className="domain-card-more">+ {remaining} more skills</div>}
            </div>
          )
        })}
      </div>

      {expandedId && (
        <div className="domain-expand-backdrop" onClick={() => setExpandedId(null)} />
      )}
      <div
        className={`domain-expand-overlay ${expandedId ? 'open' : ''}`}
        style={
          {
            left: overlayPos.left,
            bottom: overlayPos.bottom,
            width: overlayPos.width,
            '--domain-color': overlayDomain?.color ?? 'var(--accent-purple)',
          } as CSSProperties
        }
      >
        {overlayDomain && (
          <>
            <div className="domain-card-header">
              <span className="domain-card-icon">{DOMAIN_ICONS[overlayDomain.id] ?? '•'}</span>
              <span className="domain-card-name">{overlayDomain.label.toUpperCase()} SKILLS</span>
              <span className="domain-card-toggle" onClick={() => setExpandedId(null)}>
                −
              </span>
            </div>
            <ul className="domain-card-skills">
              {overlayDomain.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
