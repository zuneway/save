import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type {
  CreateProjectInput,
  ProjectFolder,
  SavingsMode,
} from '../types/savings'
import { isValidDeadline } from '../utils/deadline'
import { parseAmount } from '../utils/money'

interface CreateProjectModalProps {
  open: boolean
  folders: ProjectFolder[]
  onClose: () => void
  onSubmit: (input: CreateProjectInput) => void
}

const TARGET_QUICK = [5000, 10000, 30000, 50000] as const
const DAY_QUICK = [7, 14, 30, 60] as const
const WEEK_QUICK = [4, 8, 12, 26] as const
const MONTH_QUICK = [3, 6, 12, 24] as const
const INTERVAL_QUICK = [2, 3, 5, 10] as const
const PERIOD_QUICK = [5, 10, 20, 30] as const

function ceilDivide(total: number, parts: number) {
  return Math.max(1, Math.ceil(total / Math.max(1, parts)))
}

function modeInterval(mode: SavingsMode, customInterval: number) {
  if (mode === 'daily') return 1
  if (mode === 'weekly') return 7
  if (mode === 'monthly') return 30
  return Math.max(1, customInterval)
}

export function CreateProjectModal({ open, folders, onClose, onSubmit }: CreateProjectModalProps) {
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const [savingsMode, setSavingsMode] = useState<SavingsMode>('daily')
  const [targetAmount, setTargetAmount] = useState('')
  const [days, setDays] = useState('30')
  const [weeks, setWeeks] = useState('8')
  const [months, setMonths] = useState('6')
  const [customInterval, setCustomInterval] = useState('3')
  const [customPeriods, setCustomPeriods] = useState('10')

  useEffect(() => {
    if (open) {
      setSavingsMode('daily')
      setTargetAmount('')
      setDays('30')
      setWeeks('8')
      setMonths('6')
      setCustomInterval('3')
      setCustomPeriods('10')
      nameRef.current?.focus()
    }
  }, [open])

  const parsedTarget = parseAmount(targetAmount)
  const dayCount = parseAmount(days) ?? 0
  const weekCount = parseAmount(weeks) ?? 0
  const monthCount = parseAmount(months) ?? 0
  const intervalCount = parseAmount(customInterval) ?? 0
  const periodCount = parseAmount(customPeriods) ?? 0

  const planPreview = useMemo(() => {
    if (parsedTarget == null || parsedTarget <= 0) return null

    if (savingsMode === 'daily' && dayCount >= 1) {
      return {
        interval: 1,
        periods: dayCount,
        totalDays: dayCount,
        periodAmount: ceilDivide(parsedTarget, dayCount),
        unit: '天',
      }
    }
    if (savingsMode === 'weekly' && weekCount >= 1) {
      return {
        interval: 7,
        periods: weekCount,
        totalDays: weekCount * 7,
        periodAmount: ceilDivide(parsedTarget, weekCount),
        unit: '週',
      }
    }
    if (savingsMode === 'monthly' && monthCount >= 1) {
      return {
        interval: 30,
        periods: monthCount,
        totalDays: monthCount * 30,
        periodAmount: ceilDivide(parsedTarget, monthCount),
        unit: '個月',
      }
    }
    if (savingsMode === 'custom' && intervalCount >= 1 && periodCount >= 1) {
      return {
        interval: intervalCount,
        periods: periodCount,
        totalDays: intervalCount * periodCount,
        periodAmount: ceilDivide(parsedTarget, periodCount),
        unit: '次',
      }
    }
    return null
  }, [
    parsedTarget,
    savingsMode,
    dayCount,
    weekCount,
    monthCount,
    intervalCount,
    periodCount,
  ])

  if (!open) return null

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const amount = parseAmount(targetAmount)
    if (!name || amount == null || !planPreview) return

    const deadline = { type: 'days' as const, days: planPreview.totalDays }
    if (!isValidDeadline(deadline)) return

    const folderValue = String(formData.get('folderId') ?? '')
    const folderId = folderValue === '' ? null : folderValue
    const note = String(formData.get('note') ?? '').trim() || undefined

    onSubmit({
      name,
      targetAmount: amount,
      deadline,
      savingsMode,
      intervalDays: modeInterval(savingsMode, planPreview.interval),
      periodAmount: planPreview.periodAmount,
      folderId,
      note,
    })
    event.currentTarget.reset()
    onClose()
  }

  return (
    <div className="modal-backdrop create-project-backdrop" onClick={onClose}>
      <div
        className="modal create-project-modal"
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

        <form className="modal-form create-project-form" onSubmit={handleSubmit}>
          <div className="modal-scroll-body">
          <fieldset className="field deadline-field">
            <legend>存錢節奏</legend>
            <div className="deadline-toggle plan-toggle-4" role="radiogroup" aria-label="存錢節奏">
              <button
                type="button"
                className={`deadline-option ${savingsMode === 'daily' ? 'is-active' : ''}`}
                onClick={() => setSavingsMode('daily')}
                aria-pressed={savingsMode === 'daily'}
              >
                日存
              </button>
              <button
                type="button"
                className={`deadline-option ${savingsMode === 'weekly' ? 'is-active' : ''}`}
                onClick={() => setSavingsMode('weekly')}
                aria-pressed={savingsMode === 'weekly'}
              >
                周存
              </button>
              <button
                type="button"
                className={`deadline-option ${savingsMode === 'monthly' ? 'is-active' : ''}`}
                onClick={() => setSavingsMode('monthly')}
                aria-pressed={savingsMode === 'monthly'}
              >
                月存
              </button>
              <button
                type="button"
                className={`deadline-option ${savingsMode === 'custom' ? 'is-active' : ''}`}
                onClick={() => setSavingsMode('custom')}
                aria-pressed={savingsMode === 'custom'}
              >
                自訂
              </button>
            </div>
            <p className="field-hint">
              {savingsMode === 'daily'
                ? '每天存一次，適合小額累積。'
                : savingsMode === 'weekly'
                  ? '每週存一次。'
                  : savingsMode === 'monthly'
                    ? '每月存一次。'
                    : '自己決定每幾天存一次。'}
            </p>
          </fieldset>

          <label className="field">
            <span>專案名稱</span>
            <input
              ref={nameRef}
              name="name"
              type="text"
              placeholder="例如：旅遊基金、新車頭期款"
              required
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>備註（選填）</span>
            <textarea
              name="note"
              rows={2}
              placeholder="例如：發薪日再存"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>目標金額（NT$）</span>
            <div className="quick-chip-row" role="group" aria-label="目標金額快捷">
              {TARGET_QUICK.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`quick-chip ${targetAmount === String(value) ? 'is-active' : ''}`}
                  onClick={() => setTargetAmount(String(value))}
                >
                  {value >= 10000 ? `${value / 10000} 萬` : value.toLocaleString('zh-TW')}
                </button>
              ))}
            </div>
            <input
              name="targetAmount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              placeholder="例如：10000"
              autoComplete="off"
              required
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
            />
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

          {savingsMode === 'daily' ? (
            <fieldset className="field deadline-field">
              <legend>日存設定</legend>
              <div className="quick-chip-row" role="group" aria-label="天數快捷">
                {DAY_QUICK.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`quick-chip ${days === String(value) ? 'is-active' : ''}`}
                    onClick={() => setDays(String(value))}
                  >
                    {value} 天
                  </button>
                ))}
              </div>
              <label className="field nested-field">
                <span>要存幾天？</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  required
                />
              </label>
            </fieldset>
          ) : null}

          {savingsMode === 'weekly' ? (
            <fieldset className="field deadline-field">
              <legend>周存設定</legend>
              <div className="quick-chip-row" role="group" aria-label="週數快捷">
                {WEEK_QUICK.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`quick-chip ${weeks === String(value) ? 'is-active' : ''}`}
                    onClick={() => setWeeks(String(value))}
                  >
                    {value} 週
                  </button>
                ))}
              </div>
              <label className="field nested-field">
                <span>要存幾週？</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  value={weeks}
                  onChange={(event) => setWeeks(event.target.value)}
                  required
                />
              </label>
            </fieldset>
          ) : null}

          {savingsMode === 'monthly' ? (
            <fieldset className="field deadline-field">
              <legend>月存設定</legend>
              <div className="quick-chip-row" role="group" aria-label="月數快捷">
                {MONTH_QUICK.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`quick-chip ${months === String(value) ? 'is-active' : ''}`}
                    onClick={() => setMonths(String(value))}
                  >
                    {value} 個月
                  </button>
                ))}
              </div>
              <label className="field nested-field">
                <span>要存幾個月？</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  value={months}
                  onChange={(event) => setMonths(event.target.value)}
                  required
                />
              </label>
            </fieldset>
          ) : null}

          {savingsMode === 'custom' ? (
            <fieldset className="field deadline-field">
              <legend>自訂節奏</legend>
              <label className="field nested-field">
                <span>每幾天存一次？</span>
                <div className="quick-chip-row" role="group" aria-label="間隔天數快捷">
                  {INTERVAL_QUICK.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`quick-chip ${customInterval === String(value) ? 'is-active' : ''}`}
                      onClick={() => setCustomInterval(String(value))}
                    >
                      每 {value} 天
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  value={customInterval}
                  onChange={(event) => setCustomInterval(event.target.value)}
                  required
                />
              </label>
              <label className="field nested-field">
                <span>一共存幾次？</span>
                <div className="quick-chip-row" role="group" aria-label="次數快捷">
                  {PERIOD_QUICK.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`quick-chip ${customPeriods === String(value) ? 'is-active' : ''}`}
                      onClick={() => setCustomPeriods(String(value))}
                    >
                      {value} 次
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  value={customPeriods}
                  onChange={(event) => setCustomPeriods(event.target.value)}
                  required
                />
              </label>
            </fieldset>
          ) : null}

          {planPreview ? (
            <p className="plan-suggest">
              建議每
              {savingsMode === 'daily'
                ? '天'
                : savingsMode === 'weekly'
                  ? '週'
                  : savingsMode === 'monthly'
                    ? '月'
                    : `${planPreview.interval} 天`}
              存入約 <strong>NT$ {planPreview.periodAmount.toLocaleString('zh-TW')}</strong>
              （共 {planPreview.periods} {planPreview.unit}／約 {planPreview.totalDays} 天）
            </p>
          ) : null}
          </div>

          <div className="modal-actions modal-actions-sticky">
            <button type="button" className="button button-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="button button-primary" disabled={!planPreview}>
              建立專案
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
