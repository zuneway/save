import { useEffect, useId, useRef, useState } from 'react'
import type { CreateProjectInput, ProjectDeadline, ProjectFolder } from '../types/savings'
import { getTodayDateInputValue, isValidDeadline } from '../utils/deadline'
import { parseAmount } from '../utils/money'

interface CreateProjectModalProps {
  open: boolean
  folders: ProjectFolder[]
  onClose: () => void
  onSubmit: (input: CreateProjectInput) => void
}

type DeadlineMode = ProjectDeadline['type']

export function CreateProjectModal({ open, folders, onClose, onSubmit }: CreateProjectModalProps) {
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const [deadlineMode, setDeadlineMode] = useState<DeadlineMode>('days')
  const minDate = getTodayDateInputValue()

  useEffect(() => {
    if (open) {
      setDeadlineMode('days')
      nameRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const targetAmount = parseAmount(formData.get('targetAmount'))

    let deadline: ProjectDeadline
    if (deadlineMode === 'days') {
      const days = parseAmount(formData.get('targetDays'))
      if (days == null) return
      deadline = { type: 'days', days }
    } else {
      deadline = { type: 'date', date: String(formData.get('targetDate') ?? '') }
    }

    const folderValue = String(formData.get('folderId') ?? '')
    const folderId = folderValue === '' ? null : folderValue

    if (!name || targetAmount == null || !isValidDeadline(deadline)) {
      return
    }

    onSubmit({ name, targetAmount, deadline, folderId })
    event.currentTarget.reset()
    setDeadlineMode('days')
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId}>建立存錢專案</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>自訂專案名稱</span>
            <input
              ref={nameRef}
              name="name"
              type="text"
              placeholder="輸入你想取的名稱，例如：旅遊基金、新車頭期款"
              required
              autoComplete="off"
            />
            <p className="field-hint">名稱不限格式，由你自由決定。</p>
          </label>

          <label className="field">
            <span>目標金額（NT$）</span>
            <input
              name="targetAmount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              placeholder="例如：1000"
              autoComplete="off"
              required
            />
            <p className="field-hint">請輸入整數金額，例如 1000。</p>
          </label>

          {folders.length > 0 && (
            <label className="field">
              <span>放入資料夾（選填）</span>
              <select name="folderId" defaultValue="">
                <option value="">不放入資料夾</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <fieldset className="field deadline-field">
            <legend>目標期限</legend>
            <div className="deadline-toggle" role="radiogroup" aria-label="目標期限類型">
              <button
                type="button"
                className={`deadline-option ${deadlineMode === 'days' ? 'is-active' : ''}`}
                onClick={() => setDeadlineMode('days')}
                aria-pressed={deadlineMode === 'days'}
              >
                目標天數
              </button>
              <button
                type="button"
                className={`deadline-option ${deadlineMode === 'date' ? 'is-active' : ''}`}
                onClick={() => setDeadlineMode('date')}
                aria-pressed={deadlineMode === 'date'}
              >
                目標日期
              </button>
            </div>

            {deadlineMode === 'days' ? (
              <label className="field nested-field">
                <span>要在幾天內達成？</span>
                <input
                  name="targetDays"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  placeholder="30"
                  defaultValue={30}
                  autoComplete="off"
                  required
                />
                <p className="field-hint">從建立專案當天起算，請輸入整數天數。</p>
              </label>
            ) : (
              <label className="field nested-field">
                <span>目標完成日期</span>
                <input name="targetDate" type="date" min={minDate} required />
                <p className="field-hint">可選今天或未來的日期。</p>
              </label>
            )}
          </fieldset>

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="button button-primary">
              建立專案
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
