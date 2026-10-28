import { tripDriveLinks } from './data/trip.js'
import { touchLocalDataSavedCookie } from './localDataMarker.js'

const KEY = 'tour-drive-links-v1'
const SEEDED_KEY = 'tour-drive-links-seeded-v2'

const BUILTIN_IDS = new Set(tripDriveLinks.map((l) => l.id))
const LEGACY_BUILTIN_IDS = new Set([
  'drive-builtin-sheet',
  'drive-builtin-docs',
  'drive-builtin-tickets',
  'drive-builtin-flights',
  'drive-builtin-stay',
])

export const MAX_IMAGES_PER_ALBUM = 12

function seededDefaultLinks() {
  return tripDriveLinks.map((link) => ({
    id: link.id,
    label: link.label,
    href: typeof link.href === 'string' ? link.href : '',
    from:
      typeof link.from === 'string' && link.from.trim()
        ? link.from.trim()
        : 'Google Drive',
    imageIds: [],
  }))
}

function defaultDriveLinks() {
  return { links: seededDefaultLinks() }
}

export function newDriveLinkId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `drive-${crypto.randomUUID()}`
  }
  return `drive-${Date.now()}`
}

export function newDocImageId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `img-${crypto.randomUUID()}`
  }
  return `img-${Date.now()}`
}

/** @param {unknown} rawIds */
function normalizeImageIds(rawIds) {
  if (!Array.isArray(rawIds)) return []
  return rawIds
    .filter((id) => typeof id === 'string' && id.trim())
    .map((id) => id.trim())
    .slice(0, MAX_IMAGES_PER_ALBUM)
}

/** 僅正規化既有資料，不會自動補回已刪除的預設連結 */
export function normalizeDriveLinks(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.links)) {
    return { links: [] }
  }
  const links = data.links
    .filter((x) => x && typeof x.id === 'string' && typeof x.label === 'string')
    .map((x) => {
      const label = x.label.trim().slice(0, 120)
      if (!label) return null
      const href = typeof x.href === 'string' ? x.href.trim().slice(0, 2000) : ''
      const from =
        typeof x.from === 'string' && x.from.trim()
          ? x.from.trim().slice(0, 80)
          : href
            ? 'Google Drive'
            : '本機圖片'
      return {
        id: x.id.trim(),
        label,
        href,
        from,
        imageIds: normalizeImageIds(x.imageIds),
      }
    })
    .filter(Boolean)
  return { links }
}

function markSeeded() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // ignore
  }
}

function alreadySeeded() {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(SEEDED_KEY) === '1'
  } catch {
    return false
  }
}

function persistLinks(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
    markSeeded()
    touchLocalDataSavedCookie()
  } catch {
    markSeeded()
  }
}

/** 升級到機票／入境／住宿／票券四分類；保留使用者自訂項目 */
function withBuiltinSeedIfNeeded(data) {
  const normalized = normalizeDriveLinks(data)
  if (alreadySeeded()) return normalized

  const withoutLegacy = normalized.links.filter((l) => !LEGACY_BUILTIN_IDS.has(l.id))
  const ids = new Set(withoutLegacy.map((l) => l.id))
  const hasNewBuiltin = [...BUILTIN_IDS].some((id) => ids.has(id))
  const customs = withoutLegacy.filter((l) => !BUILTIN_IDS.has(l.id))
  const next = hasNewBuiltin
    ? { links: withoutLegacy }
    : { links: [...seededDefaultLinks(), ...customs] }
  persistLinks(next)
  return next
}

export function loadCustomDriveLinks() {
  if (typeof localStorage === 'undefined') return defaultDriveLinks()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const defaults = defaultDriveLinks()
      persistLinks(defaults)
      return defaults
    }
    return withBuiltinSeedIfNeeded(JSON.parse(raw))
  } catch {
    return defaultDriveLinks()
  }
}

export function saveCustomDriveLinks(data) {
  if (typeof localStorage === 'undefined') return
  persistLinks(normalizeDriveLinks(data))
}

export function addCustomDriveLink(data, { label, href, from }) {
  const entry = {
    id: newDriveLinkId(),
    label: String(label).trim().slice(0, 120) || '未命名連結',
    href: href != null ? String(href).trim().slice(0, 2000) : '',
    from:
      from != null && String(from).trim()
        ? String(from).trim().slice(0, 80)
        : String(href ?? '').trim()
          ? 'Google Drive'
          : '本機圖片',
    imageIds: [],
  }
  return { links: [...normalizeDriveLinks(data).links, entry] }
}

export function updateCustomDriveLink(data, id, { label, href, from }) {
  return {
    links: normalizeDriveLinks(data).links.map((link) => {
      if (link.id !== id) return link
      const next = { ...link }
      if (label != null) next.label = String(label).trim().slice(0, 120) || link.label
      if (href !== undefined) {
        next.href = href != null ? String(href).trim().slice(0, 2000) : ''
      }
      if (from !== undefined) {
        next.from =
          from != null && String(from).trim()
            ? String(from).trim().slice(0, 80)
            : next.href
              ? 'Google Drive'
              : '本機圖片'
      }
      return next
    }),
  }
}

export function removeCustomDriveLink(data, id) {
  return { links: normalizeDriveLinks(data).links.filter((link) => link.id !== id) }
}

/** @returns {{ links: ReturnType<typeof normalizeDriveLinks>['links'], addedId: string | null }} */
export function appendImageIdToAlbum(data, albumId, imageId) {
  let addedId = null
  const links = normalizeDriveLinks(data).links.map((link) => {
    if (link.id !== albumId) return link
    if (link.imageIds.includes(imageId)) return link
    if (link.imageIds.length >= MAX_IMAGES_PER_ALBUM) return link
    addedId = imageId
    return { ...link, imageIds: [...link.imageIds, imageId] }
  })
  return { links, addedId }
}

export function removeImageIdFromAlbum(data, albumId, imageId) {
  return {
    links: normalizeDriveLinks(data).links.map((link) => {
      if (link.id !== albumId) return link
      return { ...link, imageIds: link.imageIds.filter((id) => id !== imageId) }
    }),
  }
}
