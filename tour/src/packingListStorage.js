import {
  PACKING_CHECKLIST_SECTIONS,
  PACKING_REFERENCE_BLOCK_ORDER,
  buildDefaultReferenceBlocks,
} from './data/packingList.js'
import { PACKING_DEFAULT_PROFILE_ID, PACKING_PROFILES } from './constants/packingProfiles.js'
import { touchLocalDataSavedCookie } from './localDataMarker.js'

const KEY_V4 = 'tour-packing-state-v4'
const KEY_V3 = 'tour-packing-state-v3'
const KEY_V2 = 'tour-packing-checked-v2'

const SECTION_IDS = new Set(PACKING_CHECKLIST_SECTIONS.map((s) => s.id))
const PROFILE_IDS = new Set(PACKING_PROFILES.map((p) => p.id))

/** 每位家人只各自保留勾選；清單項目本身全家共用 */
function emptyProfile() {
  return {
    checked: new Set(),
  }
}

function emptySharedChecklist() {
  return {
    customsBySection: {},
    hiddenDefaultIds: new Set(),
    labelOverrides: {},
  }
}

function normalizeCustoms(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const sid of SECTION_IDS) {
    const list = raw[sid]
    if (!Array.isArray(list)) continue
    out[sid] = list
      .filter((x) => x && typeof x.id === 'string' && typeof x.label === 'string' && x.label.trim())
      .map((x) => ({ id: x.id.trim(), label: x.label.trim().slice(0, 200) }))
  }
  return out
}

function normalizeLabelOverrides(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k === 'string' && typeof v === 'string' && v.trim()) {
      out[k.trim()] = v.trim().slice(0, 200)
    }
  }
  return out
}

function normalizeHiddenIds(raw) {
  return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [])
}

function mergeCustoms(...parts) {
  const out = {}
  const seen = {}
  for (const sid of SECTION_IDS) {
    out[sid] = []
    seen[sid] = new Set()
  }
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue
    for (const sid of SECTION_IDS) {
      const list = part[sid]
      if (!Array.isArray(list)) continue
      for (const row of list) {
        if (!row?.id || seen[sid].has(row.id)) continue
        seen[sid].add(row.id)
        out[sid].push(row)
      }
    }
  }
  for (const sid of SECTION_IDS) {
    if (!out[sid].length) delete out[sid]
  }
  return out
}

function parseProfileSlice(data) {
  if (!data || typeof data !== 'object') return emptyProfile()
  return {
    checked: new Set(
      Array.isArray(data.checked) ? data.checked.filter((x) => typeof x === 'string') : [],
    ),
  }
}

/** 舊版把自訂項目存在各 profile 內；合併成共用清單 */
function extractLegacySharedFromProfiles(profilesRaw) {
  if (!profilesRaw || typeof profilesRaw !== 'object') return emptySharedChecklist()
  const customsParts = []
  const hidden = new Set()
  const labelOverrides = {}
  for (const { id } of PACKING_PROFILES) {
    const slice = profilesRaw[id]
    if (!slice || typeof slice !== 'object') continue
    customsParts.push(normalizeCustoms(slice.customs))
    for (const hid of normalizeHiddenIds(slice.hiddenDefaults)) hidden.add(hid)
    Object.assign(labelOverrides, normalizeLabelOverrides(slice.labelOverrides))
  }
  return {
    customsBySection: mergeCustoms(...customsParts),
    hiddenDefaultIds: hidden,
    labelOverrides,
  }
}

function parseSharedChecklist(p) {
  const hasRootShared =
    (p.customs && typeof p.customs === 'object') ||
    Array.isArray(p.hiddenDefaults) ||
    (p.labelOverrides && typeof p.labelOverrides === 'object')

  if (hasRootShared) {
    return {
      customsBySection: normalizeCustoms(p.customs),
      hiddenDefaultIds: normalizeHiddenIds(p.hiddenDefaults),
      labelOverrides: normalizeLabelOverrides(p.labelOverrides),
    }
  }
  return extractLegacySharedFromProfiles(p.profiles)
}

