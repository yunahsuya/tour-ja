import { googleMapsSearchUrl } from '../mapUtils.js'
import {
  DEFAULT_SPOT_CATEGORY,
  SPOT_CATEGORIES,
  spotCategoryLabel,
} from '../spotsStorage.js'
import { normalizeUserMapUrl } from '../utils/tripFormat.js'

function CategorySelect({ value, onChange, id }) {
  return (
    <label className="trip-edit-label" htmlFor={id}>
      <span>分類</span>
      <select
        id={id}
        className="trip-input trip-input--select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {SPOT_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  )
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
}) {
  const all = spots.spots ?? []
  const filtered =
    spotFilter === 'all'
      ? all
      : all.filter((s) => (s.category || DEFAULT_SPOT_CATEGORY) === spotFilter)

  const countBy = (id) =>
    id === 'all'
      ? all.length
      : all.filter((s) => (s.category || DEFAULT_SPOT_CATEGORY) === id).length

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
        {SPOT_CATEGORIES.map((c) => (
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

      {showSpotForm && (
        <form className="spot-form" onSubmit={handleAddSpot}>
          <CategorySelect
            id="spot-add-category"
            value={spotCategory}
            onChange={setSpotCategory}
          />
          <label className="trip-edit-label">
            <span>名稱</span>
            <input
              className="trip-input"
              value={spotTitle}
              onChange={(e) => setSpotTitle(e.target.value)}
              placeholder={spotCategory === 'food' ? '例：一蘭拉麵' : '例：淺草寺'}
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
        {filtered.map((s) => (
          <li key={s.id} className="spot-card">
            {editingSpotId === s.id ? (
              <form className="spot-card-edit" onSubmit={handleSaveSpotEdit}>
                <CategorySelect
                  id={`spot-edit-category-${s.id}`}
                  value={editSpotCategory}
                  onChange={setEditSpotCategory}
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
                <div className="trip-edit-actions">
                  <button type="button" className="btn-ghost" onClick={cancelEditSpot}>
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
                  <span
                    className={
                      (s.category || DEFAULT_SPOT_CATEGORY) === 'food'
                        ? 'spot-cat-badge spot-cat-badge--food'
                        : 'spot-cat-badge spot-cat-badge--sight'
                    }
                  >
                    {spotCategoryLabel(s.category)}
                  </span>
                </div>
                {s.note ? <p className="spot-card-note">{s.note}</p> : null}
                <div className="spot-card-actions">
                  <a
                    className="trip-action-btn"
                    href={s.mapUrl?.trim() ? normalizeUserMapUrl(s.mapUrl) : googleMapsSearchUrl(s.title)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    地圖
                  </a>
                  <button type="button" className="trip-action-btn" onClick={() => beginEditSpot(s)}>
                    編輯
                  </button>
                  <button type="button" className="trip-action-btn" onClick={() => handleAddSpotToItinerary(s)}>
                    加入行程
                  </button>
                  <button type="button" className="trip-action-btn" onClick={() => handleRemoveSpot(s.id)}>
                    刪除
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
