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
const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_MS = 280
const DOUBLE_TAP_ZOOM = 2.5

function pointerDistance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function pointerMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function clampScale(scale) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/**
 * 全螢幕圖片預覽；可縮放、拖移，並左右切換同相簿其他圖。
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
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const cloudTick = useCloudReadyTick()

  const mediaRef = useRef(null)
  const scaleRef = useRef(1)
  const offsetRef = useRef({ x: 0, y: 0 })
  const pointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const panRef = useRef(null)
  const swipeRef = useRef(null)
  const didGestureRef = useRef(false)
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 })

  scaleRef.current = scale
  offsetRef.current = offset

  function resetZoom() {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    scaleRef.current = 1
    offsetRef.current = { x: 0, y: 0 }
  }

  function setZoom(nextScale, nextOffset = { x: 0, y: 0 }) {
    const s = clampScale(nextScale)
    const o = s <= 1 ? { x: 0, y: 0 } : nextOffset
    scaleRef.current = s
    offsetRef.current = o
    setScale(s)
    setOffset(o)
  }

  useEffect(() => {
    if (!imageId) {
      setUrl('')
      return
    }
    let revoked = false
    let objectUrl = ''
    setUrl('')
    resetZoom()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when image changes
  }, [imageId, cloudTick])

  const canPrev = safeIndex > 0
  const canNext = safeIndex < ids.length - 1
  const multi = ids.length > 1
  const zoomed = scale > 1.01

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
      if (zoomed) return
      if (e.key === 'ArrowLeft' && safeIndex > 0) onIndexChange?.(safeIndex - 1)
      if (e.key === 'ArrowRight' && safeIndex < ids.length - 1) {
        onIndexChange?.(safeIndex + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ids.length, safeIndex, onClose, onIndexChange, zoomed])

  useEffect(() => {
    if (!ids.length) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [ids.length])

  useEffect(() => {
    const el = mediaRef.current
    if (!el) return undefined
    function onWheel(e) {
      e.preventDefault()
      e.stopPropagation()
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const next = clampScale(scaleRef.current * factor)
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const prev = scaleRef.current
      if (next <= 1) {
        scaleRef.current = 1
        offsetRef.current = { x: 0, y: 0 }
        setScale(1)
        setOffset({ x: 0, y: 0 })
        return
      }
      const ratio = next / prev
      const ox = offsetRef.current.x
      const oy = offsetRef.current.y
      const o = {
        x: (e.clientX - cx - ox) * (1 - ratio) + ox * ratio,
        y: (e.clientY - cy - oy) * (1 - ratio) + oy * ratio,
      }
      scaleRef.current = next
      offsetRef.current = o
      setScale(next)
      setOffset(o)
      didGestureRef.current = true
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [imageId, url])

  if (!ids.length || !imageId) return null

  function zoomAt(clientX, clientY, nextScale) {
    const el = mediaRef.current
    if (!el) {
      setZoom(nextScale)
      return
    }
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const prev = scaleRef.current
    const s = clampScale(nextScale)
    if (s <= 1) {
      setZoom(1)
      return
    }
    const ratio = s / prev
    const ox = offsetRef.current.x
    const oy = offsetRef.current.y
    setZoom(s, {
      x: (clientX - cx - ox) * (1 - ratio) + ox * ratio,
      y: (clientY - cy - oy) * (1 - ratio) + oy * ratio,
    })
  }

  function onMediaPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    didGestureRef.current = false

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      pinchRef.current = {
        startDist: pointerDistance(a, b),
        startScale: scaleRef.current,
        startOffset: { ...offsetRef.current },
        startMid: pointerMidpoint(a, b),
      }
      panRef.current = null
      swipeRef.current = null
      return
    }

    if (scaleRef.current > 1.01) {
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: offsetRef.current.x,
        origY: offsetRef.current.y,
      }
      swipeRef.current = null
      return
    }

    panRef.current = null
    swipeRef.current = { startX: e.clientX, startY: e.clientY }
  }

  function onMediaPointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = pointerDistance(a, b)
      if (pinchRef.current.startDist < 8) return
      const nextScale = clampScale(
        pinchRef.current.startScale * (dist / pinchRef.current.startDist),
      )
      const mid = pointerMidpoint(a, b)
      const el = mediaRef.current
      if (!el) {
        setZoom(nextScale, pinchRef.current.startOffset)
        return
      }
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const ratio = nextScale / pinchRef.current.startScale
      const ox = pinchRef.current.startOffset.x
      const oy = pinchRef.current.startOffset.y
      const startMid = pinchRef.current.startMid
      setZoom(nextScale, {
        x: ox * ratio + (mid.x - startMid.x) + (startMid.x - cx) * (1 - ratio),
        y: oy * ratio + (mid.y - startMid.y) + (startMid.y - cy) * (1 - ratio),
      })
      didGestureRef.current = true
      return
    }

    if (panRef.current && scaleRef.current > 1.01) {
      const dx = e.clientX - panRef.current.startX
      const dy = e.clientY - panRef.current.startY
      if (Math.hypot(dx, dy) > 6) didGestureRef.current = true
      setZoom(scaleRef.current, {
        x: panRef.current.origX + dx,
        y: panRef.current.origY + dy,
      })
    }
  }

  function onMediaPointerUp(e) {
    const hadPointer = pointersRef.current.has(e.pointerId)
    pointersRef.current.delete(e.pointerId)

    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 1 && scaleRef.current > 1.01) {
      const remain = [...pointersRef.current.values()][0]
      panRef.current = {
        startX: remain.x,
        startY: remain.y,
        origX: offsetRef.current.x,
        origY: offsetRef.current.y,
      }
      swipeRef.current = null
      return
    }

    if (pointersRef.current.size === 0) {
      const swipe = swipeRef.current
      panRef.current = null
      swipeRef.current = null

      if (hadPointer && !didGestureRef.current && e.pointerType !== 'mouse') {
        const now = Date.now()
        const last = lastTapRef.current
        if (
          now - last.t < DOUBLE_TAP_MS &&
          Math.hypot(e.clientX - last.x, e.clientY - last.y) < 36
        ) {
          lastTapRef.current = { t: 0, x: 0, y: 0 }
          if (scaleRef.current > 1.01) setZoom(1)
          else zoomAt(e.clientX, e.clientY, DOUBLE_TAP_ZOOM)
          didGestureRef.current = true
          return
        }
        lastTapRef.current = { t: now, x: e.clientX, y: e.clientY }
      }

      if (
        swipe &&
        multi &&
        scaleRef.current <= 1.01 &&
        !didGestureRef.current
      ) {
        const dx = e.clientX - swipe.startX
        const dy = e.clientY - swipe.startY
        if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
          didGestureRef.current = true
          if (dx < 0) go(1)
          else go(-1)
        }
      }
    }
  }

  function onMediaDoubleClick(e) {
    e.preventDefault()
    e.stopPropagation()
    if (scaleRef.current > 1.01) setZoom(1)
    else zoomAt(e.clientX, e.clientY, DOUBLE_TAP_ZOOM)
    didGestureRef.current = true
  }

  function handleBackdropClick() {
    if (didGestureRef.current) {
      didGestureRef.current = false
      return
    }
    onClose?.()
  }

  return (
    <div
      className={`album-lightbox${zoomed ? ' album-lightbox--zoomed' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="圖片預覽"
      onClick={handleBackdropClick}
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
      <div className="album-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {multi ? (
          <button
            type="button"
            className="album-lightbox-nav album-lightbox-nav--prev"
            aria-label="上一張"
            disabled={!canPrev || zoomed}
            onClick={() => go(-1)}
          >
            ‹
          </button>
        ) : null}
        <div
          ref={mediaRef}
          className="album-lightbox-media"
          onPointerDown={onMediaPointerDown}
          onPointerMove={onMediaPointerMove}
          onPointerUp={onMediaPointerUp}
          onPointerCancel={onMediaPointerUp}
          onDoubleClick={onMediaDoubleClick}
        >
          {url ? (
            <img
              src={url}
              alt=""
              draggable={false}
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
              }}
            />
          ) : (
            <span className="album-lightbox-loading">…</span>
          )}
        </div>
        {multi ? (
          <button
            type="button"
            className="album-lightbox-nav album-lightbox-nav--next"
            aria-label="下一張"
            disabled={!canNext || zoomed}
            onClick={() => go(1)}
          >
            ›
          </button>
        ) : null}
      </div>
    </div>
  )
}
