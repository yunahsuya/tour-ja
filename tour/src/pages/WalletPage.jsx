import {
  DEFAULT_WALLET_ITEM_LABELS,
  removeWalletItemLabel,
  sumAll,
} from '../walletStorage.js'
import { WALLET_PAYERS } from '../constants/appConstants.js'
import {
  FX_LABELS,
  FX_LAST_UPDATED,
  WALLET_FX_CODES,
  formatRateLine,
  parseAmountInput,
} from '../fxRates.js'
import {
  formatWalletDateLine,
  formatWalletEntryDisplay,
  formatWalletPayerDetailRow,
} from '../utils/walletFormat.js'
import { downloadWalletCsv, downloadWalletPng } from '../utils/walletExport.js'

export function WalletPage({
  current,
  wallet,
  walletMode,
  setWalletMode,
  dayEntries,
  dayWalletTotal,
  walletSummarySub,
  fxConvCode,
  handleFxCodeChange,
  fxConvForeign,
  handleFxForeignInput,
  fxConvTwd,
  handleFxTwdInput,
  handleAddWallet,
  walletItemComboRef,
  walletItemMenuOpen,
  setWalletItemMenuOpen,
  walletNote,
  walletItemNewDraft,
  setWalletItemNewDraft,
  commitNewLabelFromMenu,
  walletAmount,
  setWalletAmount,
  walletFee,
  setWalletFee,
  walletCurrency,
  setWalletCurrency,
  walletPaidBy,
  setWalletPaidBy,
  walletFormTwdPreview,
  handleRemoveWalletEntry,
  editingWalletEntryId,
  walletDayOptions,
  editWalletDayId,
  setEditWalletDayId,
  editWalletNote,
  setEditWalletNote,
  editWalletAmount,
  setEditWalletAmount,
  editWalletFee,
  setEditWalletFee,
  editWalletCurrency,
  setEditWalletCurrency,
  editWalletPaidBy,
  setEditWalletPaidBy,
  editWalletFormTwdPreview,
  beginEditWalletEntry,
  cancelEditWalletEntry,
  handleSaveWalletEdit,
  walletBreakdown,
  walletPayerBreakdown,
  walletPayerTab,
  setWalletPayerTab,
  walletPayerEntries,
  walletPayerTabTotal,
  dayLabelById,
  setWallet,
  setWalletNote,
  persistWallet,
}) {
  function renderEditableWalletEntry(entry, dayId, displayText, itemClassName = 'wallet-list-item') {
    if (editingWalletEntryId === entry.id) {
      return (
        <li key={entry.id} className={itemClassName}>
          <form className="wallet-list-edit" onSubmit={handleSaveWalletEdit}>
            <label className="wallet-form-label" htmlFor={`wallet-edit-day-${entry.id}`}>
              日期
            </label>
            <select
              id={`wallet-edit-day-${entry.id}`}
              className="wallet-fx-select wallet-fx-select--full"
              value={editWalletDayId}
              onChange={(ev) => setEditWalletDayId(ev.target.value)}
              aria-label="支出日期"
              required
            >
              {walletDayOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <label className="wallet-form-label" htmlFor={`wallet-edit-note-${entry.id}`}>
              項目
            </label>
            <input
              id={`wallet-edit-note-${entry.id}`}
              className="trip-input"
              list={`wallet-edit-notes-${entry.id}`}
              value={editWalletNote}
              onChange={(ev) => setEditWalletNote(ev.target.value)}
              placeholder="支出項目"
              autoFocus
              required
            />
            <datalist id={`wallet-edit-notes-${entry.id}`}>
              {(wallet.itemLabels ?? []).map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
            <label className="wallet-form-label" htmlFor={`wallet-edit-amt-${entry.id}`}>
              金額
            </label>
            <div className="wallet-form-amount-row">
              <select
                className="wallet-fx-select wallet-fx-select--form"
                value={editWalletCurrency}
                onChange={(ev) => setEditWalletCurrency(ev.target.value)}
                aria-label="記帳幣別"
              >
                <option value="TWD">台幣（TWD）</option>
                {WALLET_FX_CODES.map((c) => (
                  <option key={c} value={c}>
                    {FX_LABELS[c]?.zh}（{c}）{FX_LABELS[c]?.sym ?? ''}
                  </option>
                ))}
              </select>
              <input
                id={`wallet-edit-amt-${entry.id}`}
                className="trip-input wallet-form-amt-input"
                inputMode="decimal"
                placeholder={editWalletCurrency === 'TWD' ? '台幣金額' : '外幣金額'}
                value={editWalletAmount}
                onChange={(ev) => setEditWalletAmount(ev.target.value)}
                required
              />
            </div>
            {editWalletCurrency !== 'TWD' && Number.isFinite(editWalletFormTwdPreview) ? (
              <p className="wallet-form-preview">
                ≈ NT$ {editWalletFormTwdPreview.toLocaleString('zh-TW')}（依參考匯率）
              </p>
            ) : null}
            <label className="wallet-form-label" htmlFor={`wallet-edit-fee-${entry.id}`}>
              手續費
            </label>
            <input
              id={`wallet-edit-fee-${entry.id}`}
              className="trip-input"
              inputMode="decimal"
              placeholder="選填，台幣"
              value={editWalletFee}
              onChange={(ev) => setEditWalletFee(ev.target.value)}
              aria-label="手續費（台幣）"
            />
            <label className="wallet-form-label" htmlFor={`wallet-edit-paid-${entry.id}`}>
              誰付錢
            </label>
            <select
              id={`wallet-edit-paid-${entry.id}`}
              className="wallet-fx-select wallet-fx-select--full"
              value={editWalletPaidBy}
              onChange={(ev) => setEditWalletPaidBy(ev.target.value)}
              aria-label="誰付錢"
            >
              {WALLET_PAYERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <div className="trip-edit-actions">
              <button type="button" className="btn-ghost" onClick={cancelEditWalletEntry}>
                取消
              </button>
              <button type="submit" className="btn-primary">
                儲存
              </button>
            </div>
          </form>
        </li>
      )
    }

    return (
      <li key={entry.id} className={itemClassName}>
        <span className={itemClassName === 'wallet-payer-detail-item' ? 'wallet-payer-detail-text' : undefined}>
          {displayText}
        </span>
        <div className="wallet-list-actions">
          <button
            type="button"
            className="wallet-edit"
            onClick={() => beginEditWalletEntry(entry, dayId)}
          >
            編輯
          </button>
          <button
            type="button"
            className="wallet-remove"
            onClick={() => handleRemoveWalletEntry(entry.id, dayId)}
          >
            刪除
          </button>
        </div>
      </li>
    )
  }

  if (!current) {
    return <p className="panel-empty">目前沒有行程日可顯示。</p>
  }
  return (
    <section className="panel-wallet" aria-label="記帳">
      <div className="segment">
        <button
          type="button"
          className={walletMode === 'daily' ? 'segment-btn segment-btn--on' : 'segment-btn'}
          onClick={() => setWalletMode('daily')}
        >
          每日 Daily
        </button>
        <button
          type="button"
          className={walletMode === 'total' ? 'segment-btn segment-btn--on' : 'segment-btn'}
          onClick={() => setWalletMode('total')}
        >
          累積 Total
        </button>
      </div>

      {walletMode === 'daily' ? (
        <>
          <div className="wallet-card wallet-card--summary">
            <p className="wallet-card-kicker">Today</p>
            <p className="wallet-card-line-title">
              本日支出 <span className="wallet-card-date-part">{formatWalletDateLine(current.day)}</span>
            </p>
            <p className="wallet-card-total">
              NT$ <strong>{dayWalletTotal.toLocaleString('zh-TW')}</strong>
            </p>
            <p className="wallet-card-subline">{walletSummarySub}</p>
            <span className="wallet-card-deco" aria-hidden>
              {'\u20AC'}
            </span>
          </div>

          <div className="wallet-fx-block">
            <h3 className="wallet-fx-heading">
              匯率換算
              <span className="wallet-fx-heading-sub">（幣別 → 台幣）</span>
            </h3>
            <div className="wallet-fx-top">
              <div className="wallet-fx-top-col">
                <span className="wallet-fx-col-title">外幣</span>
                <select
                  className="wallet-fx-select"
                  value={fxConvCode}
                  onChange={handleFxCodeChange}
                  aria-label="外幣幣別"
                >
                  {WALLET_FX_CODES.map((c) => (
                    <option key={c} value={c}>
                      {FX_LABELS[c]?.zh}（{c}）{FX_LABELS[c]?.sym ?? ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="wallet-fx-top-col">
                <span className="wallet-fx-col-title">台幣（TWD）</span>
                <div className="wallet-fx-select-mirror" aria-hidden="true" />
              </div>
            </div>
            <div className="wallet-fx-input-row">
              <input
                className="wallet-fx-input"
                inputMode="decimal"
                value={fxConvForeign}
                onChange={handleFxForeignInput}
                placeholder="外幣金額"
                aria-label="外幣金額"
              />
              <div className="wallet-fx-arrow-wrap" aria-hidden="true">
                <span className="wallet-fx-arrow">→</span>
              </div>
              <input
                className="wallet-fx-input"
                inputMode="numeric"
                value={fxConvTwd}
                onChange={handleFxTwdInput}
                placeholder="台幣金額"
                aria-label="台幣金額"
              />
            </div>
            <p className="wallet-fx-meta">
              {formatRateLine(fxConvCode)} · 更新於 {FX_LAST_UPDATED}
            </p>
            <button
              type="button"
              className="wallet-fx-apply"
              onClick={() => {
                setWalletCurrency(fxConvCode)
                setWalletAmount(fxConvForeign)
              }}
              disabled={!Number.isFinite(parseAmountInput(fxConvForeign))}
            >
              套用至下方新增金額
            </button>
          </div>

          <form className="wallet-form wallet-form--boxed" onSubmit={handleAddWallet}>
            <div className="wallet-item-combo" ref={walletItemComboRef}>
              <label className="wallet-form-label" id="wallet-item-label">
                項目
              </label>
              <button
                type="button"
                className="wallet-item-combo-trigger wallet-fx-select wallet-fx-select--full"
                aria-haspopup="listbox"
                aria-expanded={walletItemMenuOpen}
                aria-labelledby="wallet-item-label"
                onClick={() => setWalletItemMenuOpen((o) => !o)}
              >
                <span className={walletNote ? 'wallet-item-combo-value' : 'wallet-item-combo-placeholder'}>
                  {walletNote || '請選擇項目'}
                </span>
                <span className="wallet-item-combo-chevron" aria-hidden>
                  ▾
                </span>
              </button>
              {walletItemMenuOpen ? (
                <div className="wallet-item-combo-panel" role="listbox" aria-label="支出項目選單">
                  {(wallet.itemLabels ?? []).map((label) => {
                    const isBuiltin = DEFAULT_WALLET_ITEM_LABELS.includes(label)
                    return (
                      <div key={label} className="wallet-item-combo-row">
                        <button
                          type="button"
                          className="wallet-item-combo-option"
                          role="option"
                          aria-selected={walletNote === label}
                          onClick={() => {
                            setWalletNote(label)
                            setWalletItemMenuOpen(false)
                          }}
                        >
                          {label}
                        </button>
                        {!isBuiltin ? (
                          <button
                            type="button"
                            className="wallet-item-combo-remove"
                            aria-label={`從選單刪除「${label}」`}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (
                                !window.confirm(
                                  `要從選單移除「${label}」嗎？已記帳的紀錄不會刪除，僅不再出現在下拉選單。`,
                                )
                              )
                                return
                              const next = removeWalletItemLabel(wallet, label)
                              persistWallet(next)
                              if (walletNote === label) setWalletNote('')
                            }}
                          >
                            刪除
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                  <div className="wallet-item-combo-add" onPointerDown={(e) => e.stopPropagation()}>
                    <input
                      className="wallet-item-combo-add-input trip-input"
                      placeholder="在此輸入新項目"
                      value={walletItemNewDraft}
                      onChange={(e) => setWalletItemNewDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          commitNewLabelFromMenu()
                        }
                      }}
                      autoComplete="off"
                      aria-label="新增項目名稱"
                    />
                    <button
                      type="button"
                      className="wallet-item-combo-add-btn"
                      onClick={commitNewLabelFromMenu}
                      disabled={!walletItemNewDraft.trim()}
                    >
                      加入選單
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <label className="wallet-form-label" htmlFor="wallet-amt">
              金額
            </label>
            <div className="wallet-form-amount-row">
              <select
                className="wallet-fx-select wallet-fx-select--form"
                value={walletCurrency}
                onChange={(e) => setWalletCurrency(e.target.value)}
                aria-label="記帳幣別"
              >
                <option value="TWD">台幣（TWD）</option>
                {WALLET_FX_CODES.map((c) => (
                  <option key={c} value={c}>
                    {FX_LABELS[c]?.zh}（{c}）{FX_LABELS[c]?.sym ?? ''}
                  </option>
                ))}
              </select>
              <input
                id="wallet-amt"
                className="trip-input wallet-form-amt-input"
                inputMode="decimal"
                placeholder={walletCurrency === 'TWD' ? '台幣金額' : '外幣金額'}
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
              />
            </div>
            {walletCurrency !== 'TWD' && Number.isFinite(walletFormTwdPreview) ? (
              <p className="wallet-form-preview">
                ≈ NT$ {walletFormTwdPreview.toLocaleString('zh-TW')}（依上方參考匯率）
              </p>
            ) : null}
            <label className="wallet-form-label" htmlFor="wallet-fee">
              手續費
            </label>
            <input
              id="wallet-fee"
              className="trip-input"
              inputMode="decimal"
              placeholder="選填，台幣"
              value={walletFee}
              onChange={(e) => setWalletFee(e.target.value)}
              aria-label="手續費（台幣）"
            />
            <label className="wallet-form-label" htmlFor="wallet-paid-by">
              誰付錢
            </label>
            <select
              id="wallet-paid-by"
              className="wallet-fx-select wallet-fx-select--full"
              value={walletPaidBy}
              onChange={(e) => setWalletPaidBy(e.target.value)}
              aria-label="誰付錢"
            >
              {WALLET_PAYERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button type="submit" className="wallet-add-primary">
              ＋ 新增支出
            </button>
          </form>

          <ul className="wallet-list">
            {dayEntries.map((e) =>
              renderEditableWalletEntry(e, current.day.id, formatWalletEntryDisplay(e)),
            )}
          </ul>
        </>
      ) : (
        <div className="wallet-card wallet-card--summary wallet-card--wide">
          <p className="wallet-card-kicker">Total</p>
          <p className="wallet-card-line-title">整趟旅程累積</p>
          <p className="wallet-card-total">
            NT$ <strong>{sumAll(wallet).toLocaleString('zh-TW')}</strong>
          </p>
          <p className="wallet-card-subline">各日台幣加總 · 外幣已換算為台幣</p>
          {walletBreakdown.length > 0 ? (
            <div className="wallet-export-bar" aria-label="匯出記帳資料">
              <button
                type="button"
                className="wallet-export-btn"
                onClick={() => downloadWalletCsv(wallet, dayLabelById)}
              >
                匯出 CSV
              </button>
              <button
                type="button"
                className="wallet-export-btn"
                onClick={() =>
                  downloadWalletPng({
                    wallet,
                    dayLabelById,
                    walletBreakdown,
                    walletPayerBreakdown,
                  })
                }
              >
                匯出 PNG
              </button>
            </div>
          ) : null}
          {walletBreakdown.length === 0 ? (
            <p className="wallet-empty">尚無紀錄，切到「每日」新增支出。</p>
          ) : (
            <>
              <ul className="wallet-breakdown">
                {walletBreakdown.map((row) => (
                  <li key={row.id}>
                    <span>{row.label}</span>
                    <span>NT$ {row.total.toLocaleString('zh-TW')}</span>
                  </li>
                ))}
              </ul>
              {walletPayerBreakdown.length > 0 ? (
                <>
                  <p className="wallet-breakdown-kicker">依付款人（誰付錢）</p>
                  <ul className="wallet-breakdown wallet-breakdown--payers">
                    {walletPayerBreakdown.map(([payer, total]) => (
                      <li key={payer}>
                        <span>{payer}</span>
                        <span>NT$ {total.toLocaleString('zh-TW')}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="wallet-payer-detail" aria-label="付款人支出細項">
                    <p className="wallet-breakdown-kicker wallet-breakdown-kicker--detail">
                      支出細項
                    </p>
                    <div className="wallet-payer-tabs" role="tablist" aria-label="切換付款人">
                      {WALLET_PAYERS.map((name) => (
                        <button
                          key={name}
                          type="button"
                          role="tab"
                          aria-selected={walletPayerTab === name}
                          className={
                            walletPayerTab === name
                              ? 'wallet-payer-tab wallet-payer-tab--on'
                              : 'wallet-payer-tab'
                          }
                          onClick={() => setWalletPayerTab(name)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                    <p className="wallet-payer-detail-total">
                      {walletPayerTab} 合計{' '}
                      <strong>NT$ {walletPayerTabTotal.toLocaleString('zh-TW')}</strong>
                    </p>
                    {walletPayerEntries.length === 0 ? (
                      <p className="wallet-empty wallet-empty--inline">
                        {walletPayerTab} 尚無支出紀錄。
                      </p>
                    ) : (
                      <ul className="wallet-payer-detail-list">
                        {walletPayerEntries.map(({ dayId, dayLabel, entry }) =>
                          renderEditableWalletEntry(
                            entry,
                            dayId,
                            formatWalletPayerDetailRow(dayLabel, entry),
                            'wallet-payer-detail-item wallet-list-item',
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </section>
  )
}
