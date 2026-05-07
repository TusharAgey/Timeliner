import { useEffect } from 'react'
import { TimelinerPage } from './pages/TimelinerPage'
import { useWorkspaceStore } from './store/useWorkspaceStore'

function App() {
  const init = useWorkspaceStore((state) => state.init)

  useEffect(() => {
    void init()
  }, [init])

  return <TimelinerPage />
}

export default App
