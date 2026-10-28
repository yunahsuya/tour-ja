import { isValidShareCode, normalizeShareCode } from './shareCodeUtils.js'

let activeShareCode = ''
let cloudReady = false
const listeners = new Set()

function notify() {
  for (const fn of listeners) {
    try {
      fn()
    } catch {
      /* ignore */
    }
  }
}

/** @param {{ shareCode?: string, ready?: boolean }} ctx */
export function setDocImagesCloudContext(ctx) {
  const nextCode = normalizeShareCode(ctx?.shareCode ?? '')
  const nextReady = Boolean(ctx?.ready)
  if (nextCode === activeShareCode && nextReady === cloudReady) return
  activeShareCode = nextCode
  cloudReady = nextReady
  notify()
}

export function getDocImagesCloudContext() {
  const shareCode = activeShareCode
  return {
    shareCode,
    ready: cloudReady && isValidShareCode(shareCode),
  }
}

/** @param {() => void} listener */
export function subscribeDocImagesCloudContext(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
