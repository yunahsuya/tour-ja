import { useEffect, useId, useRef, useState } from 'react'
import {
  buildActivityTimeString,
  parseActivityTimeParts,
  regionChipLabel,
} from '../../utils/tripFormat.js'
import { discardItemImages } from '../../utils/tripItemImages.js'
import { ItemImagesField } from './ItemImagesField.jsx'

const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTE_OPTS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function nextTimeFromParts(prevTime, updates) {
  const p = parseActivityTimeParts(prevTime)
  let next = { ...p, ...updates }
  if (updates.sh === '') next = { ...next, sm: '' }
  if (updates.eh === '') next = { ...next, em: '' }
  if (updates.sm === '') next = { ...next, sh: '' }
  if (updates.em === '') next = { ...next, eh: '' }
  if (next.sh && next.sm === '') next = { ...next, sm: '00' }
  if (next.eh && next.em === '') next = { ...next, em: '00' }
  return buildActivityTimeString(next)
}

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   onSubmit: (payload: { regionId: string, dayId: string, item: object }) => void
 *   dayOptions: { regionId: string, dayId: string, label: string }[]
 *   defaultDayId?: string
 *   regionTagOptions?: string[]
 * }} props
 */
export function AddItineraryModal({
  open,
  onClose,
  onSubmit,
  dayOptions,
  defaultDayId = '',
  regionTagOptions = [],
}) {
  const titleId = useId()
  const [dayKey, setDayKey] = useState('')
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [mapUrl, setMapUrl] = useState('')
  const [detail, setDetail] = useState('')
  const [regionTag, setRegionTag] = useState('')
  const [imageIds, setImageIds] = useState([])
  const imageIdsRef = useRef([])
  imageIdsRef.current = imageIds

  useEffect(() => {
    if (!open) return
    const preferred =
      dayOptions.find((d) => d.dayId === defaultDayId) ?? dayOptions[0]
    setDayKey(preferred ? `${preferred.regionId}::${preferred.dayId}` : '')
    setTitle('')
    setTime('')
    setMapUrl('')
    setDetail('')
    setRegionTag('')
    setImageIds([])
  }, [open, dayOptions, defaultDayId])

  function handleClose() {
    discardItemImages(imageIdsRef.current)
    setImageIds([])
    onClose()
  }

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const tp = parseActivityTimeParts(time)

  function handleSubmit(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      window.alert('請輸入標題')
      return
    }
    const selected = dayOptions.find((d) => `${d.regionId}::${d.dayId}` === dayKey)
    if (!selected) {
      window.alert('請選擇日期')
      return
    }
    const timeTrim = time.trim()
    const mapTrim = mapUrl.trim()
    const detailTrim = detail.trim()
    const tagTrim = regionTag.trim()
    const imgs = imageIds.filter(Boolean)
    onSubmit({
      regionId: selected.regionId,
      dayId: selected.dayId,
      item: {
        type: 'activity',
        time: timeTrim || undefined,
        title: t,
        detail: detailTrim || undefined,
        ...(mapTrim ? { mapUrl: mapTrim } : {}),
        ...(tagTrim ? { regionTag: tagTrim } : {}),
        ...(imgs.length ? { imageIds: imgs } : {}),
      },
    })
    setImageIds([])
  }

  return (
    <div className="add-sheet-backdrop" role="presentation">
      <div
        className="add-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="add-sheet-head">
          <h2 id={titleId} className="add-sheet-title">
            新增行程
          </h2>
          <button type="button" className="btn-ghost" onClick={handleClose}>
            關閉
          </button>
        </div>
        <form className="add-sheet-form" onSubmit={handleSubmit}>
          <label className="trip-edit-label">
            <span>日期</span>
            <select
              className="trip-input trip-input--select"
              value={dayKey}
              onChange={(e) => setDayKey(e.target.value)}
              required
            >
              {dayOptions.length === 0 ? (
                <option value="">無可選日期</option>
              ) : (
                dayOptions.map((d) => (
                  <option key={`${d.regionId}::${d.dayId}`} value={`${d.regionId}::${d.dayId}`}>
                    {d.label}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="trip-edit-label">
            <span>時間</span>
            <div className="trip-time-range-editor">
              <div className="trip-time-range-editor__block">
                <span className="trip-time-range-editor__sublabel">開始</span>
                <div className="trip-time-range-editor__selects">
                  <select
                    className="trip-input trip-input--select trip-time-range-editor__select"
                    aria-label="開始（時）"
                    value={tp.sh}
                    onChange={(e) =>
                      setTime((prev) => nextTimeFromParts(prev, { sh: e.target.value }))
                    }
                  >
                    <option value="">時</option>
                    {HOUR_OPTS.map((h) => (
                      <option key={`sh-${h}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <select
                    className="trip-input trip-input--select trip-time-range-editor__select"
                    aria-label="開始（分）"
                    value={tp.sm}
                    onChange={(e) =>
                      setTime((prev) => nextTimeFromParts(prev, { sm: e.target.value }))
                    }
                    disabled={!tp.sh}
                  >
                    <option value="">分</option>
                    {MINUTE_OPTS.map((m) => (
                      <option key={`sm-${m}`} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <span className="trip-time-range-editor__sep" aria-hidden>
                –
              </span>
              <div className="trip-time-range-editor__block">
                <span className="trip-time-range-editor__sublabel">結束</span>
                <div className="trip-time-range-editor__selects">
                  <select
                    className="trip-input trip-input--select trip-time-range-editor__select"
                    aria-label="結束（時）"
                    value={tp.eh}
                    onChange={(e) =>
                      setTime((prev) => nextTimeFromParts(prev, { eh: e.target.value }))
                    }
                  >
                    <option value="">時</option>
                    {HOUR_OPTS.map((h) => (
                      <option key={`eh-${h}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <select
                    className="trip-input trip-input--select trip-time-range-editor__select"
                    aria-label="結束（分）"
                    value={tp.em}
                    onChange={(e) =>
                      setTime((prev) => nextTimeFromParts(prev, { em: e.target.value }))
                    }
                    disabled={!tp.eh}
                  >
                    <option value="">分</option>
                    {MINUTE_OPTS.map((m) => (
                      <option key={`em-${m}`} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </label>

          <label className="trip-edit-label">
            <span>標題</span>
            <input
              className="trip-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：淺草寺"
              required
              autoFocus
              autoComplete="off"
            />
          </label>

          {regionTagOptions.length > 0 ? (
            <label className="trip-edit-label">
              <span>地區標籤</span>
              <select
                className="trip-input trip-input--select"
                value={regionTag}
                onChange={(e) => setRegionTag(e.target.value)}
              >
                <option value="">沿用行程地區</option>
                {regionTagOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="trip-edit-label">
            <span>地圖連結</span>
            <input
              className="trip-input"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="選填，貼上 Google Maps 等網址"
              autoComplete="off"
              inputMode="url"
            />
          </label>

          <label className="trip-edit-label">
            <span>備註</span>
            <textarea
              className="trip-input trip-textarea"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder="可留空"
            />
          </label>

          <ItemImagesField
            imageIds={imageIds}
            onChange={setImageIds}
            albumKey="trip-item-draft"
            editable
          />

          <div className="trip-edit-actions">
            <button type="button" className="btn-ghost" onClick={handleClose}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={dayOptions.length === 0}>
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** 從 visiblePairs 建日期選單 */
export function buildAddDayOptions(visiblePairs) {
  const out = []
  for (const pair of visiblePairs ?? []) {
    const sources = pair.sources ?? [pair]
    for (const { region, day } of sources) {
      const regionShort = region?.name?.split('（')[0]?.trim() ?? regionChipLabel(region)
      out.push({
        regionId: region.id,
        dayId: day.id,
        label: `${day.label}${regionShort ? ` · ${regionShort}` : ''}`,
      })
    }
  }
  return out
}
