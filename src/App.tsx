import { useEffect, useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { HomeScreen } from './components/HomeScreen'
import { InstallGuide } from './components/InstallGuide'
import { PrivacyPanel } from './components/PrivacyPanel'
import { ProjectDetailScreen } from './components/ProjectDetailScreen'
import { UnlockScreen } from './components/UnlockScreen'
import {
  UsageGuide,
  hasSeenUsageGuide,
  markUsageGuideSeen,
} from './components/UsageGuide'
import { UpdatePrompt, VersionBadge } from './components/UpdatePrompt'
import { useAuth } from './hooks/useAuth'
import { useSavingsProjects } from './hooks/useSavingsProjects'
import './App.css'

function AuthenticatedApp({
  userId,
  username,
  isGuest,
  dataCryptoKey,
  onLogout,
  onGoToLogin,
  onLock,
  onOpenPrivacy,
  onSyncStateChange,
}: {
  userId: string
  username: string
  isGuest: boolean
  dataCryptoKey: CryptoKey | null
  onLogout: () => void
  onGoToLogin: () => void
  onLock?: () => void
  onOpenPrivacy: () => void
  onSyncStateChange?: (state: 'idle' | 'syncing' | 'synced' | 'offline') => void
}) {
  const {
    storageReady,
    storageError,
    syncState,
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
  } = useSavingsProjects(userId, {
    encrypt: !isGuest,
    dataKey: isGuest ? null : dataCryptoKey,
  })
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [installGuideOpen, setInstallGuideOpen] = useState(false)
  const [usageGuideOpen, setUsageGuideOpen] = useState(false)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)

  const activeProject = activeProjectId
    ? projects.find((project) => project.id === activeProjectId) ?? null
    : null

  useEffect(() => {
    onSyncStateChange?.(syncState)
  }, [syncState, onSyncStateChange])

  useEffect(() => {
    if (activeProjectId && !activeProject) {
      setActiveProjectId(null)
    }
  }, [activeProjectId, activeProject])

  useEffect(() => {
    if (!storageReady) return
    if (!hasSeenUsageGuide()) setUsageGuideOpen(true)
  }, [storageReady])

  if (!storageReady) {
    return (
      <div className="auth-screen">
        <p className="auth-loading">
          {storageError ? `讀取失敗：${storageError}` : '正在安全載入資料…'}
        </p>
        {storageError ? (
          <button type="button" className="button button-secondary" onClick={onLogout}>
            返回登入
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <>
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
          username={username}
          isGuest={isGuest}
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
          onLogout={onLogout}
          onGoToLogin={onGoToLogin}
          onOpenInstallGuide={() => setInstallGuideOpen(true)}
          onOpenUsageGuide={() => setUsageGuideOpen(true)}
          onOpenPrivacy={onOpenPrivacy}
          onLock={onLock}
          createProjectOpen={createProjectOpen}
          onCreateProjectOpenChange={setCreateProjectOpen}
        />
      )}
      <InstallGuide open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />
      <UsageGuide
        open={usageGuideOpen}
        onClose={() => {
          markUsageGuideSeen()
          setUsageGuideOpen(false)
        }}
        onStartCreate={
          activeProject
            ? undefined
            : () => {
                setCreateProjectOpen(true)
              }
        }
        onOpenInstallGuide={() => setInstallGuideOpen(true)}
      />
    </>
  )
}

function App() {
  const {
    ready,
    currentUser,
    dataCryptoKey,
    needsUnlock,
    login,
    register,
    enterGuest,
    unlock,
    lock,
    logout,
    wipeCurrentUserData,
    wipeAllLocalData,
  } = useAuth()
  const [installGuideOpen, setInstallGuideOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle')

  if (!ready) {
    return (
      <main className="app-shell">
        <p className="auth-loading">載入中…</p>
        <VersionBadge />
        <UpdatePrompt />
      </main>
    )
  }

  return (
    <main className="app-shell">
      {currentUser && needsUnlock ? (
        <UnlockScreen username={currentUser.username} onUnlock={unlock} onLogout={logout} />
      ) : currentUser ? (
        <AuthenticatedApp
          key={currentUser.id}
          userId={currentUser.id}
          username={currentUser.username}
          isGuest={currentUser.isGuest}
          dataCryptoKey={dataCryptoKey}
          onLogout={logout}
          onGoToLogin={logout}
          onLock={currentUser.isGuest ? undefined : lock}
          onOpenPrivacy={() => setPrivacyOpen(true)}
          onSyncStateChange={setSyncState}
        />
      ) : (
        <>
          <AuthScreen
            onLogin={login}
            onRegister={register}
            onEnterGuest={enterGuest}
            onOpenInstallGuide={() => setInstallGuideOpen(true)}
            onOpenPrivacy={() => setPrivacyOpen(true)}
          />
          <InstallGuide open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />
        </>
      )}

      <PrivacyPanel
        open={privacyOpen}
        signedIn={Boolean(currentUser)}
        isGuest={Boolean(currentUser?.isGuest)}
        username={currentUser?.username ?? '尚未登入'}
        syncState={syncState}
        onClose={() => setPrivacyOpen(false)}
        onLock={currentUser && !currentUser.isGuest ? lock : undefined}
        onWipeCurrentData={wipeCurrentUserData}
        onWipeAllLocalData={wipeAllLocalData}
      />
      <VersionBadge />
      <UpdatePrompt />
    </main>
  )
}

export default App
