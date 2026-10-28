import { useEffect, useRef, useState } from 'react'
import { IconGear } from '../icons/Icons.jsx'
import { regionChipLabel } from '../../utils/tripFormat.js'

export function HeroHeader({ tripData, filter, onResetTrip, onFilterChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="hero">
      <div className="hero-settings-wrap" ref={menuRef}>
        <button
          type="button"
          className="hero-settings"
          aria-label="設定"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <IconGear />
        </button>
        {menuOpen ? (
          <div className="hero-settings-menu" role="menu">
            <button
              type="button"
              className="hero-settings-menu-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onResetTrip()
              }}
            >
              恢復預設
            </button>
          </div>
        ) : null}
      </div>
      <p className="hero-kicker">Kanazawa · Komatsu · 2026</p>
      <h1 className="hero-title">日本</h1>
      <nav className="region-chips" aria-label="地區篩選">
        {['all', ...tripData.map((r) => r.id)].map((id) => {
          const region = tripData.find((r) => r.id === id)
          const label = id === 'all' ? '全部' : regionChipLabel(region)
          return (
            <button
              key={id}
              type="button"
              className={filter === id ? 'chip chip--on' : 'chip'}
              onClick={() => onFilterChange(id)}
            >
              {label}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
