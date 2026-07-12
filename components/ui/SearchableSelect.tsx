'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type SearchableSelectOption = {
  value: string
  label: string
}

type SearchableSelectProps = {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  noResultsText?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  id?: string
  ariaLabel?: string
  dropUp?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  noResultsText = 'No results',
  disabled = false,
  className = '',
  style,
  id,
  ariaLabel,
  dropUp = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((option) => option.value === value)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter((option) => option.label.toLowerCase().includes(normalized))
  }, [options, query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    const active = listRef.current.children[activeIndex] as HTMLElement | undefined
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  function commit(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return

    const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        setOpen(true)
      } else if (isPrintable) {
        event.preventDefault()
        setQuery(event.key)
        setActiveIndex(0)
        setOpen(true)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Backspace') {
      event.preventDefault()
      setQuery((current) => current.slice(0, -1))
      setActiveIndex(0)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[activeIndex]
      if (option) commit(option.value)
    } else if (isPrintable) {
      event.preventDefault()
      setQuery((current) => current + event.key)
      setActiveIndex(0)
    }
  }

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
    overflow: 'hidden',
  }
  if (dropUp) {
    menuStyle.bottom = '100%'
    menuStyle.marginBottom = 4
  } else {
    menuStyle.top = 'calc(100% + 4px)'
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <div
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        tabIndex={disabled ? -1 : 0}
        className={className}
        onClick={() => !disabled && setOpen((state) => !state)}
        onKeyDown={onKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? (
            selected.label
          ) : (
            <span style={{ color: 'var(--text-dim)' }}>{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          color="#94A3B8"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </div>

      {open && (
        <div style={menuStyle}>
          {query ? (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)', borderBottom: '1px solid #E2E8F0' }}>
              Typing: {query}
            </div>
          ) : null}
          <ul
            ref={listRef}
            role="listbox"
            style={{ listStyle: 'none', margin: 0, padding: 4, maxHeight: 220, overflowY: 'auto' }}
          >
            {filtered.length === 0 ? (
              <li style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-dim)' }}>{noResultsText}</li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value
                const isActive = index === activeIndex
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(option.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: 'pointer',
                      background: isActive ? 'var(--accent-glow)' : 'transparent',
                      color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    {option.label}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
