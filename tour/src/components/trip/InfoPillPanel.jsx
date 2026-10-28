import { useRef, useState } from 'react'
import { MAX_IMAGES_PER_ALBUM } from '../../driveLinksStorage.js'
import { IconCalendarOutline, IconPencilSmall, IconTrashSmall } from '../icons/Icons.jsx'
import { AlbumImageGrid, ImageLightbox } from './AlbumImageGrid.jsx'

function DriveLinkFields({ label, setLabel, href, setHref }) {
  return (
    <>
      <label className="trip-edit-label">
        <span>名稱</span>
        <input
          className="trip-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="例：機票"
          maxLength={120}
          required
        />
      </label>
      <label className="trip-edit-label">
        <span>雲端連結（選填）</span>
        <input
          className="trip-input"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="Google Drive / 試算表網址，可留空只放圖片"
          autoComplete="off"
          inputMode="url"
        />
      </label>
    </>
  )
}

function defaultFrom(href) {
  return href.trim() ? 'Google Drive' : '本機圖片'
}

export function InfoPillPanel({
  dayImportantLinks,
  customDriveLinks,
  onAddDriveLink,
  onUpdateDriveLink,
  onRemoveDriveLink,
  onAddAlbumImages,
  onRemoveAlbumImage,
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLabel, setAddLabel] = useState('')
  const [addHref, setAddHref] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editHref, setEditHref] = useState('')
  const [lightboxSrc, setLightboxSrc] = useState('')
  const [uploadingId, setUploadingId] = useState(null)
  const fileInputRef = useRef(null)
  const pendingAlbumIdRef = useRef(null)

  function resetAddForm() {
    setAddLabel('')
    setAddHref('')
    setShowAddForm(false)
  }

  function startEdit(link) {
    setEditingId(link.id)
    setEditLabel(link.label)
    setEditHref(link.href ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditLabel('')
    setEditHref('')
  }

  function handleAddSubmit(e) {
    e.preventDefault()
    const href = addHref.trim()
    onAddDriveLink({
      label: addLabel.trim() || '未命名',
      href,
      from: defaultFrom(href),
    })
    resetAddForm()
  }

  function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingId) return
    const href = editHref.trim()
    onUpdateDriveLink(editingId, {
      label: editLabel.trim() || '未命名',
      href,
      from: defaultFrom(href),
    })
    cancelEdit()
  }

  function openFilePicker(albumId) {
    pendingAlbumIdRef.current = albumId
    fileInputRef.current?.click()
  }

  async function handleFilesSelected(e) {
    const albumId = pendingAlbumIdRef.current
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    pendingAlbumIdRef.current = null
    if (!albumId || files.length === 0) return
    setUploadingId(albumId)
    try {
      await onAddAlbumImages(albumId, files)
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <section className="info-pill-panel" aria-labelledby="overview-pill-heading">
      <div className="info-pill-panel__header">
        <IconCalendarOutline />
        <h2 className="info-pill-panel__title" id="overview-pill-heading">
          行程總覽 · 重要連結在項目內
        </h2>
      </div>
      <div className="info-pill-panel__body">
        <p className="info-pill-section-kicker">本日行程內的連結</p>
        {dayImportantLinks.length === 0 ? (
          <p className="info-pill-panel__empty info-pill-panel__empty--day">
            若項目有訂位、官網、票證等連結，會自動列在這裡。
          </p>
        ) : (
          <ul className="info-pill-link-list info-pill-link-list--day-block">
            {dayImportantLinks.map((link, idx) => (
              <li key={`${link.href}-${idx}`}>
                <a href={link.href} target="_blank" rel="noreferrer noopener">
                  {link.label}
                </a>
                <span className="info-pill-link-from">來自：{link.from}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="info-pill-drive-head">
          <p className="info-pill-section-kicker info-pill-section-kicker--secondary info-pill-section-kicker--inline">
            證件／憑證（可放圖片）
          </p>
          {!showAddForm && (
            <button
              type="button"
              className="info-pill-drive-add-btn"
              onClick={() => setShowAddForm(true)}
            >
              ＋ 新增分類
            </button>
          )}
        </div>
        <p className="album-hint">圖片存在此裝置；可另填 Google Drive 連結方便家人開啟。</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="album-file-input"
          onChange={handleFilesSelected}
        />

        <ul className="info-pill-link-list info-pill-link-list--drive">
          {customDriveLinks.links.length === 0 ? (
            <li className="info-pill-panel__empty info-pill-panel__empty--day">
              尚無分類，可點「＋ 新增分類」。
            </li>
          ) : null}
          {customDriveLinks.links.map((link) => {
            const imageIds = link.imageIds ?? []
            const atLimit = imageIds.length >= MAX_IMAGES_PER_ALBUM
            return (
              <li key={link.id} className="info-pill-drive-row info-pill-drive-row--custom">
                {editingId === link.id ? (
                  <form className="info-pill-drive-form" onSubmit={handleEditSubmit}>
                    <DriveLinkFields
                      label={editLabel}
                      setLabel={setEditLabel}
                      href={editHref}
                      setHref={setEditHref}
                    />
                    <div className="trip-edit-actions">
                      <button type="button" className="btn-ghost" onClick={cancelEdit}>
                        取消
                      </button>
                      <button type="submit" className="btn-primary">
                        儲存
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="info-pill-drive-custom">
                    <div className="info-pill-drive-custom-main">
                      {link.href ? (
                        <a href={link.href} target="_blank" rel="noreferrer noopener">
                          {link.label}
                        </a>
                      ) : (
                        <span className="album-title-text">{link.label}</span>
                      )}
                      {imageIds.length > 0 ? (
                        <span className="info-pill-link-from">{imageIds.length} 張圖</span>
                      ) : null}
                    </div>
                    <div className="info-pill-drive-actions">
                      <button
                        type="button"
                        className="info-pill-drive-add-img-btn"
                        disabled={atLimit || uploadingId === link.id}
                        onClick={() => openFilePicker(link.id)}
                      >
                        {uploadingId === link.id ? '上傳中…' : '＋ 圖片'}
                      </button>
                      <button
                        type="button"
                        className="info-pill-drive-icon-btn"
                        aria-label={`編輯「${link.label}」`}
                        onClick={() => startEdit(link)}
                      >
                        <IconPencilSmall />
                      </button>
                      <button
                        type="button"
                        className="info-pill-drive-icon-btn info-pill-drive-icon-btn--danger"
                        aria-label={`刪除「${link.label}」`}
                        onClick={() => {
                          if (window.confirm(`要刪除「${link.label}」及其圖片嗎？`)) {
                            onRemoveDriveLink(link.id)
                          }
                        }}
                      >
                        <IconTrashSmall />
                      </button>
                    </div>
                  </div>
                )}
                <AlbumImageGrid
                  imageIds={imageIds}
                  onOpen={setLightboxSrc}
                  onRemove={
                    editingId === link.id
                      ? (imageId) => onRemoveAlbumImage(link.id, imageId)
                      : undefined
                  }
                  emptyText={editingId === link.id ? undefined : null}
                />
              </li>
            )
          })}
        </ul>

        {showAddForm ? (
          <form className="info-pill-drive-form info-pill-drive-form--add" onSubmit={handleAddSubmit}>
            <DriveLinkFields
              label={addLabel}
              setLabel={setAddLabel}
              href={addHref}
              setHref={setAddHref}
            />
            <div className="trip-edit-actions">
              <button type="button" className="btn-ghost" onClick={resetAddForm}>
                取消
              </button>
              <button type="submit" className="btn-primary">
                新增
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc('')} />
    </section>
  )
}
