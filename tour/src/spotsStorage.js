import { touchLocalDataSavedCookie } from './localDataMarker.js'
import { normalizeItemImageIds } from './utils/tripItemImages.js'

const KEY = 'tour-spots-v1'

/** @typedef {{ id: string, label: string }} SpotCategoryDef */

export const DEFAULT_SPOT_CATEGORIES = [
  { id: 'food', label: '食物' },
  { id: 'sight', label: '景點' },
]

/** @deprecated 請改用資料內的 categories；保留給舊程式參考預設值 */
export const SPOT_CATEGORIES = DEFAULT_SPOT_CATEGORIES

export const DEFAULT_SPOT_CATEGORY = 'sight'

function newCategoryId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `c-${crypto.randomUUID()}`
  }
  return `c-${Date.now()}`
}

/** @param {unknown} raw */
export function normalizeCategories(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SPOT_CATEGORIES.map((c) => ({ ...c }))
  }
  const seen = new Set()
  /** @type {SpotCategoryDef[]} */
  const out = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    let id = String(item.id ?? '').trim()
    const label = String(item.label ?? '')
      .trim()
      .slice(0, 40)
    if (!label) continue
    if (id === 'eat') id = 'food'
    if (id === 'spot') id = 'sight'
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, label })
  }
  return out.length ? out : DEFAULT_SPOT_CATEGORIES.map((c) => ({ ...c }))
}

/** @param {SpotCategoryDef[]} categories */
function fallbackCategoryId(categories) {
  if (categories.some((c) => c.id === DEFAULT_SPOT_CATEGORY)) {
    return DEFAULT_SPOT_CATEGORY
  }
  return categories[0]?.id ?? DEFAULT_SPOT_CATEGORY
}

/**
 * @param {unknown} raw
 * @param {SpotCategoryDef[]} [categories]
 */
export function normalizeSpotCategory(raw, categories) {
  const s = String(raw ?? '').trim()
  if (s === 'food' || s === 'eat' || s === '吃的' || s === '食物') return 'food'
  if (s === 'sight' || s === 'spot' || s === '景點') return 'sight'

  if (categories?.length) {
    if (categories.some((c) => c.id === s)) return s
    const byLabel = categories.find((c) => c.label === s)
    if (byLabel) return byLabel.id
    return fallbackCategoryId(categories)
  }

  if (s) return s
  return DEFAULT_SPOT_CATEGORY
}

/**
 * @param {unknown} category
 * @param {SpotCategoryDef[]} [categories]
 */
export function spotCategoryLabel(category, categories = DEFAULT_SPOT_CATEGORIES) {
  const cats = categories?.length ? categories : DEFAULT_SPOT_CATEGORIES
  const id = normalizeSpotCategory(category, cats)
  return cats.find((c) => c.id === id)?.label ?? id
}

function defaultSpots() {
  return {
    categories: DEFAULT_SPOT_CATEGORIES.map((c) => ({ ...c })),
    spots: [],
  }
}

/**
 * @param {unknown} raw
 * @param {SpotCategoryDef[]} categories
 */
function normalizeSpot(raw, categories) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '').trim()
  if (!id) return null
  const title = String(raw.title ?? '').trim() || '未命名景點'
  const note = String(raw.note ?? '').trim()
  const mapUrl = String(raw.mapUrl ?? '').trim()
  const category = normalizeSpotCategory(raw.category, categories)
  const createdAt = Number(raw.createdAt) || Date.now()
  const imageIds = normalizeItemImageIds(raw.imageIds)
  /** @type {{ id: string, title: string, note: string, category: string, createdAt: number, mapUrl?: string, imageIds?: string[] }} */
  const entry = { id, title, note, category, createdAt }
  if (mapUrl) entry.mapUrl = mapUrl
  if (imageIds.length) entry.imageIds = imageIds
  return entry
}

