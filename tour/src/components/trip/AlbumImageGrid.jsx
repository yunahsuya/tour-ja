import { useEffect, useRef, useState } from 'react'
import { subscribeDocImagesCloudContext } from '../../firebase/docImagesCloudContext.js'
import { resolveDocImage } from '../../utils/resolveDocImage.js'
import { IconTrashSmall } from '../icons/Icons.jsx'

function useCloudReadyTick() {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeDocImagesCloudContext(() => setTick((n) => n + 1)), [])
  return tick
}

function AlbumThumb({ imageId, onOpen, onRemove }) {
  const [url, setUrl] = useState('')
  const cloudTick = useCloudReadyTick()

  useEffect(() => {
    let revoked = false
    let objectUrl = ''
    void (async () => {
      try {
        const rec = await resolveDocImage(imageId)
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
  }, [imageId, cloudTick])

  return (
    <li className="album-thumb">
      <button
        type="button"
        className="album-thumb-btn"
        onClick={() => url && onOpen?.(imageId)}
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

const SWIPE_THRESHOLD = 50

/**
 * 全螢幕圖片預覽；可左右滑動／拖曳／按鈕切換同相簿其他圖。
 * @param {{
 *   imageIds?: string[]
 *   index?: number
 *   onClose: () => void
 *   onIndexChange?: (next: number) => void
 * }} props
 */
export function ImageLightbox({ imageIds = [], index = 0, onClose, onIndexChange }) {
  const ids = Array.isArray(imageIds) ? imageIds.filter(Boolean) : []
  const safeIndex = ids.length ? Math.min(Math.max(0, index), ids.length - 1) : 0
  const imageId = ids[safeIndex] ?? ''
  const [url, setUrl] = useState('')
  const pointerStartX = useRef(null)
  const didSwipe = useRef(false)
  const cloudTick = useCloudReadyTick()

  useEffect(() => {
    if (!imageId) {
      setUrl('')
      return
    }
    let revoked = false
    let objectUrl = ''
    setUrl('')
    void (async () => {
      try {
        const rec = await resolveDocImage(imageId)
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
  }, [imageId, cloudTick])

  const canPrev = safeIndex > 0
  const canNext = safeIndex < ids.length - 1
  const multi = ids.length > 1

  function go(delta) {
    const next = safeIndex + delta
    if (next < 0 || next >= ids.length) return
    onIndexChange?.(next)
  }

  useEffect(() => {
    if (!ids.length) return undefined
    function onKey(e) {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      if (e.key === 'ArrowLeft' && safeIndex > 0) onIndexChange?.(safeIndex - 1)
      if (e.key === 'ArrowRight' && safeIndex < ids.length - 1) {
        onIndexChange?.(safeIndex + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ids.length, safeIndex, onClose, onIndexChange])

  if (!ids.length || !imageId) return null

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pointerStartX.current = e.clientX
    didSwipe.current = false
  }

  function onPointerUp(e) {
    const startX = pointerStartX.current
    pointerStartX.current = null
    if (startX == null || !multi) return
    const dx = e.clientX - startX
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    didSwipe.current = true
    if (dx < 0) go(1)
    else go(-1)
  }

  function handleBackdropClick() {
    if (didSwipe.current) {
      didSwipe.current = false
      return
    }
    onClose?.()
  }

  return (
    <div
      className="album-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="圖片預覽"
      onClick={handleBackdropClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pointerStartX.current = null
      }}
    >
      <button
        type="button"
        className="album-lightbox-close"
        onClick={(e) => {
          e.stopPropagation()
          onClose?.()
        }}
      >
        關閉
      </button>
      {multi ? (
        <p className="album-lightbox-counter" aria-live="polite">
          {safeIndex + 1} / {ids.length}
        </p>
      ) : null}
      <div
        className="album-lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {multi ? (
          <button
            type="button"
            className="album-lightbox-nav album-lightbox-nav--prev"
            aria-label="上一張"
            disabled={!canPrev}
            onClick={() => go(-1)}
          >
            ‹
          </button>
        ) : null}
        <div className="album-lightbox-media">
          {url ? (
            <img src={url} alt="" draggable={false} />
          ) : (
            <span className="album-lightbox-loading">…</span>
          )}
        </div>
        {multi ? (
          <button
            type="button"
            className="album-lightbox-nav album-lightbox-nav--next"
            aria-label="下一張"
            disabled={!canNext}
            onClick={() => go(1)}
          >
            ›
          </button>
        ) : null}
      </div>
    </div>
  )
}