function serializeSharedChecklist(state) {
  const customs = {}
  for (const sid of SECTION_IDS) {
    const list = state.customsBySection?.[sid]
    if (list?.length) customs[sid] = list
  }
  const labelOverrides = {}
  if (state.labelOverrides && typeof state.labelOverrides === 'object') {
    for (const [k, v] of Object.entries(state.labelOverrides)) {
      if (typeof v === 'string' && v.trim()) labelOverrides[k] = v
    }
  }
  return {
    customs,
    hiddenDefaults: [...(state.hiddenDefaultIds ?? [])],
    labelOverrides,
  }
}

function serializeProfileSlice(slice) {
  return {
    checked: [...(slice?.checked ?? [])],
  }
}

function allProfilesEmpty() {
  const profiles = {}
  for (const { id } of PACKING_PROFILES) {
    profiles[id] = emptyProfile()
  }
  return profiles
}

export function newRefBulletId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `ref-bullet-${crypto.randomUUID()}`
  }
  return `ref-bullet-${Date.now()}`
}

function parseReferenceBlocks(raw) {
  const defaults = buildDefaultReferenceBlocks()
  if (!raw || typeof raw !== 'object') return defaults
  const out = {}
  for (const key of PACKING_REFERENCE_BLOCK_ORDER) {
    const b = raw[key]
    const def = defaults[key]
    if (!b || typeof b !== 'object') {
      out[key] = def
      continue
    }
    const title =
      typeof b.title === 'string' && b.title.trim()
        ? b.title.trim().slice(0, 200)
        : def.title
    const note = typeof b.note === 'string' ? b.note.slice(0, 1000) : def.note ?? ''

    const bullets = []
    if (Array.isArray(b.bullets)) {
      for (const row of b.bullets) {
        if (bullets.length >= 150) break
        if (row && typeof row === 'object' && typeof row.text === 'string' && row.text.trim()) {
          const id =
            typeof row.id === 'string' && row.id.trim()
              ? row.id.trim().slice(0, 100)
              : newRefBulletId()
          bullets.push({ id, text: row.text.trim().slice(0, 1500) })
        }
      }
    }
    out[key] = { title, note, bullets }
  }
  return out
}

function emptyPackingState() {
  return {
    activeProfileId: PACKING_DEFAULT_PROFILE_ID,
    profiles: allProfilesEmpty(),
    ...emptySharedChecklist(),
    referenceBlocks: buildDefaultReferenceBlocks(),
  }
}

function parsePackingPayload(p) {
  const profiles = allProfilesEmpty()
  if (p.profiles && typeof p.profiles === 'object') {
    for (const { id } of PACKING_PROFILES) {
      profiles[id] = p.profiles[id] ? parseProfileSlice(p.profiles[id]) : emptyProfile()
    }
  }
  const active =
    typeof p.activeProfileId === 'string' && PROFILE_IDS.has(p.activeProfileId)
      ? p.activeProfileId
      : PACKING_DEFAULT_PROFILE_ID
  const shared = parseSharedChecklist(p)
  const referenceBlocks = parseReferenceBlocks(p.reference)
  return {
    activeProfileId: active,
    profiles,
    customsBySection: shared.customsBySection,
    hiddenDefaultIds: shared.hiddenDefaultIds,
    labelOverrides: shared.labelOverrides,
    referenceBlocks,
  }
}

function parseFullState(raw) {
  return parsePackingPayload(JSON.parse(raw))
}

/** 可寫入 Firestore 的純 JSON 行李清單快照 */
export function packingStateToJson(state) {
  const profiles = {}
  for (const { id } of PACKING_PROFILES) {
    profiles[id] = serializeProfileSlice(state.profiles[id] ?? emptyProfile())
  }
  const refObj = {}
  for (const key of PACKING_REFERENCE_BLOCK_ORDER) {
    const b = state.referenceBlocks?.[key]
    if (!b) continue
    refObj[key] = {
      title: typeof b.title === 'string' ? b.title : '',
      note: typeof b.note === 'string' ? b.note : '',
      bullets: Array.isArray(b.bullets)
        ? b.bullets.map(({ id, text }) => ({
            id: typeof id === 'string' ? id : newRefBulletId(),
            text: typeof text === 'string' ? text : '',
          }))
        : [],
    }
  }
  const shared = serializeSharedChecklist(state)
  return {
    activeProfileId: state.activeProfileId,
    profiles,
    customs: shared.customs,
    hiddenDefaults: shared.hiddenDefaults,
    labelOverrides: shared.labelOverrides,
    reference: refObj,
  }
}

