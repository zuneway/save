import { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

interface WishItem {
  id: string
  content: string
  createdAt: string
  sent: boolean
}

const STORAGE_KEY = 'savings-system:wishes'
const NOTIFY_EMAIL = String(import.meta.env.VITE_WISH_NOTIFY_EMAIL ?? '').trim()

function loadWishes(): WishItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        if (typeof item !== 'object' || item === null) return null
        const wish = item as Partial<WishItem>
        if (!wish.id || !wish.content || !wish.createdAt) return null
        return {
          id: wish.id,
          content: String(wish.content),
          createdAt: String(wish.createdAt),
          sent: Boolean(wish.sent),
        }
      })
      .filter((item): item is WishItem => item !== null)
  } catch {
    return []
  }
}

function saveWishes(wishes: WishItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes))
}

function formatWishTime(iso: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

async function sendWishToGmail(content: string) {
  if (!NOTIFY_EMAIL) {
    throw new Error('尚未設定通知信箱')
  }

  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(NOTIFY_EMAIL)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: '[存錢系統許願池] 收到新意見，請安排修正',
      _template: 'table',
      _captcha: 'false',
      message: content.trim(),
      source: 'savings-system wish pool',
      tip: '請依此意見修正存錢系統功能。',
    }),
  })

  if (!response.ok) {
    throw new Error('寄送失敗')
  }

  return response.json() as Promise<{ success?: string | boolean }>
}

export function WishPool() {
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [wishes, setWishes] = useState<WishItem[]>(() => loadWishes())
  const [sending, setSending] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    saveWishes(wishes)
  }, [wishes])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.classList.add('wish-pool-open')
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('wish-pool-open')
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const sorted = useMemo(
    () =>
      [...wishes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [wishes],
  )

  const submitWish = async (event: React.FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending) return

    setSending(true)
    setStatusMessage(null)

    try {
      await sendWishToGmail(content)

      const wish: WishItem = {
        id: crypto.randomUUID(),
        content,
        createdAt: new Date().toISOString(),
        sent: true,
      }
      setWishes((prev) => [wish, ...prev])
      setDraft('')
    } catch (error) {
      setStatusMessage(
        error instanceof Error && error.message === '尚未設定通知信箱'
          ? '尚未設定通知 Gmail，請先告訴開發者你的信箱。'
          : '寄送失敗，請稍後再試。',
      )
    } finally {
      setSending(false)
    }
  }

  const removeWish = (id: string) => {
    setWishes((prev) => prev.filter((wish) => wish.id !== id))
  }

  const modal =
    open &&
    createPortal(
      <div className="modal-backdrop wish-pool-backdrop" onClick={() => setOpen(false)}>
        <div
          className="modal wish-pool-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="modal-header">
            <h2 id={titleId}>許願池</h2>
            <button
              type="button"
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label="關閉"
            >
              ×
            </button>
          </header>

          <p className="wish-pool-intro">
            留下你想增加或修正的功能。送出後會經第三方表單服務寄到作者信箱；請勿填寫身分證、銀行帳號、真實姓名等個資，只需描述功能需求即可。
          </p>

          <form className="modal-form" onSubmit={submitWish}>
            <label className="field">
              <span>許願內容</span>
              <textarea
                rows={4}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="例如：希望可以匯出存錢紀錄…"
                required
                disabled={sending}
              />
            </label>
            {statusMessage ? (
              <p className="wish-pool-status is-error">{statusMessage}</p>
            ) : null}
            <div className="modal-actions">
              <button
                type="submit"
                className="button button-primary"
                disabled={!draft.trim() || sending || !NOTIFY_EMAIL}
              >
                {sending ? '寄送中…' : '送出許願'}
              </button>
            </div>
            {!NOTIFY_EMAIL ? (
              <p className="field-hint warning-text">通知信箱尚未設定，暫時無法寄送。</p>
            ) : null}
          </form>

          <div className="wish-pool-list-wrap">
            <p className="island-menu-caption">我的許願紀錄</p>
            {sorted.length === 0 ? (
              <p className="folder-empty">還沒有許願，寫下一句吧。</p>
            ) : (
              <ul className="wish-pool-list">
                {sorted.map((wish) => (
                  <li key={wish.id} className="wish-pool-item">
                    <div>
                      <p>{wish.content}</p>
                      <small>{formatWishTime(wish.createdAt)}</small>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="刪除這則許願"
                      onClick={() => removeWish(wish.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>,
      document.body,
    )

  return (
    <>
      <div className={`wish-pool-dock ${open ? 'is-hidden' : ''}`}>
        <button
          type="button"
          className="wish-pool-button"
          aria-label="許願池"
          aria-haspopup="dialog"
          aria-expanded={open}
          title="許願池"
          onClick={() => setOpen(true)}
        >
          願
        </button>
      </div>
      {modal}
    </>
  )
}
