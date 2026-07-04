import { useState } from 'react'
import Header from './components/Header'
import LeftPanel from './components/LeftPanel'
import CenterPanel from './components/CenterPanel'
import RightPanel from './components/RightPanel'
import ToastHost from './components/ToastHost'
import CreatorProjectsSidebar from './components/creator/CreatorProjectsSidebar'
import CreatorCanvas from './components/creator/CreatorCanvas'
import CreatorActionPanel from './components/creator/CreatorActionPanel'
import { BackendProvider } from './context/BackendContext'
import { ToastProvider } from './context/ToastContext'
import { CreatorProvider } from './context/CreatorContext'
import './styles/layout.css'

export type WorkspaceView = 'brain' | 'creator'

export default function App() {
  const [view, setView] = useState<WorkspaceView>('brain')

  return (
    <ToastProvider>
      <BackendProvider>
        <CreatorProvider>
          <div className="app-shell">
            <Header view={view} onViewChange={setView} />
            <div className="app-body">
              {view === 'brain' ? (
                <>
                  <LeftPanel />
                  <CenterPanel />
                  <RightPanel />
                </>
              ) : (
                <>
                  <CreatorProjectsSidebar />
                  <CreatorCanvas />
                  <CreatorActionPanel />
                </>
              )}
            </div>
          </div>
          <ToastHost />
        </CreatorProvider>
      </BackendProvider>
    </ToastProvider>
  )
}
