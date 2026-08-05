import { HomeScreen } from './components/HomeScreen'
import { useSavingsProjects } from './hooks/useSavingsProjects'
import './App.css'

function App() {
  const { projects, createProject } = useSavingsProjects()

  return (
    <main className="app-shell">
      <HomeScreen projects={projects} onCreateProject={createProject} />
    </main>
  )
}

export default App
