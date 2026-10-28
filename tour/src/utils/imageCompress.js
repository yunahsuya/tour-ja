/**
 * 壓縮圖片為 JPEG Blob（方便機票／住宿截圖離線存放）
 * @param {File} file
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<{ blob: Blob, name: string, mime: string }>}
 */
export async function compressImageFile(file, opts = {}) {
  const maxEdge = opts.maxEdge ?? 1600
  const quality = opts.quality ?? 0.72
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('請選擇圖片檔')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('無法處理圖片')
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('壓縮失敗'))),
        'image/jpeg',
        quality,
      )
    })

    const base = String(file.name || 'photo').replace(/\.[^.]+$/, '')
    return { blob, name: `${base || 'photo'}.jpg`, mime: 'image/jpeg' }
  } finally {
    bitmap.close?.()
  }
}
