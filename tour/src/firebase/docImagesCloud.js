import { getApps, initializeApp } from 'firebase/app'
import {
  deleteObject,
  getBlob,
  getMetadata,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { getDocImage, putDocImage } from '../docImagesDb.js'
import { getFirebaseConfig, isFirebaseConfigured } from './config.js'
import { getDocImagesCloudContext } from './docImagesCloudContext.js'
import { isValidShareCode, normalizeShareCode } from './shareCodeUtils.js'

function storagePath(shareCode, imageId) {
  return `sharedTours/${shareCode}/images/${imageId}.jpg`
}

function getStorageOrNull() {
  if (!isFirebaseConfigured()) return null
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(getFirebaseConfig())
    return getStorage(app)
  } catch {
    return null
  }
}

/**
 * 上傳圖檔到 Firebase Storage（需已加入共用代碼且 Storage 可用）
 * @param {string} imageId
 * @param {Blob} blob
 * @param {{ name?: string, mime?: string, shareCode?: string }} [meta]
 */
export async function uploadDocImageToCloud(imageId, blob, meta = {}) {
  const ctx = getDocImagesCloudContext()
  const code = normalizeShareCode(meta.shareCode ?? ctx.shareCode)
  if (!isValidShareCode(code) || !blob || !imageId) return false
  const storage = getStorageOrNull()
  if (!storage) return false

  const objectRef = ref(storage, storagePath(code, imageId))
  await uploadBytes(objectRef, blob, {
    contentType: meta.mime || blob.type || 'image/jpeg',
    customMetadata: {
      name: String(meta.name || 'photo.jpg').slice(0, 180),
    },
  })
  return true
}

/**
 * 若本機已有圖且雲端尚無，則上傳（建立／加入共用後補同步）
 * @param {string} shareCode
 * @param {string[]} imageIds
 */
export async function uploadPendingLocalImages(shareCode, imageIds) {
  const code = normalizeShareCode(shareCode)
  if (!isValidShareCode(code)) return { uploaded: 0, skipped: 0, failed: 0 }
  const storage = getStorageOrNull()
  if (!storage) return { uploaded: 0, skipped: 0, failed: 0 }

  let uploaded = 0
  let skipped = 0
  let failed = 0
  const ids = [...new Set((imageIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean))]

  for (const imageId of ids) {
    try {
      const local = await getDocImage(imageId)
      if (!local?.blob) {
        skipped += 1
        continue
      }
      const objectRef = ref(storage, storagePath(code, imageId))
      try {
        await getMetadata(objectRef)
        skipped += 1
        continue
      } catch {
        /* 雲端尚無 → 上傳 */
      }
      await uploadBytes(objectRef, local.blob, {
        contentType: local.mime || local.blob.type || 'image/jpeg',
        customMetadata: {
          name: String(local.name || 'photo.jpg').slice(0, 180),
        },
      })
      uploaded += 1
    } catch (err) {
      failed += 1
      console.warn('[tour] 圖片雲端補傳失敗', imageId, err)
    }
  }

  return { uploaded, skipped, failed }
}

/**
 * 從雲端下載並寫入本機 IndexedDB 快取
 * @param {string} imageId
 * @param {string} [shareCode]
 */
export async function downloadDocImageToCache(imageId, shareCode) {
  const ctx = getDocImagesCloudContext()
  const code = normalizeShareCode(shareCode ?? ctx.shareCode)
  if (!isValidShareCode(code) || !imageId) return null
  const storage = getStorageOrNull()
  if (!storage) return null

  const objectRef = ref(storage, storagePath(code, imageId))
  const blob = await getBlob(objectRef)
  let name = 'photo.jpg'
  let mime = blob.type || 'image/jpeg'
  try {
    const meta = await getMetadata(objectRef)
    if (meta.customMetadata?.name) name = meta.customMetadata.name
    if (meta.contentType) mime = meta.contentType
  } catch {
    /* ignore meta */
  }
  const record = {
    albumId: 'cloud',
    name,
    mime,
    blob,
    createdAt: Date.now(),
    fromCloud: true,
  }
  await putDocImage(imageId, record)
  return { id: imageId, ...record }
}

/** @param {string} imageId @param {string} [shareCode] */
export async function deleteDocImageFromCloud(imageId, shareCode) {
  const ctx = getDocImagesCloudContext()
  const code = normalizeShareCode(shareCode ?? ctx.shareCode)
  if (!isValidShareCode(code) || !imageId) return
  const storage = getStorageOrNull()
  if (!storage) return
  try {
    await deleteObject(ref(storage, storagePath(code, imageId)))
  } catch (err) {
    // 物件不存在時可忽略
    if (err?.code !== 'storage/object-not-found') {
      console.warn('[tour] 雲端圖片刪除失敗', imageId, err)
    }
  }
}

/** @param {string[]} ids */
export async function deleteDocImagesFromCloud(ids) {
  await Promise.all((ids ?? []).map((id) => deleteDocImageFromCloud(id).catch(() => {})))
}

/**
 * 從行程／憑證／備用景點資料收集全部 imageId
 * @param {unknown} tripData
 * @param {{ links?: { imageIds?: string[] }[] } | null | undefined} driveLinks
 * @param {{ spots?: { imageIds?: string[] }[] } | null | undefined} spots
 */
export function collectTourImageIds(tripData, driveLinks, spots) {
  const out = new Set()
  for (const link of driveLinks?.links ?? []) {
    for (const id of link.imageIds ?? []) {
      const s = String(id ?? '').trim()
      if (s) out.add(s)
    }
  }
  if (Array.isArray(tripData)) {
    for (const region of tripData) {
      for (const day of region?.days ?? []) {
        for (const item of day?.items ?? []) {
          for (const id of item?.imageIds ?? []) {
            const s = String(id ?? '').trim()
            if (s) out.add(s)
          }
        }
      }
    }
  }
  for (const spot of spots?.spots ?? []) {
    for (const id of spot?.imageIds ?? []) {
      const s = String(id ?? '').trim()
      if (s) out.add(s)
    }
  }
  return [...out]
}
