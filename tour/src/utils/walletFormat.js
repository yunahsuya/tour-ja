import { FX_LABELS } from '../fxRates.js'
import { entryTotalTwd } from '../walletStorage.js'

export function formatWalletDateLine(day) {
  if (!day) return ''
  const m = String(day.label).match(/^(\d{1,2}\/\d{1,2})/)
  if (m) return m[1]
  if (day.id && /^\d{4}-\d{2}-\d{2}$/.test(day.id)) {
    const [, mo, d] = day.id.split('-')
    return `${mo}/${d}`
  }
  return day.label ?? ''
}

function formatWalletAmountPart(e) {
  const total = entryTotalTwd(e)
  let s = `NT$ ${total.toLocaleString('zh-TW')}`
  if (e.fee > 0) {
    s += `（含手續費 ${Number(e.fee).toLocaleString('zh-TW')}）`
  }
  if (e.foreignCurrency && e.foreignAmount != null) {
    const L = FX_LABELS[e.foreignCurrency]
    const sym = L?.sym ?? ''
    s += `（${e.foreignAmount} ${sym} ${e.foreignCurrency}）`
  }
  return s
}

export function formatWalletEntryDisplay(e) {
  const payer = e.paidBy ? `${e.paidBy}付` : null
  const amount = formatWalletAmountPart(e)
  return payer ? `${e.note} · ${payer} · ${amount}` : `${e.note} · ${amount}`
}

/** 付款人細項列（累積模式，已依付款人篩選） */
export function formatWalletPayerDetailRow(dayLabel, e) {
  return `${dayLabel} · ${e.note} · ${formatWalletAmountPart(e)}`
}
