import { deleteDocImage, putDocImage } from '../docImagesDb.js'
import { newDocImageId } from '../driveLinksStorage.js'
import { compressImageFile } from './imageCompress.js'

export const MAX_IMAGES_PER_ITEM = 8

/** @param {unknown} rawIds */
export function normalizeItemImageIds(rawIds) {
  if (!Array.isArray(rawIds)) return []
  const out = []
  const seen = new Set()
  for (const id of rawIds) {
    const s = String(id ?? '').trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
    if (out.length >= MAX_IMAGES_PER_ITEM) break
  }
  return out
}

/**
 * 壓縮並寫入 IndexedDB，回傳成功的 imageId 列表
 * @param {File[]} files
 * @param {string[]} existingIds
 * @param {string} albumKey
 */
export async function uploadItemImageFiles(files, existingIds, albumKey) {
  const current = normalizeItemImageIds(existingIds)
  const room = MAX_IMAGES_PER_ITEM - current.length
  if (room <= 0) {
    throw new Error(`每個行程最多 ${MAX_IMAGES_PER_ITEM} 張圖片`)
  }
  const list = Array.from(files ?? []).filter(Boolean)
  const picked = list.slice(0, room)
  const added = []
  for (const file of picked) {
    try {
      const { blob, name, mime } = await compressImageFile(file)
      const imageId = newDocImageId()
      await putDocImage(imageId, {
        albumId: albumKey,
        name,
        mime,
        blob,
        createdAt: Date.now(),
      })
      added.push(imageId)
    } catch (err) {
      console.warn('[tour] 行程圖片上傳失敗', err)
      throw err
    }
  }
  return {
    imageIds: [...current, ...added],
    addedIds: added,
    truncated: picked.length < list.length,
  }
}

/** @param {string[]} ids */
export function discardItemImages(ids) {
  const list = normalizeItemImageIds(ids)
  if (list.length) void Promise.all(list.map((id) => deleteDocImage(id).catch(() => {})))
}
