import type { CSSProperties } from 'react'
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
}

export default function SkillsLibrary() {
  return (
    <section className="skills-library">
      <h3>Skills Library</h3>
      <div className="skills-grid">
        {DOMAINS.map((domain) => {
          const remaining = domain.count - domain.topSkills.length
          return (
            <div className="domain-card" key={domain.id} style={{ '--domain-color': domain.color } as CSSProperties}>
              <div className="domain-card-header">
                <span className="domain-card-icon">{DOMAIN_ICONS[domain.id] ?? '•'}</span>
                <span className="domain-card-name">{domain.label.toUpperCase()} SKILLS</span>
              </div>
              <ul className="domain-card-skills">
                {domain.topSkills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
              {remaining > 0 && <div className="domain-card-more">+ {remaining} more skills</div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
