import { useEffect, useState } from 'react'
import type { AppSystemId } from './components/AccountMenu'
import { AuthScreen } from './components/AuthScreen'
import { HomeScreen } from './components/HomeScreen'
import { InstallGuide } from './components/InstallGuide'
import { PeriodicPlanDetailScreen } from './components/PeriodicPlanDetailScreen'
import { PeriodicSavingsScreen } from './components/PeriodicSavingsScreen'
import { PrivacyPanel } from './components/PrivacyPanel'
import { PrivacyPolicyPanel } from './components/PrivacyPolicyPanel'
import { ProjectDetailScreen } from './components/ProjectDetailScreen'
import {
  UsageGuide,
  hasSeenUsageGuide,
  markUsageGuideSeen,
} from './components/UsageGuide'
import { UpdatePrompt, VersionBadge, WhatsNewPrompt } from './components/UpdatePrompt'
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
  onOpenPrivacy,
  onOpenSettings,
  onRepairDataAfterPasswordReset,
  onSyncStateChange,
}: {
  userId: string
  username: string
  isGuest: boolean
  dataCryptoKey: CryptoKey | null
  onLogout: () => void
  onGoToLogin: () => void
  onOpenPrivacy: () => void
  onOpenSettings: () => void
  onRepairDataAfterPasswordReset?: (oldPassword: string, currentPassword: string) => Promise<void>
  onSyncStateChange?: (state: 'idle' | 'syncing' | 'synced' | 'offline') => void
}) {
  const {
    storageReady,
    storageError,
    syncState,
    folders,
    projects,
    periodicPlans,
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
    createPeriodicPlan,
    createPeriodicFolder,
    updatePeriodicFolderName,
    updatePeriodicFolderNote,
    deletePeriodicFolders,
    movePeriodicPlansToFolder,
    reorderPeriodicFolders,
    deletePeriodicPlans,
    updatePeriodicPlanName,
    updatePeriodicPlanNote,
    togglePeriodicPeriod,
    updatePeriodicDetailLayout,
    periodicFolders,
  } = useSavingsProjects(userId, {
    encrypt: !isGuest,
    dataKey: isGuest ? null : dataCryptoKey,
  })
  const [activeSystem, setActiveSystem] = useState<AppSystemId>('home')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activePeriodicPlanId, setActivePeriodicPlanId] = useState<string | null>(null)
  const [installGuideOpen, setInstallGuideOpen] = useState(false)
  const [usageGuideOpen, setUsageGuideOpen] = useState(false)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [repairBusy, setRepairBusy] = useState(false)
  const [repairError, setRepairError] = useState<string | null>(null)

  const activeProject = activeProjectId
    ? projects.find((project) => project.id === activeProjectId) ?? null
    : null
  const activePeriodicPlan = activePeriodicPlanId
    ? periodicPlans.find((plan) => plan.id === activePeriodicPlanId) ?? null
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
    if (activePeriodicPlanId && !activePeriodicPlan) {
      setActivePeriodicPlanId(null)
    }
  }, [activePeriodicPlanId, activePeriodicPlan])

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
        {storageError && onRepairDataAfterPasswordReset ? (
          <form
            className="modal-form auth-repair-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (repairBusy) return
              setRepairError(null)
              setRepairBusy(true)
              void onRepairDataAfterPasswordReset(oldPassword, currentPassword)
                .then(() => {
                  window.location.reload()
                })
                .catch((error: unknown) => {
                  setRepairError(error instanceof Error ? error.message : '轉換失敗')
                })
                .finally(() => {
                  setRepairBusy(false)
                })
            }}
          >
            <p className="field-hint">
              若剛用信件重設過密碼，請輸入重設前的舊密碼與目前新密碼，以轉換加密資料。
            </p>
            <label className="field">
              <span>舊密碼（重設前）</span>
              <input
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                required
                disabled={repairBusy}
              />
            </label>
            <label className="field">
              <span>目前密碼（重設後）</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                disabled={repairBusy}
              />
            </label>
            {repairError ? <p className="auth-error">{repairError}</p> : null}
            <button type="submit" className="button button-primary" disabled={repairBusy}>
              {repairBusy ? '轉換中…' : '轉換資料並重新載入'}
            </button>
          </form>
        ) : null}
        {storageError ? (
          <button type="button" className="button button-secondary" onClick={onLogout}>
            返回登入
          </button>
        ) : null}
      </div>
    )
  }

  const openHome = () => {
    setActiveSystem('home')
    setActivePeriodicPlanId(null)
  }

  const openPeriodic = () => {
    setActiveSystem('periodic')
    setActiveProjectId(null)
  }

  return (
    <>
      {activeSystem === 'periodic' ? (
        activePeriodicPlan ? (
          <PeriodicPlanDetailScreen
            plan={activePeriodicPlan}
            onBack={() => setActivePeriodicPlanId(null)}
            onTogglePeriod={(date) => togglePeriodicPeriod(activePeriodicPlan.id, date)}
            onUpdateName={(name) => updatePeriodicPlanName(activePeriodicPlan.id, name)}
            onUpdateNote={(note) => updatePeriodicPlanNote(activePeriodicPlan.id, note)}
            onUpdateDetailLayout={(layout) =>
              updatePeriodicDetailLayout(activePeriodicPlan.id, layout)
            }
            onDelete={() => {
              deletePeriodicPlans([activePeriodicPlan.id])
              setActivePeriodicPlanId(null)
            }}
          />
        ) : (
          <PeriodicSavingsScreen
            username={username}
            isGuest={isGuest}
            folders={periodicFolders}
            plans={periodicPlans}
            onCreatePlan={(input) => {
              const plan = createPeriodicPlan(input)
              if (plan) setActivePeriodicPlanId(plan.id)
            }}
            onCreateFolder={createPeriodicFolder}
            onUpdateFolderName={updatePeriodicFolderName}
            onUpdateFolderNote={updatePeriodicFolderNote}
            onDeleteFolders={deletePeriodicFolders}
            onMovePlansToFolder={movePeriodicPlansToFolder}
            onReorderFolders={reorderPeriodicFolders}
            onDeletePlans={deletePeriodicPlans}
            onOpenPlan={setActivePeriodicPlanId}
            onOpenHome={openHome}
            onOpenPrivacy={onOpenPrivacy}
            onOpenSettings={onOpenSettings}
            onLogout={onLogout}
            onGoToLogin={onGoToLogin}
          />
        )
      ) : activeProject ? (
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
          onOpenSettings={onOpenSettings}
          onOpenPeriodic={openPeriodic}
          createProjectOpen={createProjectOpen}
          onCreateProjectOpenChange={setCreateProjectOpen}
        />
      )}
      <InstallGuide open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />
      <UsageGuide
        open={usageGuideOpen}
        variant="savings"
        onClose={() => {
          markUsageGuideSeen()
          setUsageGuideOpen(false)
        }}
        onStartCreate={
          activeProject || activeSystem === 'periodic'
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
    login,
    register,
    requestPasswordReset,
    enterGuest,
    logout,
    updateNickname,
    changePassword,
    updateRecoveryEmail,
    repairDataAfterPasswordReset,
    wipeCurrentUserData,
    wipeAllLocalData,
  } = useAuth()
  const [installGuideOpen, setInstallGuideOpen] = useState(false)
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle')

  if (!ready) {
    return (
      <main className="app-shell">
        <p className="auth-loading">載入中…</p>
        <VersionBadge />
        <UpdatePrompt />
        <WhatsNewPrompt />
      </main>
    )
  }

  return (
    <main className="app-shell">
      {currentUser ? (
        <AuthenticatedApp
          key={currentUser.id}
          userId={currentUser.id}
          username={currentUser.username}
          isGuest={currentUser.isGuest}
          dataCryptoKey={dataCryptoKey}
          onLogout={logout}
          onGoToLogin={logout}
          onOpenPrivacy={() => setPrivacyPolicyOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onRepairDataAfterPasswordReset={
            currentUser.isGuest ? undefined : repairDataAfterPasswordReset
          }
          onSyncStateChange={setSyncState}
        />
      ) : (
        <>
          <AuthScreen
            onLogin={login}
            onRegister={register}
            onRequestPasswordReset={requestPasswordReset}
            onEnterGuest={enterGuest}
            onOpenInstallGuide={() => setInstallGuideOpen(true)}
            onOpenPrivacy={() => setPrivacyPolicyOpen(true)}
          />
          <InstallGuide open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />
        </>
      )}

      <PrivacyPolicyPanel
        open={privacyPolicyOpen}
        onClose={() => setPrivacyPolicyOpen(false)}
      />
      <PrivacyPanel
        open={settingsOpen}
        signedIn={Boolean(currentUser)}
        isGuest={Boolean(currentUser?.isGuest)}
        username={currentUser?.username ?? '尚未登入'}
        loginUsername={currentUser?.loginUsername}
        recoveryEmail={currentUser?.recoveryEmail}
        syncState={syncState}
        onClose={() => setSettingsOpen(false)}
        onUpdateNickname={updateNickname}
        onChangePassword={changePassword}
        onUpdateRecoveryEmail={updateRecoveryEmail}
        onWipeCurrentData={wipeCurrentUserData}
        onWipeAllLocalData={wipeAllLocalData}
      />
      <VersionBadge />
      <UpdatePrompt />
      <WhatsNewPrompt />
    </main>
  )
}

export default App
