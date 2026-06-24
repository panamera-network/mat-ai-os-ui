import { useState, type CSSProperties } from 'react'
import { DOMAINS } from '../data/domains'
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

export default function SkillsLibrary() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <section className="skills-library">
      <h3>Skills Library</h3>
      <div className="skills-grid">
        {DOMAINS.map((domain) => {
          const expanded = expandedId === domain.id
          const visibleSkills = expanded ? domain.skills : domain.skills.slice(0, COLLAPSED_PREVIEW_COUNT)
          const remaining = domain.count - visibleSkills.length
          return (
            <div
              className={`domain-card ${expanded ? 'expanded' : ''}`}
              key={domain.id}
              style={{ '--domain-color': domain.color } as CSSProperties}
              onClick={() => setExpandedId(expanded ? null : domain.id)}
              role="button"
              tabIndex={0}
            >
              <div className="domain-card-header">
                <span className="domain-card-icon">{DOMAIN_ICONS[domain.id] ?? '•'}</span>
                <span className="domain-card-name">{domain.label.toUpperCase()} SKILLS</span>
                <span className="domain-card-toggle">{expanded ? '−' : '+'}</span>
              </div>
              <ul className="domain-card-skills">
                {visibleSkills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
              {!expanded && remaining > 0 && <div className="domain-card-more">+ {remaining} more skills</div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
