import { useRef, useState } from 'react'
import { AlbumImageGrid, ImageLightbox } from './AlbumImageGrid.jsx'
import {
  discardItemImages,
  MAX_IMAGES_PER_ITEM,
  normalizeItemImageIds,
  uploadItemImageFiles,
} from '../../utils/tripItemImages.js'

/**
 * 行程項目／景點圖片：上傳／預覽／刪除
 * @param {{
 *   imageIds: string[]
 *   onChange: (ids: string[]) => void
 *   albumKey?: string
 *   editable?: boolean
 *   emptyText?: string | null
 * }} props
 */
export function ItemImagesField({
  imageIds,
  onChange = () => {},
  albumKey = 'trip-item',
  editable = true,
  emptyText,
}) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const ids = normalizeItemImageIds(imageIds)
  const atLimit = ids.length >= MAX_IMAGES_PER_ITEM

  async function handleFiles(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length || uploading) return
    setUploading(true)
    try {
      const result = await uploadItemImageFiles(files, ids, albumKey)
      onChange(result.imageIds)
      if (result.truncated) {
        window.alert(`最多 ${MAX_IMAGES_PER_ITEM} 張圖片，已加入前 ${result.addedIds.length} 張`)
      }
    } catch (err) {
      window.alert(err?.message || '圖片處理失敗，請換一張再試')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="item-images-field">
      {editable ? (
        <div className="item-images-field__head">
          <span className="item-images-field__label">
            圖片{ids.length > 0 ? ` · ${ids.length}` : ''}
          </span>
          <button
            type="button"
            className="info-pill-drive-add-img-btn"
            disabled={atLimit || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? '上傳中…' : '＋ 圖片'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>
      ) : null}
      <AlbumImageGrid
        imageIds={ids}
        onOpen={(imageId) => {
          const i = ids.indexOf(imageId)
          if (i < 0) return
          setLightbox({ imageIds: ids, index: i })
        }}
        onRemove={
          editable
            ? (imageId) => {
                discardItemImages([imageId])
                onChange(ids.filter((id) => id !== imageId))
              }
            : undefined
        }
        emptyText={
          emptyText !== undefined
            ? emptyText
            : editable
              ? '尚未加入圖片，可點「＋ 圖片」。'
              : null
        }
      />
      <ImageLightbox
        imageIds={lightbox?.imageIds}
        index={lightbox?.index ?? 0}
        onClose={() => setLightbox(null)}
        onIndexChange={(next) =>
          setLightbox((prev) => (prev ? { ...prev, index: next } : prev))
        }
      />
    </div>
  )
}
