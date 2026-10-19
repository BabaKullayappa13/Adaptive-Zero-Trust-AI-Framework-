/**
 * Standardized Date & Time Utility for Adaptive Zero-Trust AI Framework
 * ---------------------------------------------------------------------
 * Consistent timezone-aware display in Asia/Kolkata (IST, UTC+05:30).
 * Prevents hydration mismatches, NaN/invalid date outputs, and inconsistent representations.
 */

export const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Format timestamp into IST (e.g. "19 Oct 2026, 11:30:45 AM IST" or "19 Oct 2026, 11:30 AM")
 */
export function formatTimestampIST(
  dateInput: string | number | Date | null | undefined,
  options?: {
    includeSeconds?: boolean
    includeTimezone?: boolean
  }
): string {
  if (!dateInput) return '—'

  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return 'Invalid date'

    const includeSeconds = options?.includeSeconds ?? true
    const includeTimezone = options?.includeTimezone ?? true

    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
    }).format(d)

    return includeTimezone ? `${formatted} IST` : formatted
  } catch {
    return String(dateInput)
  }
}

/**
 * Format date only (e.g. "19 Oct 2026")
 */
export function formatDateOnlyIST(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—'

  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return '—'

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(d)
  } catch {
    return '—'
  }
}

/**
 * Format time only (e.g. "11:30:45 AM")
 */
export function formatTimeOnlyIST(
  dateInput: string | number | Date | null | undefined,
  includeSeconds = true
): string {
  if (!dateInput) return '—'

  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return '—'

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
    }).format(d)
  } catch {
    return '—'
  }
}

/**
 * Human readable relative time (e.g. "just now", "5m ago", "2h ago", "3d ago")
 */
export function formatRelativeTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—'

  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return '—'

    const now = Date.now()
    const diffMs = now - d.getTime()

    if (diffMs < 0) return 'Just now'
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return `${diffSec}s ago`

    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`

    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`

    return formatDateOnlyIST(d)
  } catch {
    return '—'
  }
}
