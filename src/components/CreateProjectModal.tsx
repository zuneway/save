import { useEffect, useId, useRef } from 'react'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (name: string, targetAmount: number) => void
}

export function CreateProjectModal({ open, onClose, onSubmit }: CreateProjectModalProps) {
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      nameRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const targetAmount = Number(formData.get('targetAmount'))

    if (!name || Number.isNaN(targetAmount) || targetAmount <= 0) return

    onSubmit(name, targetAmount)
    event.currentTarget.reset()
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
              type="number"
              min={1}
              step={1}
              placeholder="50000"
              required
            />
          </label>

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
