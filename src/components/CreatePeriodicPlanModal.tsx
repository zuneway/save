import { useEffect, useId, useMemo, useState } from 'react'
import type {
  CreatePeriodicPlanInput,
  PeriodicEndRule,
  PeriodicFrequency,
  PeriodicIntervalUnit,
} from '../types/periodic'
import type { ProjectFolder } from '../types/savings'
import { parseAmount } from '../utils/money'
import {
  defaultPeriodicStartDate,
  endRuleSummary,
  frequencyLabel,
  intervalUnitLabel,
  isValidPeriodicStartDate,
  resolvePeriodicInterval,
} from '../utils/periodic'

interface CreatePeriodicPlanModalProps {
  open: boolean
  folders?: ProjectFolder[]
  onClose: () => void
  onSubmit: (input: CreatePeriodicPlanInput) => void
}

const AMOUNT_QUICK = [500, 1000, 2000, 5000] as const
const PERIOD_QUICK = [12, 24, 36, 52] as const
const TARGET_QUICK = [12000, 24000, 60000, 120000] as const
const INTERVAL_QUICK_BY_UNIT: Record<PeriodicIntervalUnit, readonly number[]> = {
  days: [2, 3, 5, 10],
  weeks: [2, 3, 4, 6],
  months: [2, 3, 6, 12],
}

type EndMode = PeriodicEndRule['type']

