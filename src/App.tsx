import { useState } from 'react'
import Header from './components/Header'
import LeftPanel from './components/LeftPanel'
import CenterPanel from './components/CenterPanel'
import RightPanel from './components/RightPanel'
import ToastHost from './components/ToastHost'
import CreatorProjectsSidebar from './components/creator/CreatorProjectsSidebar'
import CreatorCanvas from './components/creator/CreatorCanvas'
import CreatorActionPanel from './components/creator/CreatorActionPanel'
import DevProjectsSidebar from './components/dev/DevProjectsSidebar'
import DevCanvas from './components/dev/DevCanvas'
import DevActionPanel from './components/dev/DevActionPanel'
import LauncherPanel from './components/launcher/LauncherPanel'
import { BackendProvider } from './context/BackendContext'
import { ToastProvider } from './context/ToastContext'
import { CreatorProvider } from './context/CreatorContext'
import { DevProvider } from './context/DevContext'
import { LauncherProvider } from './context/LauncherContext'
import './styles/layout.css'

export type WorkspaceView = 'brain' | 'creator' | 'dev' | 'launcher'

export default function App() {
  const [view, setView] = useState<WorkspaceView>('brain')

  return (
    <ToastProvider>
      <BackendProvider>
        <CreatorProvider>
          <DevProvider>
            <LauncherProvider>
              <div className="app-shell">
                <Header view={view} onViewChange={setView} />
                <div className="app-body">
                  {view === 'brain' && (
                    <>
                      <LeftPanel />
                      <CenterPanel />
                      <RightPanel />
                    </>
                  )}
                  {view === 'creator' && (
                    <>
                      <CreatorProjectsSidebar />
                      <CreatorCanvas />
                      <CreatorActionPanel />
                    </>
                  )}
                  {view === 'dev' && (
                    <>
                      <DevProjectsSidebar />
                      <DevCanvas />
                      <DevActionPanel />
                    </>
                  )}
                  {view === 'launcher' && <LauncherPanel />}
                </div>
              </div>
              <ToastHost />
            </LauncherProvider>
          </DevProvider>
        </CreatorProvider>
      </BackendProvider>
    </ToastProvider>
  )
}
