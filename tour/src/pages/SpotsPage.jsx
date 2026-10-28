import { useState } from 'react'
import { ItemImagesField } from '../components/trip/ItemImagesField.jsx'
import { googleMapsSearchUrl } from '../mapUtils.js'
import {
  DEFAULT_SPOT_CATEGORY,
  spotCategoryLabel,
} from '../spotsStorage.js'
import { normalizeItemImageIds } from '../utils/tripItemImages.js'
import { normalizeUserMapUrl } from '../utils/tripFormat.js'

function CategorySelect({ value, onChange, id, categories }) {
  return (
    <label className="trip-edit-label" htmlFor={id}>
      <span>分類</span>
      <select
        id={id}
        className="trip-input trip-input--select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function badgeClass(categoryId) {
  if (categoryId === 'food') return 'spot-cat-badge spot-cat-badge--food'
  if (categoryId === 'sight') return 'spot-cat-badge spot-cat-badge--sight'
  return 'spot-cat-badge spot-cat-badge--custom'
}

export function SpotsPage({
  spots,
  spotFilter,
  setSpotFilter,
  showSpotForm,
  spotTitle,
  setSpotTitle,
  spotNote,
  setSpotNote,
  spotMapUrl,
  setSpotMapUrl,
  spotCategory,
  setSpotCategory,
  spotImageIds,
  setSpotImageIds,
  handleAddSpot,
  editingSpotId,
  editSpotTitle,
  setEditSpotTitle,
  editSpotNote,
  setEditSpotNote,
  editSpotMapUrl,
  setEditSpotMapUrl,
  editSpotCategory,
  setEditSpotCategory,
  handleSaveSpotEdit,
  beginEditSpot,
  cancelEditSpot,
  handleRemoveSpot,
  handleAddSpotToItinerary,
  onCancelSpotForm,
  onAddSpotCategory,
  onRemoveSpotCategory,
  onRestoreDefaultSpotCategories,
  onUpdateSpotImages,
}) {
  const all = spots.spots ?? []
  const categories = spots.categories ?? []
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryLabel, setNewCategoryLabel] = useState('')

  const filtered =
    spotFilter === 'all'
      ? all
      : all.filter((s) => (s.category || DEFAULT_SPOT_CATEGORY) === spotFilter)

  const countBy = (id) =>
    id === 'all'
      ? all.length
      : all.filter((s) => (s.category || DEFAULT_SPOT_CATEGORY) === id).length

  function submitAddCategory(e) {
    e.preventDefault()
    const addedId = onAddSpotCategory?.(newCategoryLabel)
    setNewCategoryLabel('')
    setShowAddCategory(false)
    if (addedId) setSpotFilter(addedId)
  }

  function confirmRemoveCategory(cat) {
    const n = countBy(cat.id)
    const msg =
      n > 0
        ? `要刪除分類「${cat.label}」嗎？此分類下的 ${n} 個項目會改到其他分類。`
        : `要刪除分類「${cat.label}」嗎？`
    if (!window.confirm(msg)) return
    onRemoveSpotCategory?.(cat.id)
  }

  return (
    <section className="panel-spots" aria-label="備用景點">
      <div className="section-head section-head--left">
        <h2 className="section-head-title">備用景點</h2>
        <span className="section-head-en">Saved</span>
      </div>

      <div className="spot-filter-tabs" role="tablist" aria-label="景點分類">
        <button
          type="button"
          role="tab"
          aria-selected={spotFilter === 'all'}
          className={
            spotFilter === 'all'
              ? 'spot-filter-tab spot-filter-tab--on'
              : 'spot-filter-tab'
          }
          onClick={() => setSpotFilter('all')}
        >
          全部 ({countBy('all')})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={spotFilter === c.id}
            className={
              spotFilter === c.id
                ? 'spot-filter-tab spot-filter-tab--on'
                : 'spot-filter-tab'
            }
            onClick={() => setSpotFilter(c.id)}
          >
            {c.label} ({countBy(c.id)})
          </button>
        ))}
      </div>

      <div className="spot-cat-manage">
        {!showAddCategory ? (
          <button
            type="button"
            className="spot-cat-manage-btn"
            onClick={() => setShowAddCategory(true)}
          >
            ＋ 新增分類
          </button>
        ) : null}
        {spotFilter !== 'all' && categories.length > 1 ? (
          <button
            type="button"
            className="spot-cat-manage-btn spot-cat-manage-btn--danger"
            onClick={() => {
              const cat = categories.find((c) => c.id === spotFilter)
              if (cat) confirmRemoveCategory(cat)
            }}
          >
            刪除此分類
          </button>
        ) : null}
        <button
          type="button"
          className="spot-cat-manage-btn spot-cat-manage-btn--muted"
          onClick={() => {
            if (
              window.confirm(
                '要恢復預設分類（食物／景點）嗎？自訂分類會移除，項目會改掛到對應預設分類。',
              )
            ) {
              onRestoreDefaultSpotCategories?.()
            }
          }}
        >
          恢復預設分類
        </button>
      </div>

      {showAddCategory ? (
        <form className="spot-cat-add-form" onSubmit={submitAddCategory}>
          <label className="trip-edit-label">
            <span>新分類名稱</span>
            <input
              className="trip-input"
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              placeholder="例：購物、咖啡"
              maxLength={40}
              required
              autoFocus
            />
          </label>
          <div className="trip-edit-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setShowAddCategory(false)
                setNewCategoryLabel('')
              }}
            >
              取消
            </button>
            <button type="submit" className="btn-primary">
              新增
            </button>
          </div>
        </form>
      ) : null}

      {showSpotForm && (
        <form className="spot-form" onSubmit={handleAddSpot}>
          <CategorySelect
            id="spot-add-category"
            value={spotCategory}
            onChange={setSpotCategory}
            categories={categories}
          />
          <label className="trip-edit-label">
            <span>名稱</span>
            <input
              className="trip-input"
              value={spotTitle}
              onChange={(e) => setSpotTitle(e.target.value)}
              placeholder={
                spotCategory === 'food' ? '例：一蘭拉麵' : '例：淺草寺'
              }
              required
            />
          </label>
          <label className="trip-edit-label">
            <span>地圖連結</span>
            <input
              className="trip-input"
              value={spotMapUrl}
              onChange={(e) => setSpotMapUrl(e.target.value)}
              placeholder="選填，貼上 Google Maps 等網址"
              autoComplete="off"
              inputMode="url"
            />
          </label>
          <label className="trip-edit-label">
            <span>備註</span>
            <textarea
              className="trip-input trip-textarea"
              value={spotNote}
              onChange={(e) => setSpotNote(e.target.value)}
              rows={2}
              placeholder="可留空"
            />
          </label>
          <ItemImagesField
            imageIds={spotImageIds}
            onChange={setSpotImageIds}
            albumKey="spot-draft"
          />
          <div className="trip-edit-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={onCancelSpotForm}
            >
              取消
            </button>
            <button type="submit" className="btn-primary">
              儲存
            </button>
          </div>
        </form>
      )}
      <ul className="spot-list">
        {filtered.length === 0 && !showSpotForm ? (
          <li className="spot-empty">
            {all.length === 0
              ? '尚無收藏，點右下角 + 新增。'
              : '此分類尚無項目，可切換分類或點 + 新增。'}
          </li>
        ) : null}
        {filtered.map((s) => {
          const catId = s.category || DEFAULT_SPOT_CATEGORY
          return (
            <li key={s.id} className="spot-card">
              {editingSpotId === s.id ? (
                <form className="spot-card-edit" onSubmit={handleSaveSpotEdit}>
                  <CategorySelect
                    id={`spot-edit-category-${s.id}`}
                    value={editSpotCategory}
                    onChange={setEditSpotCategory}
                    categories={categories}
                  />
                  <label className="trip-edit-label">
                    <span>名稱</span>
                    <input
                      className="trip-input"
                      value={editSpotTitle}
                      onChange={(e) => setEditSpotTitle(e.target.value)}
                      placeholder="名稱"
                      required
                      autoFocus
                    />
                  </label>
                  <label className="trip-edit-label">
                    <span>地圖連結</span>
                    <input
                      className="trip-input"
                      value={editSpotMapUrl}
                      onChange={(e) => setEditSpotMapUrl(e.target.value)}
                      placeholder="選填，貼上 Google Maps 等網址"
                      autoComplete="off"
                      inputMode="url"
                    />
                  </label>
                  <label className="trip-edit-label">
                    <span>備註</span>
                    <textarea
                      className="trip-input trip-textarea"
                      value={editSpotNote}
                      onChange={(e) => setEditSpotNote(e.target.value)}
                      rows={2}
                      placeholder="可留空"
                    />
                  </label>
                  <ItemImagesField
                    imageIds={normalizeItemImageIds(s.imageIds)}
                    onChange={(ids) => onUpdateSpotImages?.(s.id, ids)}
                    albumKey={`spot-${s.id}`}
                  />
                  <div className="trip-edit-actions">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={cancelEditSpot}
                    >
                      取消
                    </button>
                    <button type="submit" className="btn-primary">
                      儲存
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="spot-card-top">
                    <h3 className="spot-card-title">{s.title}</h3>
                    <span className={badgeClass(catId)}>
                      {spotCategoryLabel(s.category, categories)}
                    </span>
                  </div>
                  {s.note ? <p className="spot-card-note">{s.note}</p> : null}
                  <ItemImagesField
                    imageIds={normalizeItemImageIds(s.imageIds)}
                    onChange={(ids) => onUpdateSpotImages?.(s.id, ids)}
                    albumKey={`spot-${s.id}`}
                    emptyText={null}
                  />
                  <div className="spot-card-actions">
                    <a
                      className="trip-action-btn"
                      href={
                        s.mapUrl?.trim()
                          ? normalizeUserMapUrl(s.mapUrl)
                          : googleMapsSearchUrl(s.title)
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      地圖
                    </a>
                    <button
                      type="button"
                      className="trip-action-btn"
                      onClick={() => beginEditSpot(s)}
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      className="trip-action-btn"
                      onClick={() => handleAddSpotToItinerary(s)}
                    >
                      加入行程
                    </button>
                    <button
                      type="button"
                      className="trip-action-btn"
                      onClick={() => handleRemoveSpot(s.id)}
                    >
                      刪除
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