export function CreatePeriodicPlanModal({
  open,
  folders = [],
  onClose,
  onSubmit,
}: CreatePeriodicPlanModalProps) {
  const titleId = useId()
  const [frequency, setFrequency] = useState<PeriodicFrequency>('daily')
  const [customUnit, setCustomUnit] = useState<PeriodicIntervalUnit>('days')
  const [customInterval, setCustomInterval] = useState('3')
  const [amount, setAmount] = useState('')
  const [startDate, setStartDate] = useState(defaultPeriodicStartDate())
  const [endMode, setEndMode] = useState<EndMode>('open')
  const [periods, setPeriods] = useState('12')
  const [targetAmount, setTargetAmount] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (!open) return
    setFrequency('daily')
    setCustomUnit('days')
    setCustomInterval('3')
    setAmount('')
    setStartDate(defaultPeriodicStartDate())
    setEndMode('open')
    setPeriods('12')
    setTargetAmount('')
    setEndDate('')
  }, [open])

  const parsedAmount = parseAmount(amount)
  const parsedPeriods = parseAmount(periods)
  const parsedTarget = parseAmount(targetAmount)
  const parsedCustomInterval = parseAmount(customInterval)
  const resolved = resolvePeriodicInterval(
    frequency,
    parsedCustomInterval ?? undefined,
    customUnit,
  )

  const endRule = useMemo((): PeriodicEndRule | null => {
    if (endMode === 'open') return { type: 'open' }
    if (endMode === 'periods' && parsedPeriods != null && parsedPeriods >= 1) {
      return { type: 'periods', periods: parsedPeriods }
    }
    if (endMode === 'target' && parsedTarget != null && parsedTarget >= 1) {
      return { type: 'target', targetAmount: parsedTarget }
    }
    if (endMode === 'date' && isValidPeriodicStartDate(endDate)) {
      return { type: 'date', date: endDate }
    }
    return null
  }, [endMode, parsedPeriods, parsedTarget, endDate])

  const frequencyReady =
    frequency !== 'custom' || (parsedCustomInterval != null && parsedCustomInterval >= 1)

  const preview =
    parsedAmount != null && endRule && frequencyReady
      ? `${frequencyLabel(frequency, resolved.intervalCount, resolved.intervalUnit)}存入 NT$ ${parsedAmount.toLocaleString('zh-TW')} · ${endRuleSummary(endRule)}`
      : null

  if (!open) return null

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const note = String(formData.get('note') ?? '').trim() || undefined
    const folderValue = String(formData.get('folderId') ?? '')
    const folderId = folderValue === '' ? null : folderValue
    if (parsedAmount == null || !endRule || !isValidPeriodicStartDate(startDate)) return
    if (!frequencyReady) return
    if (endRule.type === 'date' && endRule.date < startDate) return

    onSubmit({
      amount: parsedAmount,
      frequency,
      intervalCount: resolved.intervalCount,
      intervalUnit: resolved.intervalUnit,
      startDate,
      endRule,
      note,
      folderId,
    })
    onClose()
  }

  const unitWord = intervalUnitLabel(customUnit)

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
          <h2 id={titleId}>建立定期儲蓄</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <form className="modal-form create-project-form" onSubmit={handleSubmit}>
          <div className="modal-scroll-body">
            <fieldset className="field deadline-field">
              <legend>存入頻率</legend>
              <div className="deadline-toggle plan-toggle-4" role="radiogroup" aria-label="存入頻率">
                {(
                  [
                    ['daily', '每日'],
                    ['weekly', '每周'],
                    ['monthly', '每月'],
                    ['custom', '自訂'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`deadline-option ${frequency === value ? 'is-active' : ''}`}
                    onClick={() => setFrequency(value)}
                    aria-pressed={frequency === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="field-hint">
                {frequency === 'daily'
                  ? '每天存一次，適合小額累積。'
                  : frequency === 'weekly'
                    ? '每週存一次。'
                    : frequency === 'monthly'
                      ? '每月存一次。'
                      : '自訂每隔幾日、幾周或幾月存一次。'}
              </p>

              {frequency === 'custom' ? (
                <>
                  <div className="deadline-toggle plan-toggle" role="radiogroup" aria-label="自訂單位">
                    {(
                      [
                        ['days', '每隔幾日'],
                        ['weeks', '每隔幾周'],
                        ['months', '每隔幾月'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`deadline-option ${customUnit === value ? 'is-active' : ''}`}
                        onClick={() => {
                          setCustomUnit(value)
                          setCustomInterval(String(INTERVAL_QUICK_BY_UNIT[value][0]))
                        }}
                        aria-pressed={customUnit === value}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="quick-chip-row" role="group" aria-label="自訂間隔快捷">
                    {INTERVAL_QUICK_BY_UNIT[customUnit].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`quick-chip ${customInterval === String(value) ? 'is-active' : ''}`}
                        onClick={() => setCustomInterval(String(value))}
                      >
                        每隔 {value} {unitWord}
                      </button>
                    ))}
                  </div>
                  <label className="field">
                    <span>每隔幾{unitWord}存一次</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]+"
                      placeholder="例如：3"
                      autoComplete="off"
                      required
                      value={customInterval}
                      onChange={(event) => setCustomInterval(event.target.value)}
                    />
                  </label>
                </>
              ) : null}
            </fieldset>

            <label className="field">
              <span>備註（選填）</span>
              <textarea name="note" rows={2} placeholder="例如：發薪日當天轉帳" autoComplete="off" />
            </label>

            {folders.length > 0 ? (
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
            ) : null}

            <label className="field">
              <span>每期金額（NT$）</span>
              <div className="quick-chip-row" role="group" aria-label="每期金額快捷">
                {AMOUNT_QUICK.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`quick-chip ${amount === String(value) ? 'is-active' : ''}`}
                    onClick={() => setAmount(String(value))}
                  >
                    {value.toLocaleString('zh-TW')}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                placeholder="例如：3000"
                autoComplete="off"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>

            <label className="field">
              <span>開始日期</span>
              <input
                type="date"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <fieldset className="field deadline-field">
              <legend>結束方式</legend>
              <div className="deadline-toggle plan-toggle-4" role="radiogroup" aria-label="結束方式">
                {(
                  [
                    ['open', '持續'],
                    ['periods', '期數'],
                    ['target', '目標'],
                    ['date', '日期'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`deadline-option ${endMode === value ? 'is-active' : ''}`}
                    onClick={() => setEndMode(value)}
                    aria-pressed={endMode === value}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {endMode === 'periods' ? (
                <>
                  <div className="quick-chip-row" role="group" aria-label="期數快捷">
                    {PERIOD_QUICK.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`quick-chip ${periods === String(value) ? 'is-active' : ''}`}
                        onClick={() => setPeriods(String(value))}
                      >
                        {value} 期
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    placeholder="例如：24"
                    autoComplete="off"
                    required
                    value={periods}
                    onChange={(event) => setPeriods(event.target.value)}
                  />
                </>
              ) : null}

              {endMode === 'target' ? (
                <>
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    placeholder="例如：60000"
                    autoComplete="off"
                    required
                    value={targetAmount}
                    onChange={(event) => setTargetAmount(event.target.value)}
                  />
                </>
              ) : null}

              {endMode === 'date' ? (
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              ) : null}

              {endMode === 'open' ? (
                <p className="field-hint">不設結束日，之後可隨時刪除計畫。</p>
              ) : null}
            </fieldset>

            {preview ? <p className="plan-preview">{preview}</p> : null}
          </div>

          <div className="modal-actions modal-actions-sticky">
            <button type="button" className="button button-secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={
                !parsedAmount || !endRule || !frequencyReady || !isValidPeriodicStartDate(startDate)
              }
            >
              建立計畫
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
