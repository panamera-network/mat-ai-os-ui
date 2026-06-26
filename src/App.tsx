import Header from './components/Header'
import LeftPanel from './components/LeftPanel'
import CenterPanel from './components/CenterPanel'
import RightPanel from './components/RightPanel'
import ToastHost from './components/ToastHost'
import { BackendProvider } from './context/BackendContext'
import { ToastProvider } from './context/ToastContext'
import './styles/layout.css'

export default function App() {
  return (
    <ToastProvider>
      <BackendProvider>
        <div className="app-shell">
          <Header />
          <div className="app-body">
            <LeftPanel />
            <CenterPanel />
            <RightPanel />
          </div>
        </div>
        <ToastHost />
      </BackendProvider>
    </ToastProvider>
  )
}
