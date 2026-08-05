import { useCallback, useEffect, useState } from 'react'
import type { SavingsProject } from '../types/savings'

const STORAGE_KEY = 'savings-system:projects'

function loadProjects(): SavingsProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavingsProject[]
  } catch {
    return []
  }
}

function saveProjects(projects: SavingsProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function useSavingsProjects() {
  const [projects, setProjects] = useState<SavingsProject[]>(() => loadProjects())

  useEffect(() => {
    saveProjects(projects)
  }, [projects])

  const createProject = useCallback(
    (name: string, targetAmount: number) => {
      const project: SavingsProject = {
        id: crypto.randomUUID(),
        name: name.trim(),
        targetAmount,
        currentAmount: 0,
        createdAt: new Date().toISOString(),
      }
      setProjects((prev) => [project, ...prev])
      return project
    },
    [],
  )

  return { projects, createProject }
}
