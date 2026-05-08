"use client"
import React from 'react'
import clsx from 'clsx'

export default function Chip({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'pass'|'fail'|'fast'|'critical'|'moderate'|'ontrack'|'neutral' }) {
  const classes = clsx('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', {
    'bg-green-50 text-green-700': variant === 'pass',
    'bg-red-50 text-red-700': variant === 'fail',
    'bg-blue-50 text-blue-700': variant === 'fast',
    'bg-red-50 text-red-700': variant === 'critical',
    'bg-amber-50 text-amber-700': variant === 'moderate',
    'bg-green-50 text-green-700': variant === 'ontrack',
    'bg-zinc-100 text-zinc-600': variant === 'neutral'
  })
  return <span className={classes}>{children}</span>
}