export function normalizeSpots(data) {
  const categories = normalizeCategories(data?.categories)
  const list = Array.isArray(data?.spots) ? data.spots : []
  return {
    categories,
    spots: list.map((raw) => normalizeSpot(raw, categories)).filter(Boolean),
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

export function addSpot(data, { title, note, mapUrl, category, imageIds }) {
  const base = normalizeSpots(data)
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `s-${Date.now()}`
  const mapTrim = mapUrl != null ? String(mapUrl).trim() : ''
  const imgs = normalizeItemImageIds(imageIds)
  const entry = {
    id,
    title: title.trim() || '未命名景點',
    note: (note ?? '').trim(),
    category: normalizeSpotCategory(category, base.categories),
    createdAt: Date.now(),
  }
  if (mapTrim) entry.mapUrl = mapTrim
  if (imgs.length) entry.imageIds = imgs
  return normalizeSpots({
    categories: base.categories,
    spots: [...base.spots, entry],
  })
}

export function removeSpot(data, id) {
  const base = normalizeSpots(data)
  return normalizeSpots({
    categories: base.categories,
    spots: base.spots.filter((s) => s.id !== id),
  })
}

export function updateSpot(data, id, { title, note, mapUrl, category, imageIds }) {
  const base = normalizeSpots(data)
  return normalizeSpots({
    categories: base.categories,
    spots: base.spots.map((s) => {
      if (s.id !== id) return s
      const next = { ...s }
      if (title != null) next.title = String(title).trim() || '未命名景點'
      if (note != null) next.note = String(note).trim()
      if (category !== undefined) {
        next.category = normalizeSpotCategory(category, base.categories)
      }
      if (mapUrl !== undefined) {
        const m = String(mapUrl).trim()
        if (m) next.mapUrl = m
        else delete next.mapUrl
      }
      if (imageIds !== undefined) {
        const imgs = normalizeItemImageIds(imageIds)
        if (imgs.length) next.imageIds = imgs
        else delete next.imageIds
      }
      return next
    }),
  })
}

/**
 * @param {ReturnType<typeof normalizeSpots>} data
 * @param {string} label
 * @returns {{ data: ReturnType<typeof normalizeSpots>, addedId: string | null }}
 */
export function addSpotCategory(data, label) {
  const base = normalizeSpots(data)
  const trimmed = String(label ?? '')
    .trim()
    .slice(0, 40)
  if (!trimmed) return { data: base, addedId: null }
  const dup = base.categories.find((c) => c.label === trimmed)
  if (dup) return { data: base, addedId: dup.id }
  const id = newCategoryId()
  return {
    data: normalizeSpots({
      categories: [...base.categories, { id, label: trimmed }],
      spots: base.spots,
    }),
    addedId: id,
  }
}

/**
 * 刪除分類；該分類下的景點會改掛到預設／剩餘第一個分類。
 * 至少保留一個分類。
 * @returns {{ data: ReturnType<typeof normalizeSpots>, removed: boolean, fallbackId: string | null }}
 */
export function removeSpotCategory(data, categoryId) {
  const base = normalizeSpots(data)
  if (base.categories.length <= 1) {
    return { data: base, removed: false, fallbackId: null }
  }
  if (!base.categories.some((c) => c.id === categoryId)) {
    return { data: base, removed: false, fallbackId: null }
  }
  const categories = base.categories.filter((c) => c.id !== categoryId)
  const fallbackId = fallbackCategoryId(categories)
  return {
    data: normalizeSpots({
      categories,
      spots: base.spots.map((s) =>
        s.category === categoryId ? { ...s, category: fallbackId } : s,
      ),
    }),
    removed: true,
    fallbackId,
  }
}

/** 重設為預設「食物／景點」；自訂分類移除，其下景點改掛預設。 */
export function restoreDefaultSpotCategories(data) {
  const base = normalizeSpots(data)
  const categories = DEFAULT_SPOT_CATEGORIES.map((c) => ({ ...c }))
  return normalizeSpots({
    categories,
    spots: base.spots.map((s) => ({
      ...s,
      category: normalizeSpotCategory(s.category, categories),
    })),
  })
}
