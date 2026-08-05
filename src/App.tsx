import { useEffect, useState } from 'react'
import { HomeScreen } from './components/HomeScreen'
import { ProjectDetailScreen } from './components/ProjectDetailScreen'
import { useSavingsProjects } from './hooks/useSavingsProjects'
import './App.css'

function App() {
  const {
    folders,
    projects,
    createProject,
    createFolder,
    updateProjectNote,
    updateProjectName,
    updateFolderNote,
    updateFolderName,
    deleteProjects,
    moveProjectsToFolder,
    reorderFolders,
    toggleTodayComplete,
    completePlannedDay,
    undoEarlyDeposit,
    addEntry,
    updateRandomDeposit,
    regenerateRandomPlan,
    updateDetailLayout,
  } = useSavingsProjects()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  const activeProject = activeProjectId
    ? projects.find((project) => project.id === activeProjectId) ?? null
    : null

  useEffect(() => {
    if (activeProjectId && !activeProject) {
      setActiveProjectId(null)
    }
  }, [activeProjectId, activeProject])

  return (
    <main className="app-shell">
      {activeProject ? (
        <ProjectDetailScreen
          project={activeProject}
          onBack={() => setActiveProjectId(null)}
          onToggleTodayComplete={() => toggleTodayComplete(activeProject.id)}
          onCompletePlannedDay={(date, kind) =>
            completePlannedDay(activeProject.id, date, kind)
          }
          onUndoEarlyDeposit={(date) => undoEarlyDeposit(activeProject.id, date)}
          onAddEntry={(input) => addEntry(activeProject.id, input)}
          onUpdateRandomDeposit={(input) => updateRandomDeposit(activeProject.id, input)}
          onRegenerateRandomPlan={() => regenerateRandomPlan(activeProject.id)}
          onUpdateDetailLayout={(layout) => updateDetailLayout(activeProject.id, layout)}
          onUpdateNote={(note) => updateProjectNote(activeProject.id, note)}
          onUpdateName={(name) => updateProjectName(activeProject.id, name)}
        />
      ) : (
        <HomeScreen
          folders={folders}
          projects={projects}
          onCreateProject={createProject}
          onCreateFolder={createFolder}
          onDeleteProjects={deleteProjects}
          onMoveProjectsToFolder={moveProjectsToFolder}
          onReorderFolders={reorderFolders}
          onUpdateProjectNote={updateProjectNote}
          onUpdateProjectName={updateProjectName}
          onUpdateFolderNote={updateFolderNote}
          onUpdateFolderName={updateFolderName}
          onOpenProject={setActiveProjectId}
        />
      )}
    </main>
  )
}

export default App
