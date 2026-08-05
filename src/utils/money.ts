/** Parse a whole-dollar amount from user input. Accepts digits only (optional commas/spaces). */
export function parseAmount(value: FormDataEntryValue | string | null | undefined): number | null {
  if (value == null) return null

  const raw = String(value).trim()
  if (!raw) return null

  // Reject scientific notation / decimals from accidental number-input quirks
  if (!/^\d[\d,\s]*$/.test(raw)) return null

  const digits = raw.replace(/[,\s]/g, '')
  if (!digits) return null

  const amount = Number(digits)
  if (!Number.isSafeInteger(amount) || amount <= 0) return null

  return amount
}

export function formatAmount(amount: number) {
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}
