import { regions } from './data/trip.js'
import { touchLocalDataSavedCookie } from './localDataMarker.js'
import { normalizeTripItemOrder } from './utils/tripFormat.js'

const STORAGE_KEY = 'tour-itinerary-v1'

function cloneDefault() {
  return structuredClone(regions)
}

/** @param {{ id?: string }[] | undefined} days */
function dayDateKeys(days) {
  return new Set(
    (Array.isArray(days) ? days : [])
      .map((d) => String(d?.id ?? '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1])
      .filter(Boolean),
  )
}

/** 只保留預設地區（台灣、日本）；丟掉倫敦／巴塞／首爾等舊資料 */
export function mergeTripWithDefaults(trip) {
  if (!Array.isArray(trip) || trip.length === 0) {
    return { trip: cloneDefault(), changed: true }
  }
  const savedById = new Map(trip.map((r) => [r.id, r]))
  const defaultIds = new Set(regions.map((r) => r.id))
  let changed = trip.some((r) => !defaultIds.has(r.id))
  const merged = regions.map((def) => {
    const existing = savedById.get(def.id)
    if (!existing) {
      changed = true
      return structuredClone(def)
    }
    // 既有地區與預設日期完全無交集時改用預設（例如舊台灣 5 月）
    const defKeys = dayDateKeys(def.days)
    const existingKeys = dayDateKeys(existing.days)
    const overlap = [...defKeys].some((k) => existingKeys.has(k))
    if (defKeys.size > 0 && !overlap) {
      changed = true
      return structuredClone(def)
    }
    return existing
  })
  return { trip: merged, changed }
}

/**
 * 同一地區內合併相同日期 label 的重複天
 * @returns {{ trip: typeof regions, changed: boolean, dayIdRemap: Map<string, string> }}
 */
export function collapseDuplicateDayLabels(trip) {
  const dayIdRemap = new Map()
  let changed = false
  const result = trip.map((region) => {
    const labelToKeeper = new Map()
    const kept = []
    for (const day of region.days) {
      const keeper = labelToKeeper.get(day.label)
      if (keeper) {
        keeper.day.items = [...keeper.day.items, ...day.items]
        dayIdRemap.set(day.id, keeper.day.id)
        changed = true
        continue
      }
      labelToKeeper.set(day.label, { day })
      kept.push(day)
    }
    return { ...region, days: kept }
  })
  return { trip: result, changed, dayIdRemap }
}

/** 預設文案更新：覆寫本機舊標題（不影響使用者自訂其他項目） */
const TITLE_MIGRATIONS = {
  '虎航：台北 → 小松': '虎航：台北 → 小松 (第一航廈)',
}

function migrateTripItemTitles(trip) {
  let changed = false
  const next = trip.map((region) => ({
    ...region,
    days: (region.days || []).map((day) => ({
      ...day,
      items: (day.items || []).map((item) => {
        const mapped = TITLE_MIGRATIONS[item?.title]
        if (!mapped || mapped === item.title) return item
        changed = true
        return { ...item, title: mapped }
      }),
    })),
  }))
  return { trip: next, changed }
}

/** 合併缺漏地區、去重日期、排序項目；有變更時寫回本機 */
export function prepareTripData(raw) {
  const { trip: merged, changed: mergeChanged } = mergeTripWithDefaults(raw)
  const {
    trip: deduped,
    changed: dedupeChanged,
    dayIdRemap,
  } = collapseDuplicateDayLabels(merged)
  const { trip: titled, changed: titleChanged } = migrateTripItemTitles(deduped)
  const ordered = normalizeTripItemOrder(titled)
  if (mergeChanged || dedupeChanged || titleChanged) saveTripData(ordered)
  return { trip: ordered, dayIdRemap }
}

export function loadTripData() {
  return loadTripDataWithMeta().trip
}

/** 載入行程並回傳合併重複日期時的 dayId 對照（供記帳遷移） */
export function loadTripDataWithMeta() {
  if (typeof localStorage === 'undefined') {
    return { trip: cloneDefault(), dayIdRemap: new Map() }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { trip: cloneDefault(), dayIdRemap: new Map() }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { trip: cloneDefault(), dayIdRemap: new Map() }
    }
    return prepareTripData(parsed)
  } catch {
    return { trip: cloneDefault(), dayIdRemap: new Map() }
  }
}

export function saveTripData(data) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    touchLocalDataSavedCookie()
  } catch {
    // quota or private mode
  }
}

export function clearTripStorage() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
