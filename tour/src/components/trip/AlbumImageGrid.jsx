import { useEffect, useState } from 'react'
import { getDocImage } from '../../docImagesDb.js'
import { IconTrashSmall } from '../icons/Icons.jsx'

function AlbumThumb({ imageId, onOpen, onRemove }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let revoked = false
    let objectUrl = ''
    void (async () => {
      try {
        const rec = await getDocImage(imageId)
        if (!rec?.blob || revoked) return
        objectUrl = URL.createObjectURL(rec.blob)
        if (!revoked) setUrl(objectUrl)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageId])

  return (
    <li className="album-thumb">
      <button
        type="button"
        className="album-thumb-btn"
        onClick={() => url && onOpen?.(url)}
        aria-label="查看圖片"
      >
        {url ? <img src={url} alt="" /> : <span className="album-thumb-ph">…</span>}
      </button>
      {typeof onRemove === 'function' ? (
        <button
          type="button"
          className="album-thumb-del"
          aria-label="刪除圖片"
          onClick={() => onRemove(imageId)}
        >
          <IconTrashSmall />
        </button>
      ) : null}
    </li>
  )
}

export function AlbumImageGrid({ imageIds, onOpen, onRemove, emptyText }) {
  if (!imageIds?.length) {
    if (emptyText === null) return null
    return (
      <p className="album-empty">
        {emptyText ?? '尚未加入圖片，可點「＋ 圖片」。'}
      </p>
    )
  }
  return (
    <ul className="album-grid">
      {imageIds.map((id) => (
        <AlbumThumb key={id} imageId={id} onOpen={onOpen} onRemove={onRemove} />
      ))}
    </ul>
  )
}

export function ImageLightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div
      className="album-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="圖片預覽"
      onClick={onClose}
    >
      <button type="button" className="album-lightbox-close" onClick={onClose}>
        關閉
      </button>
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
