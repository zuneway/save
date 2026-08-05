import { useState } from 'react'
import type { SavingsProject } from '../types/savings'
import { CreateProjectModal } from './CreateProjectModal'

interface HomeScreenProps {
  projects: SavingsProject[]
  onCreateProject: (name: string, targetAmount: number) => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getProgress(current: number, target: number) {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

export function HomeScreen({ projects, onCreateProject }: HomeScreenProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="home-screen">
      <header className="page-header">
        <div>
          <p className="eyebrow">Savings Tracker</p>
          <h1>存錢系統</h1>
          <p className="subtitle">點擊建立按鈕，自訂專案名稱與目標金額。</p>
        </div>
        <button
          type="button"
          className="button button-primary create-button"
          onClick={() => setModalOpen(true)}
        >
          ＋ 建立存錢專案
        </button>
      </header>

      <section className="projects-section">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              💰
            </div>
            <h2>還沒有任何存錢專案</h2>
            <p>點擊上方按鈕，為你的存錢計畫取一個專屬名稱。</p>
          </div>
        ) : (
          <ul className="project-list">
            {projects.map((project) => {
              const progress = getProgress(project.currentAmount, project.targetAmount)

              return (
                <li key={project.id} className="project-card">
                  <div className="project-card-top">
                    <h2>{project.name}</h2>
                    <span className="progress-badge">{progress}%</span>
                  </div>
                  <p className="project-amounts">
                    {formatCurrency(project.currentAmount)}
                    <span> / {formatCurrency(project.targetAmount)}</span>
                  </p>
                  <div className="progress-track" aria-hidden="true">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onCreateProject}
      />
    </div>
  )
}
