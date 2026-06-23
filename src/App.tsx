import Header from './components/Header'
import LeftPanel from './components/LeftPanel'
import CenterPanel from './components/CenterPanel'
import RightPanel from './components/RightPanel'
import './styles/layout.css'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
    </div>
  )
}
