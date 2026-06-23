import BrainView from './BrainView'
import SkillsLibrary from './SkillsLibrary'
import './CenterPanel.css'

export default function CenterPanel() {
  return (
    <div className="center-panel">
      <BrainView />
      <SkillsLibrary />
    </div>
  )
}