export function packingStateFromJson(data) {
  if (!data || typeof data !== 'object') return null
  try {
    return parsePackingPayload(data)
  } catch {
    return null
  }
}

export function persistPackingState(state) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY_V4, JSON.stringify(packingStateToJson(state)))
    touchLocalDataSavedCookie()
  } catch {
    // ignore
  }
}

function migrateFromV3Single(raw3) {
  const old = JSON.parse(raw3)
  const checked = new Set(
    Array.isArray(old.checked) ? old.checked.filter((x) => typeof x === 'string') : [],
  )
  const profiles = allProfilesEmpty()
  profiles[PACKING_DEFAULT_PROFILE_ID] = { checked }
  const state = {
    activeProfileId: PACKING_DEFAULT_PROFILE_ID,
    profiles,
    customsBySection: normalizeCustoms(old.customs),
    hiddenDefaultIds: new Set(),
    labelOverrides: {},
    referenceBlocks: buildDefaultReferenceBlocks(),
  }
  persistPackingState(state)
  try {
    localStorage.removeItem(KEY_V3)
  } catch {
    // ignore
  }
  return state
}

function migrateFromV2(raw2) {
  const arr = JSON.parse(raw2)
  const checked = new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [])
  const profiles = allProfilesEmpty()
  profiles[PACKING_DEFAULT_PROFILE_ID] = { checked }
  const state = {
    activeProfileId: PACKING_DEFAULT_PROFILE_ID,
    profiles,
    ...emptySharedChecklist(),
    referenceBlocks: buildDefaultReferenceBlocks(),
  }
  persistPackingState(state)
  try {
    localStorage.removeItem(KEY_V2)
  } catch {
    // ignore
  }
  return state
}

export function loadPackingState() {
  if (typeof localStorage === 'undefined') {
    return emptyPackingState()
  }
  try {
    const raw4 = localStorage.getItem(KEY_V4)
    if (raw4) return parseFullState(raw4)

    const raw3 = localStorage.getItem(KEY_V3)
    if (raw3) return migrateFromV3Single(raw3)

    const raw2 = localStorage.getItem(KEY_V2)
    if (raw2) return migrateFromV2(raw2)
  } catch {
    // ignore
  }
  return emptyPackingState()
}

/** 依名稱真的移除自訂項目（僅供明確要求時使用） */
export function purgeCustomItemsByLabel(state, label) {
  const target = String(label ?? '').trim()
  if (!target || !state) return { state, removed: 0 }
  const customs = state.customsBySection ?? {}
  let removed = 0
  const nextCustoms = {}
  const removedIds = new Set()
  for (const [sid, list] of Object.entries(customs)) {
    if (!Array.isArray(list)) {
      nextCustoms[sid] = list
      continue
    }
    const kept = list.filter((x) => {
      if (x && String(x.label).trim() === target) {
        removed += 1
        if (x.id) removedIds.add(x.id)
        return false
      }
      return true
    })
    if (kept.length) nextCustoms[sid] = kept
  }
  if (!removed) return { state, removed: 0 }
  const nextHidden = new Set(state.hiddenDefaultIds ?? [])
  for (const id of removedIds) nextHidden.delete(id)
  const nextProfiles = { ...state.profiles }
  for (const { id: pid } of PACKING_PROFILES) {
    const slice = nextProfiles[pid]
    if (!slice?.checked) continue
    let touched = false
    const nextChecked = new Set(slice.checked)
    for (const id of removedIds) {
      if (nextChecked.delete(id)) touched = true
    }
    if (touched) nextProfiles[pid] = { ...slice, checked: nextChecked }
  }
  return {
    state: {
      ...state,
      profiles: nextProfiles,
      customsBySection: nextCustoms,
      hiddenDefaultIds: nextHidden,
    },
    removed,
  }
}

export function newCustomItemId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pack-custom-${crypto.randomUUID()}`
  }
  return `pack-custom-${Date.now()}`
}
