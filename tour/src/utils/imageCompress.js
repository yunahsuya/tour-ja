/** 目標大小：盡量壓在 KB 級，方便家人同步 */
const DEFAULT_TARGET_BYTES = 100 * 1024
const DEFAULT_HARD_MAX_BYTES = 150 * 1024

/**
 * 壓縮圖片為 JPEG Blob（優先壓到 targetBytes 以內）
 * @param {File} file
 * @param {{ maxEdge?: number, quality?: number, targetBytes?: number, hardMaxBytes?: number }} [opts]
 * @returns {Promise<{ blob: Blob, name: string, mime: string }>}
 */
export async function compressImageFile(file, opts = {}) {
  const targetBytes = opts.targetBytes ?? DEFAULT_TARGET_BYTES
  const hardMaxBytes = opts.hardMaxBytes ?? DEFAULT_HARD_MAX_BYTES
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('請選擇圖片檔')
  }

  const bitmap = await createImageBitmap(file)
  try {
    let maxEdge = opts.maxEdge ?? 1280
    let quality = opts.quality ?? 0.62
    let blob = await encodeJpeg(bitmap, maxEdge, quality)

    // 若仍偏大：逐步縮小邊長與品質，直到進入目標區間
    for (let i = 0; i < 8 && blob.size > targetBytes; i++) {
      quality = Math.max(0.32, quality - 0.07)
      maxEdge = Math.max(480, Math.round(maxEdge * 0.82))
      blob = await encodeJpeg(bitmap, maxEdge, quality)
    }

    // 最後保底：仍超過硬上限就再砍一次
    if (blob.size > hardMaxBytes) {
      blob = await encodeJpeg(bitmap, 480, 0.28)
    }

    const base = String(file.name || 'photo').replace(/\.[^.]+$/, '')
    return { blob, name: `${base || 'photo'}.jpg`, mime: 'image/jpeg' }
  } finally {
    bitmap.close?.()
  }
}

/**
 * @param {ImageBitmap} bitmap
 * @param {number} maxEdge
 * @param {number} quality
 */
function encodeJpeg(bitmap, maxEdge, quality) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('無法處理圖片'))
  ctx.drawImage(bitmap, 0, 0, w, h)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('壓縮失敗'))),
      'image/jpeg',
      quality,
    )
  })
}
