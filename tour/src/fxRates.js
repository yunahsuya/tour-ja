/** 1 單位外幣 ≈ 幾元台幣（參考值，可自行調整） */
export const TWD_PER_UNIT = {
  JPY: 0.2056,
  GBP: 42.35,
  EUR: 36.91,
  KRW: 0.02115,
  USD: 31.85,
}

export const FX_LABELS = {
  JPY: { zh: '日圓', sym: '¥' },
  GBP: { zh: '英鎊', sym: '£' },
  EUR: { zh: '歐元', sym: '€' },
  KRW: { zh: '韓元', sym: '₩' },
  USD: { zh: '美元', sym: '$' },
  TWD: { zh: '台幣', sym: 'NT$' },
}

/** 換算區與新增支出可選的外幣 */
export const WALLET_FX_CODES = ['JPY', 'USD']

export const FX_LAST_UPDATED = '2026/10/28'

export function parseAmountInput(s) {
  const n = parseFloat(String(s).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : NaN
}

export function toTwd(amountForeign, code) {
  if (code === 'TWD') return Math.round(amountForeign)
  const r = TWD_PER_UNIT[code]
  if (r == null || !Number.isFinite(amountForeign)) return NaN
  return Math.round(amountForeign * r)
}

export function fromTwd(twd, code) {
  if (code === 'TWD') return twd
  const r = TWD_PER_UNIT[code]
  if (r == null || !Number.isFinite(twd)) return NaN
  return twd / r
}

/** 由台幣回推外幣時的小數位數 */
export function formatForeignFromTwd(twd, code) {
  const v = fromTwd(twd, code)
  if (!Number.isFinite(v)) return ''
  if (code === 'KRW' || code === 'JPY') return String(Math.round(v))
  return (Math.round(v * 100) / 100).toFixed(2)
}

export function formatRateLine(code) {
  if (code === 'TWD') return '1 TWD = 1 TWD'
  const r = TWD_PER_UNIT[code]
  if (r == null) return ''
  if (code === 'KRW') return `100 ₩ ≈ ${(100 * r).toFixed(1)} TWD`
  if (code === 'JPY') return `100 ¥ ≈ ${(100 * r).toFixed(1)} TWD`
  const sym = FX_LABELS[code]?.sym ?? code
  return `1 ${sym} ${code} ≈ ${r} TWD`
}
