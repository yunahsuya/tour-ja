import { getDocImage } from '../docImagesDb.js'
import { downloadDocImageToCache } from '../firebase/docImagesCloud.js'
import { getDocImagesCloudContext } from '../firebase/docImagesCloudContext.js'

/**
 * 讀圖：本機 IndexedDB 快取優先；沒有且已加入共用時再從雲端下載並快取。
 * @param {string} imageId
 * @returns {Promise<{ id: string, blob: Blob, name?: string, mime?: string } | null>}
 */
export async function resolveDocImage(imageId) {
  const id = String(imageId ?? '').trim()
  if (!id) return null

  try {
    const local = await getDocImage(id)
    if (local?.blob) return local
  } catch {
    /* fall through to cloud */
  }

  const { ready, shareCode } = getDocImagesCloudContext()
  if (!ready) return null

  try {
    return await downloadDocImageToCache(id, shareCode)
  } catch (err) {
    console.warn('[tour] 雲端圖片下載失敗', id, err)
    return null
  }
}
