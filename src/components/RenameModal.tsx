import { useEffect, useId, useRef } from 'react'

interface RenameModalProps {
  open: boolean
  title: string
  fieldLabel: string
  placeholder?: string
  initialName: string
  onClose: () => void
  onSave: (name: string) => void
}

export function RenameModal({
  open,
  title,
  fieldLabel,
  placeholder = '輸入新名稱',
  initialName,
  onClose,
  onSave,
}: RenameModalProps) {
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => {
        nameRef.current?.focus()
        nameRef.current?.select()
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [open, initialName])

  if (!open) return null

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    if (!name) return
    onSave(name)
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
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{fieldLabel}</span>
            <input
              ref={nameRef}
              name="name"
              type="text"
              defaultValue={initialName}
              placeholder={placeholder}
              required
              autoComplete="off"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="button button-primary">
              儲存名稱
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
