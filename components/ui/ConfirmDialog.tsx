'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  tone?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'danger',
}: ConfirmDialogProps) {
  if (!open) return null

  const palette =
    tone === 'danger'
      ? { border: '#FECACA', background: '#FEF2F2', button: '#DC2626', buttonText: '#fff' }
      : tone === 'warning'
        ? { border: '#FDE68A', background: '#FFFBEB', button: '#D97706', buttonText: '#fff' }
        : { border: '#D8E4F2', background: '#F8FBFF', button: '#3B82F6', buttonText: '#fff' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)' }}>
      <div style={{ width: 'min(420px, calc(100vw - 32px))', background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 20, padding: 22, boxShadow: '0 24px 60px rgba(15,23,42,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: palette.background, color: palette.button, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{title}</div>
          </div>
          <button type="button" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, marginBottom: 20 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{ padding: '8px 14px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} style={{ padding: '8px 14px', borderRadius: 12, border: 'none', background: palette.button, color: palette.buttonText, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
