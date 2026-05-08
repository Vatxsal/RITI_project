import React from 'react'
import { indianNumber, formatINRShort } from '../lib/utils/format'

export default function StatCard({ title, value, accent, isMoney }: { title: string; value: number; accent?: string; isMoney?: boolean }) {
  return (
    <div className="stat-card" style={{ borderLeftColor: accent || '#0d9488' }}>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{isMoney ? formatINRShort(value) : indianNumber(value)}</div>
    </div>
  )
}
