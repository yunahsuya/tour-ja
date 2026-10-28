import { touchLocalDataSavedCookie } from './localDataMarker.js'

const KEY = 'tour-spots-v1'

/** @typedef {'food' | 'sight'} SpotCategory */

export const SPOT_CATEGORIES = [
  { id: 'food', label: '食物' },
  { id: 'sight', label: '景點' },
]

export const DEFAULT_SPOT_CATEGORY = 'sight'

/** @param {unknown} raw */
export function normalizeSpotCategory(raw) {
  const s = String(raw ?? '').trim()
  if (s === 'food' || s === 'eat' || s === '吃的' || s === '食物') return 'food'
  if (s === 'sight' || s === 'spot' || s === '景點') return 'sight'
  return DEFAULT_SPOT_CATEGORY
}

export function spotCategoryLabel(category) {
  const id = normalizeSpotCategory(category)
  return SPOT_CATEGORIES.find((c) => c.id === id)?.label ?? '景點'
}

function defaultSpots() {
  return { spots: [] }
}

/** @param {unknown} raw */
function normalizeSpot(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '').trim()
  if (!id) return null
  const title = String(raw.title ?? '').trim() || '未命名景點'
  const note = String(raw.note ?? '').trim()
  const mapUrl = String(raw.mapUrl ?? '').trim()
  const category = normalizeSpotCategory(raw.category)
  const createdAt = Number(raw.createdAt) || Date.now()
  /** @type {{ id: string, title: string, note: string, category: SpotCategory, createdAt: number, mapUrl?: string }} */
  const entry = { id, title, note, category, createdAt }
  if (mapUrl) entry.mapUrl = mapUrl
  return entry
}

export function normalizeSpots(data) {
  const list = Array.isArray(data?.spots) ? data.spots : []
  return {
    spots: list.map(normalizeSpot).filter(Boolean),
  }
}

export function loadSpots() {
  if (typeof localStorage === 'undefined') return defaultSpots()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSpots()
    const p = JSON.parse(raw)
    return normalizeSpots(p)
  } catch {
    return defaultSpots()
  }
}

export function saveSpots(data) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(normalizeSpots(data)))
    touchLocalDataSavedCookie()
  } catch {
    // ignore
  }
}

export function addSpot(data, { title, note, mapUrl, category }) {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `s-${Date.now()}`
  const mapTrim = mapUrl != null ? String(mapUrl).trim() : ''
  const entry = {
    id,
    title: title.trim() || '未命名景點',
    note: (note ?? '').trim(),
    category: normalizeSpotCategory(category),
    createdAt: Date.now(),
  }
  if (mapTrim) entry.mapUrl = mapTrim
  return normalizeSpots({
    spots: [...(data?.spots ?? []), entry],
  })
}

export function removeSpot(data, id) {
  return normalizeSpots({
    spots: (data?.spots ?? []).filter((s) => s.id !== id),
  })
}

export function updateSpot(data, id, { title, note, mapUrl, category }) {
  return normalizeSpots({
    spots: (data?.spots ?? []).map((s) => {
      if (s.id !== id) return s
      const next = { ...s }
      if (title != null) next.title = String(title).trim() || '未命名景點'
      if (note != null) next.note = String(note).trim()
      if (category !== undefined) next.category = normalizeSpotCategory(category)
      if (mapUrl !== undefined) {
        const m = String(mapUrl).trim()
        if (m) next.mapUrl = m
        else delete next.mapUrl
      }
      return next
    }),
  })
}
