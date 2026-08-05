import { useEffect, useId, useRef } from 'react'
import type { CreateFolderInput } from '../types/savings'

interface CreateFolderModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreateFolderInput) => void
}

export function CreateFolderModal({ open, onClose, onSubmit }: CreateFolderModalProps) {
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) nameRef.current?.focus()
  }, [open])

  if (!open) return null

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    if (!name) return

    onSubmit({ name })
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
          <h2 id={titleId}>建立資料夾</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>資料夾名稱</span>
            <input
              ref={nameRef}
              name="name"
              type="text"
              placeholder="例如：旅遊、生活開銷"
              required
              autoComplete="off"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="button button-primary">
              建立資料夾
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
